import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addUserMessage } from '../state/chat/reducer'
import { DefaultMessageContent, LuckyMessageContent } from '../state/chat/types'
import { LLMResponse } from '../helpers/LLM/types'
import { removeOneCreditOnLlmCall } from '../state/billing/reducer'
export const CHAT_USER_ACTION = "CHAT_USER_ACTION"

export default {
  addUserMessage({ content }: { content: DefaultMessageContent | LuckyMessageContent }) { 
    dispatch(
      addUserMessage({
        content
      })
    )
    // eager update of user credits. this is just a display value so not worried about its accuracy
    dispatch(removeOneCreditOnLlmCall())
  },
  addErrorMessage(err: string) {
    // TODO(@sreejith): implement this
    return
  },
  addActionPlanFromLlmResponse(llmResponse: LLMResponse, debug: any) {
    dispatch(addActionPlanMessage({llmResponse, debug}))
  },
}

