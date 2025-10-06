import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addActionPlanMessageV2, addUserMessage, startNewThread } from '../state/chat/reducer'
import { DefaultMessageContent } from '../state/chat/types'
import { LLMResponse, LLMResponseV2 } from '../helpers/LLM/types'
import { updateCredits } from '../state/billing/reducer'
import { getState } from '../state/store'
import { toast } from '../app/toast'


const HRS_THRESHOLD = 1; 

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
  },
  addActionPlanFromLlmResponse(llmResponse: LLMResponse, debug: any) {
    dispatch(addActionPlanMessage({llmResponse, debug}))
    // update credits. not sure if this is the best place to do this
    dispatch(updateCredits(llmResponse.credits))
  },
  addActionPlanFromLlmResponseV2(llmResponseV2: LLMResponseV2, debug: any) {
    dispatch(addActionPlanMessageV2({llmResponseV2, debug}))
    // update credits
    dispatch(updateCredits(llmResponseV2.credits))
  },
  async createNewThreadIfNeeded() {
    const state = getState()
    // if on an old thread, create a new one
    if (state.chat.activeThread && state.chat.activeThread < state.chat.threads.length - 1) {
      dispatch(startNewThread())
    }
    // if it has been a while since the last message, create a new thread
    if (state.chat.threads.length > 0 && state.chat.threads[state.chat.activeThread].messages.length > 0) {
        const messages = state.chat.threads[state.chat.activeThread].messages;
        const lastMessageTime = messages[messages.length - 1].createdAt;
        const now = Date.now();
        const hrsSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
        if (hrsSinceLastMessage > HRS_THRESHOLD) {
          dispatch(startNewThread())
        }
    }
  }
}
