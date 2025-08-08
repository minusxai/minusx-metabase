import _ from 'lodash'
import { dispatch } from '../state/dispatch'
import { MessageIndex, finishAction, interruptPlan, FinishedActionStatus, ActionPlanChatMessage } from '../state/chat/reducer'
import { getState } from '../state/store'
import { getApp } from '../helpers/app'
import { toast } from '../app/toast'

export interface ExecutableAction {
  index: MessageIndex
  function: string
  args: any
}

type ActionReturnValue = {
  index: MessageIndex,
  returnValue: any,
  status: FinishedActionStatus
}

export const parseArguments = (actionArgs: string, fn: string): any => {
  let args = {}
  try{
    args = typeof actionArgs == 'string' ? JSON.parse(actionArgs) : actionArgs || {}
  }
  catch(e){
    if (fn === 'talkToUser') {
      args = { content: actionArgs }
    }
    else {
      console.log('Error parsing action args', e)
      throw e
    }
  }
  return args
}


export const executeAction = async (action: ExecutableAction): Promise<ActionReturnValue> => {
  const { index } = action;
  const actionArgs = action['args']
  const fn = action['function']
  try {
    const args = parseArguments(actionArgs, fn)
    let returnValue = await getApp().actionController.runAction(fn, args)
    console.log('Successfully completed action', fn, 'with args', args)
    return { index, returnValue, status: 'SUCCESS' }
  } catch (err) {
    console.error(err)
    toast({
      title: 'Action Incomplete',
      description: `${err}`,
      status: 'warning',
      duration: 5000,
      isClosable: true,
      position: 'bottom-right'
    })
    return { index, returnValue: undefined, status: 'FAILURE' }
  }
}

window.__EXECUTE_ACTION__ = async(action: ExecutableAction) => {
  if (window.IS_PLAYWRIGHT) {
    return await executeAction(action)
  }
}


export const performActions = async (signal: AbortSignal) => {
  const thread = getState().chat.activeThread
  const activeThread = getState().chat.threads[thread]
  const messageHistory = activeThread.messages
  const lastMessage = messageHistory[messageHistory.length - 1]
  // check if last message is assistant message. if so that means there's no tool call
  // we should interrupt the plan and return
  if (lastMessage.role == 'assistant') {
    let planID = messageHistory.length - 1 // right now planID is the index of the assistant message
    dispatch(interruptPlan({
      planID,
      actionStatus: 'INTERRUPTED'
    }))
    return
  }

  if (activeThread.status != 'EXECUTING' || lastMessage.role != 'tool') {
    return
  }
  const planID = lastMessage.action.planID
  const planMessage = messageHistory[planID] as ActionPlanChatMessage
  if (planMessage.content.type != 'ACTIONS') {
    return
  }
  const messageIDs = planMessage.content.actionMessageIDs
  const actions: ExecutableAction[] = []
  messageIDs.forEach(messageID => {
    const message = messageHistory[messageID]
    if (message.role != 'tool')
      return
    const action = message.action
    // Skip actions that are already finished (completed tasks)
    if (action.finished)
      return
    actions.push({
      index: messageID,
      function: action.function.name,
      args: action.function.arguments,
    })
  })

  const actionsStack: ExecutableAction[] = [...actions]
  actionsStack.reverse()
  // degenerate case: actionsStack is empty (sometimes happens with claude?). just interrupt the plan
  // this happens when the assistant message has 0 tool calls but has a content message
  if (_.isEmpty(actionsStack)) {
    return
  }
  while (!_.isEmpty(actionsStack)) {
    const action = actionsStack.pop() as ExecutableAction
    const { index, status, returnValue } = await executeAction(action)
    if (status == 'FAILURE') {
      console.log('Perform Actions Error, aborting plan midway')
      dispatch(finishAction({
        messageID: index,
        actionStatus: 'FAILURE',
      }))
      dispatch(interruptPlan({
        planID,
        actionStatus: 'INTERRUPTED'
      }))
      break
    }
    console.log('Return value content is', returnValue)
    dispatch(finishAction({
      messageID: index,
      actionStatus: status,
      content: returnValue
    }))
    // just throw an error if the signal is aborted
    // pass the messageID to the error so we can see where it was aborted
    if (signal.aborted) {
      dispatch(interruptPlan({
        planID,
        actionStatus: 'INTERRUPTED'
      }))
      signal.throwIfAborted()
    }
  }
  console.log("actually done with all actions, setting status to finished")
}