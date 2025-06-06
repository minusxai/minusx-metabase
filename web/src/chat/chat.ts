import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addUserMessage } from '../state/chat/reducer'
import { DefaultMessageContent } from '../state/chat/types'
import { LLMResponse } from '../helpers/LLM/types'
import { updateCredits } from '../state/billing/reducer'
import { getApp } from '../helpers/app'
import { AppState } from 'apps/types'
import { getState } from '../state/store'
import { toast } from '../app/toast'

export default {
  async addUserMessage({ content }: { content: DefaultMessageContent }) {
    const state = getState()
    if (!state.auth.is_authenticated) {
      toast({
        title: 'Log in to start using this feature!',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'bottom-right',
      })
      return
    }
    
    dispatch(
      addUserMessage({
        content,
        debug: {}
      })
    )
    const app = getApp()
    const appState = await app.getState() as AppState
    const messageId = state.chat.activeThread
    app.setCachedState(messageId, appState)
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

