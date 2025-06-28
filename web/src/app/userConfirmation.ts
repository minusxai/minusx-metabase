import { dispatch } from "../state/dispatch"
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import { toggleUserConfirmation } from "../state/chat/reducer"
import { abortPlan } from '../state/chat/reducer'

export async function getUserConfirmation({content, contentTitle, oldContent, override = false}: {content: string, contentTitle: string, oldContent: string | undefined, override?: boolean}) {
  const state = getState()
  const isEnabled = state.settings.confirmChanges || override
  if (!isEnabled) return true
  const thread = state.chat.activeThread
  dispatch(toggleUserConfirmation({show: true, content: content, contentTitle: contentTitle, oldContent: oldContent}))
  
  while (true){
    const state = getState()
    const userConfirmation = state.chat.threads[thread].userConfirmation
    if (userConfirmation.show && userConfirmation.content === content && userConfirmation.userInput != 'NULL'){
      const userApproved = userConfirmation.userInput == 'APPROVE'
      console.log('User approved:', userApproved)
      dispatch(toggleUserConfirmation({show: false, content: '', contentTitle: '', oldContent: ''}))
      return userApproved
    }
    await sleep(100)
  }
}