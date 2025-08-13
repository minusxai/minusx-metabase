import { ToolCalls } from '../../state/chat/reducer'
import { LLMResponse } from './types'
import { PlanActionsParams } from '.'
import { getLLMResponse } from '../../app/api'
import { getApp } from '../app'
import { getState } from '../../state/store'
import { unset } from 'lodash'
import { processAllMetadata } from '../metadataProcessor'

export async function planActionsRemote({
  messages,
  actions,
  llmSettings,
  signal,
  deepResearch,
  tasks,
  conversationID,
  meta,
  isPrewarm
}: PlanActionsParams): Promise<LLMResponse> {
  const payload = {
    messages,
    actions,
    llmSettings,
    tasks,
    conversationID,
    meta,
    isPrewarm
  }
  if (!deepResearch) {
    unset(payload, 'tasks')
  }

  const getAllMetadataPromise = processAllMetadata()

  // Add metadata hashes for analyst mode (when both drMode and analystMode are enabled)
  if (deepResearch !== 'simple') {
    // Get current state once
    const currentState = getState();
    
    // Check if analyst mode is enabled
    if (currentState.settings.drMode && currentState.settings.analystMode) {
      try {
        const { cardsHash, dbSchemaHash, fieldsHash, modelFieldsHash } = await getAllMetadataPromise;
        // @ts-ignore
        payload.cardsHash = cardsHash;
        // @ts-ignore
        payload.dbSchemaHash = dbSchemaHash;
        // @ts-ignore
        payload.fieldsHash = fieldsHash;
        // @ts-ignore
        payload.modelFieldsHash = modelFieldsHash;
        console.log('[minusx] Added metadata hashes to request for analyst mode');
      } catch (error) {
        console.warn('[minusx] Failed to fetch metadata for analyst mode:', error);
        // Continue without metadata rather than failing the request
      }
    }
    
    // Add selected asset_slug if available
    const selectedAssetId = currentState.settings.selectedAssetId;
    if (selectedAssetId) {
      // @ts-ignore
      payload.asset_slug = selectedAssetId;
      console.log('[minusx] Added asset_slug to request for enhanced context:', selectedAssetId);
    }
  }

  //@ts-ignore
  const response = await getLLMResponse(payload, signal, deepResearch)
  // throw error if aborted
  signal.throwIfAborted();

  const jsonResponse = await response.data
  if (jsonResponse.error) {
    throw new Error(jsonResponse.error)
  }
  return { tool_calls: jsonResponse.tool_calls as ToolCalls, finish_reason: jsonResponse.finish_reason, content: jsonResponse.content, credits: jsonResponse.credits, tasks: jsonResponse.tasks }
}

export const getSuggestions = async(): Promise<string[]> => {
  const app = getApp()
  const plannerConfig = await app.getSuggestionsConfig()
  // #Hack to bypass cot suggestions
  if (plannerConfig.type === "cot") {
    return []
  }
  const appState = app.getState()
  const systemMessage = plannerConfig.systemPrompt.replaceAll("{{ state }}", JSON.stringify(appState))
  const userMessage = " "
  const response = await getLLMResponse({
    messages: [{
      role: "system",
      content: systemMessage,
    }, {
      role: "user",
      content: userMessage,
    }],
    llmSettings: plannerConfig.llmSettings,
    actions: plannerConfig.actionDescriptions
  });
  // fk ts
  const jsonResponse = await response.data;
  const parsed: any = JSON.parse(jsonResponse.content);
  return parsed.prompts;
}

export const getMetaPlan = async(text: string, steps: string[], messageHistory: string): Promise<string[]> => {
  const app = getApp()
  
  const llmSettings = {
    model: "gpt-4.1",
    temperature: 0,
    response_format: {
      type: "json_object",
    },
    tool_choice: "none",
  }
  //ToDo vivek: move all this to apps, as a new prompt config (part of llm config)
  const systemMessage = `
  You are an incredible data scientist, and proficient at using jupyter notebooks. 
  You take the jupyter state and give a list of steps to perform to explore and analyze data.
  The steps will be taken by another agent and performed one by one. So give detailed steps.

  <JupyterAppState>
  {{ state }}
  </JupyterAppState>

  <CurrentPendingSteps>
  {{ steps }}
  </CurrentPendingSteps>

  <MessageHistory>
  {{ messageHistory }}
  </MessageHistory>

  - First, read the state of the notebook to figure out what data is being operated on
  - Then, use the JupyterAppState and the user's message to determine the goal of the user.
  - Then, give a detailed list of steps to reach the user's goal. Limit to under 7 steps always.
  - If current pending steps are sufficient, you can return an empty list for steps.
  - If you think that the current pending steps need to be adjusted, you can return a new list of steps.
  - There should always be a summary step at the end, with some actionable insights.
  - The output should be JSON formatted.
  
  Sample outputs:
  If the dataframe has columns called prompt tokens, completion tokens, latency, and date, and if the user message is "I want to understand how tokens affect latency" the output could be:
  {"steps":  ["Plot the distribution of tokens",  "Plot the distribution of latency", "Plot the scatter plot of tokens vs latency", "Calculate the correlation between tokens and latency", "Plot the correlation between tokens and latency", "Perform a regression analysis on how the prompt and completion tokens affect latency", "Plot the 3d scatter plot and regression plane", "Summarize the results"]}

  If current steps are sufficient, return an empty list.
  { "steps": [] }

  If current steps are not sufficient, return a new list of steps.
  {"steps":  ["Plot the 3d & 2d scatter plot and regression plane", "Summarize the results"]}
  `
  const userMessage = text

  const appState = app.getState()
  const finalSystemMessage = systemMessage.replaceAll("{{ state }}", JSON.stringify(appState)).replaceAll("{{ steps }}", JSON.stringify(steps)).replaceAll("{{ messageHistory }}", messageHistory)

  const response = await getLLMResponse({
    messages: [{
      role: "system",
      content: finalSystemMessage,
    }, {
      role: "user",
      content: userMessage,
    }],
    llmSettings: llmSettings,
    actions: []
  });
  const jsonResponse = await response.data;
  const parsed: any = JSON.parse(jsonResponse.content);
  
  return parsed.steps;
}

export const convertToMarkdown = async(appState, imgs): Promise<string[]> => {
  console.log('Converting', appState, imgs)
  const llmSettings = {
    model: "gpt-4.1",
    temperature: 0,
    response_format: {
      type: "text",
    },
    tool_choice: "none",
  }

  const systemMessage = `
  You are an incredible data scientist, and proficient at using jupyter notebooks. 
  The user gives you a jupyter state and you must convert it into a markdown document.
  Just give a report as a markdown document based on the notebook
  Don't print any actual code
  `
  const userMessage = JSON.stringify(appState)

  const response = await getLLMResponse({
    messages: [{
      role: "system",
      content: systemMessage,
    }, {
      role: "user",
      content: userMessage,
    }],
    llmSettings: llmSettings,
    actions: []
  });
  let data = await response.data
  let content = data.content
  content += imgs.map((img, index) => {
    if (img.startsWith("data:image")) {
      return `![Image ${index}](${img})`
    } else {
      return ""
    }
  }).filter(i => i).join("\n")
  return content
}

