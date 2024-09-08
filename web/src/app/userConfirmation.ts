import { dispatch } from "../state/dispatch"
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import { toggleUserConfirmation } from "../state/chat/reducer"

export async function getUserConfirmation({content}: {content: string}) {
  const thread = getState().chat.activeThread
  dispatch(toggleUserConfirmation({'show': true, 'content': content}))
  
  while (true){
    const state = getState()
    const userConfirmation = state.chat.threads[thread].userConfirmation
    if (userConfirmation.show && userConfirmation.userInput != 'NULL'){
      const userApproved = userConfirmation.userInput == 'APPROVE'
      console.log('User approved:', userApproved)
      dispatch(toggleUserConfirmation({'show': false, 'content': ''}))
      return userApproved
    }
    await sleep(100)
  }
}