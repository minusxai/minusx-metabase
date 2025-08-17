import { dispatch } from "../state/dispatch"
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import { toggleUserConfirmation } from "../state/chat/reducer"
import { abortPlan } from '../state/chat/reducer'

export async function getUserConfirmation({content, contentTitle, oldContent, override = false}: {content: string, contentTitle: string, oldContent: string | undefined, override?: boolean}) {
  const state = getState()
  const isEnabled = state.settings.confirmChanges || override
  if (!isEnabled) return { userApproved: true, userFeedback: '' }
  const thread = state.chat.activeThread
  dispatch(toggleUserConfirmation({show: true, content: content, contentTitle: contentTitle, oldContent: oldContent}))
  
  while (true){
    const state = getState()
    const userConfirmation = state.chat.threads[thread].userConfirmation
    console.log('Polling user confirmation:', userConfirmation.show, userConfirmation.content, content)
    if (userConfirmation.show && userConfirmation.content === content && userConfirmation.userInput != 'NULL'){
      const userApproved = userConfirmation.userInput == 'APPROVE'
      const userFeedback = userConfirmation.userFeedback || ''
      console.log('User approved:', userApproved, 'feedback:', userConfirmation.userFeedback || 'No feedback')
      dispatch(toggleUserConfirmation({show: false, content: '', contentTitle: '', oldContent: ''}))
      return { userApproved, userFeedback }
    }
    await sleep(100)
  }
}