import { dispatch } from "../state/dispatch"
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import { toggleClarification, ClarificationQuestion, ClarificationAnswer } from "../state/chat/reducer"

export async function clarify({questions}: {questions: ClarificationQuestion[]}): Promise<ClarificationAnswer[]> {
  const state = getState()
  const thread = state.chat.activeThread
  
  // Show clarification modal with questions
  dispatch(toggleClarification({show: true, questions}))
  
  // Poll for completion
  while (true) {
    const currentState = getState()
    const clarification = currentState.chat.threads[thread].clarification
    
    if (clarification.show && clarification.isCompleted) {
      // Hide clarification modal and return answers
      dispatch(toggleClarification({show: false, questions: []}))
      return clarification.answers
    }
    
    await sleep(100)
  }
}