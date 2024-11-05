
import { planActions } from '../helpers/LLM';
import _ from 'lodash';
import { getState } from '../state/store';
import chat from '../chat/chat';
import { getLLMContextFromState } from './utils';
import { AppState, SimplePlannerConfig } from 'apps/types';
import { getApp } from '../helpers/app';

export async function simplePlan(signal: AbortSignal, plannerConfig: SimplePlannerConfig) {
  // get messages and last message
  const startTime = Date.now()
  const state = getState()
  const thread = state.chat.activeThread
  const activeThread = state.chat.threads[thread]
  const messageHistory = activeThread.messages;
  const prompts = {
    system: plannerConfig.systemPrompt,
    user: plannerConfig.userPrompt,
  }
  const appState = await getApp().getState() as AppState
  const currentAppState = appState
  const actionDescriptions = plannerConfig.actionDescriptions
  const messages = getLLMContextFromState(prompts, appState, currentAppState, messageHistory)
  const llmResponse = await planActions({
    messages,
    actions: actionDescriptions,
    llmSettings: plannerConfig.llmSettings,
    signal
  });
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