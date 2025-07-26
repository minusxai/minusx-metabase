
import { planActions, researchMode } from '../helpers/LLM';
import _ from 'lodash';
import { getState } from '../state/store';
import chat from '../chat/chat';
import { getLLMContextFromState } from './utils';
import { AppState, SimplePlannerConfig } from 'apps/types';
import { getApp } from '../helpers/app';

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