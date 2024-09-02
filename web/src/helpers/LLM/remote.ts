import { ToolCalls } from '../../state/chat/reducer'
import { LLMResponse } from './types'
import { PlanActionsParams } from '.'
import { getLLMResponse } from '../../app/api'
import { getApp } from '../app'
export async function planActionsRemote({
  messages,
  actions,
  llmSettings,
  signal,
}: PlanActionsParams): Promise<LLMResponse> {
  const payload = {
    messages,
    actions,
    llmSettings,
  }
  const response = await getLLMResponse(payload, signal)
  // throw error if aborted
  signal.throwIfAborted();

  const jsonResponse = await response.data
  if (jsonResponse.error) {
    throw new Error(jsonResponse.error)
  }
  return { tool_calls: jsonResponse.tool_calls as ToolCalls, finish_reason: jsonResponse.finish_reason, content: jsonResponse.content }
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
