import { dispatch } from '../state/dispatch'
import { addActionPlanMessage, addUserMessage } from '../state/chat/reducer'
import { DefaultMessageContent } from '../state/chat/types'
import { LLMResponse } from '../helpers/LLM/types'
import { updateCredits } from '../state/billing/reducer'

export default {
  addUserMessage({ content }: { content: DefaultMessageContent }) { 
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

