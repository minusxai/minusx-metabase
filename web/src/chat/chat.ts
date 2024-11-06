import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addUserMessage } from '../state/chat/reducer'
import { DefaultMessageContent } from '../state/chat/types'
import { LLMResponse } from '../helpers/LLM/types'
import { updateCredits } from '../state/billing/reducer'
import { getApp } from '../helpers/app'
import { AppState } from 'apps/types'
import { getState } from '../state/store'

export default {
  async addUserMessage({ content }: { content: DefaultMessageContent }) { 
    const app = getApp()
    const appState = await app.getState() as AppState
    const messageId = getState().chat.activeThread
    app.setCachedState(messageId, appState)
    dispatch(
      addUserMessage({
        content,
        debug: {}
      })
    )
  },
  addErrorMessage(err: string) {
    // TODO(@sreejith): implement this
    return
  },
  addActionPlanFromLlmResponse(llmResponse: LLMResponse, debug: any) {
    dispatch(addActionPlanMessage({llmResponse, debug}))
    // update credits. not sure if this is the best place to do this
    dispatch(updateCredits(llmResponse.credits))
  },
}

