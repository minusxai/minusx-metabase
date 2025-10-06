
import { planActions, researchMode } from '../helpers/LLM';
import _ from 'lodash';
import { getState } from '../state/store';
import chat from '../chat/chat';
import { getLLMContextFromState } from './utils';
import { AppState, SimplePlannerConfig } from 'apps/types';
import { getApp } from '../helpers/app';
import { planActionsRemoteV2 } from '../helpers/LLM/remote';

const app = getApp()

export async function simplePlan(signal: AbortSignal, plannerConfig: SimplePlannerConfig, isPrewarm: boolean = false) {
  // get messages and last message
  const startTime = Date.now()
  const state = getState()
  const thread = state.chat.activeThread
  const activeThread = state.chat.threads[thread]
  const messageHistory = activeThread.messages;
  const tasks = activeThread.tasks;
  const conversationID = activeThread.id;
  const deepResearch = state.settings.drMode ? 'deepResearchPlanner' : 'simple' as researchMode

  // Check if we should use V2 API
  const useV2Api = state.settings.useV2API && deepResearch === 'deepResearchPlanner'

  if (useV2Api) {
    // Use V2 API
    const prompts = {
      system: plannerConfig.systemPrompt,
      user: plannerConfig.userPrompt,
    }
    const currentAppState = await app.getState() as AppState
    const { context: messages, meta } = getLLMContextFromState(prompts, currentAppState, currentAppState, messageHistory)

    // Extract the rendered user message from the context
    // The context has system message first, then the rendered messages
    // We need to find the last user message in the context
    const lastUserMessageInContext = messages.findLast((msg) => msg.role === 'user')
    const renderedUserMessage = typeof lastUserMessageInContext?.content === 'string'
      ? lastUserMessageInContext.content
      : ''

    const llmResponseV2 = await planActionsRemoteV2({
      signal,
      conversationID,
      meta,
      user_message: renderedUserMessage
    })

    const endTime = Date.now()
    const debugContent = { latency: endTime - startTime }
    chat.addActionPlanFromLlmResponseV2(llmResponseV2, debugContent)
  } else {
    // Use V1 API
    const prompts = {
      system: plannerConfig.systemPrompt,
      user: plannerConfig.userPrompt,
    }
    const currentAppState = await app.getState() as AppState
    const actionDescriptions = plannerConfig.actionDescriptions
    const { context: messages, meta } = getLLMContextFromState(prompts, currentAppState, currentAppState, messageHistory)
    const llmResponse = await planActions({
      messages,
      actions: actionDescriptions,
      llmSettings: plannerConfig.llmSettings,
      signal,
      deepResearch,
      tasks,
      conversationID,
      meta,
      isPrewarm // Pass the prewarm flag through to planActions
    });

    if (isPrewarm) {
      // For prewarm mode, just return early (last_warmed_on updated in TaskUI)
      return;
    }

    const endTime = Date.now()
    let debugContent = {latency: endTime - startTime}
    //ToDo @Vivek: This is not relevant anymore. But we can add more debug info from the litellm response
    // like tokens, cost, scores? etc.
    // if (configs.IS_DEV) {
    //   debugContent = {
    //     ...debugContent,
    //     state: appState,
    //   }
    // }
    chat.addActionPlanFromLlmResponse(llmResponse, debugContent)
  }
}