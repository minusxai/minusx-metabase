import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addUserMessage } from '../state/chat/reducer'
import { DefaultMessageContent, LuckyMessageContent } from '../state/chat/types'
import { LLMResponse } from '../helpers/LLM/types'
export const CHAT_USER_ACTION = "CHAT_USER_ACTION"

export default {
  addUserMessage({ content }: { content: DefaultMessageContent | LuckyMessageContent }) { 
    dispatch(
      addUserMessage({
        content
      })
    )
  },
  addErrorMessage(err: string) {
    // TODO(@sreejith): implement this
    return
  },
  addActionPlanFromLlmResponse(llmResponse: LLMResponse, debug: any) {
    dispatch(addActionPlanMessage({llmResponse, debug}))
  },
}

