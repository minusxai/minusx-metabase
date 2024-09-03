import { dispatch } from "../state/dispatch"
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import { toggleUserConfirmation } from "../state/chat/reducer"

export async function getUserConfirmation(){
  const thread = getState().chat.activeThread
  const activeThread = getState().chat.threads[thread]
  const messages = activeThread.messages
  const msgIDX = messages.findLastIndex((message: any) => message.role === 'tool' && message.action.status === 'DOING');
  dispatch(toggleUserConfirmation(true))
  
  while (true){
    const state = getState()
    const userConfirmation = state.chat.threads[thread].userConfirmation
    if (userConfirmation.show && userConfirmation.userInput != 'NULL'){
      const userApproved = userConfirmation.userInput == 'APPROVE'
      console.log('User approved:', userApproved)
      dispatch(toggleUserConfirmation(false))
      return userApproved
    }
    await sleep(500)
  }
}