import { planActionsOpenAI } from "./OpenAI";
import { getState } from '../../state/store'
import { planActionsRemote } from "./remote";
import { ToolCalls } from "../../state/chat/reducer";
import { LLMContext, LLMResponse, LLMSettings, Prediction} from "./types";
export type PlanActionsParams = {
  messages: LLMContext,
  actions: any,
  llmSettings: LLMSettings,
  signal: AbortSignal,
  prediction?: Prediction
}
export async function planActions(params: PlanActionsParams ) : Promise<LLMResponse> { 
  const { isLocal } = getState().settings
  console.log('Message & Actions are', params.messages, params.actions, isLocal)
  if (isLocal) {
    return planActionsOpenAI(params)
  }
  return planActionsRemote(params)
}
