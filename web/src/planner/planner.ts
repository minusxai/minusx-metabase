import { createListenerMiddleware, isAnyOf, TaskAbortError } from '@reduxjs/toolkit'
import { addUserMessage, setActiveThreadStatus, abortPlan } from '../state/chat/reducer';
import { simplePlan } from './simplePlan';
import { cotPlan } from './cotPlan';
import type { RootState, AppDispatch } from '../state/store';
import { toast } from '../app/toast';
import { isAxiosError } from 'axios';
import axios from 'axios';
import { getApp } from '../helpers/app';
import { ToolPlannerConfig } from 'apps/types';
import { performActions } from './plannerActions';
import { getParsedIframeInfo } from '../helpers/origin';
import { configs } from '../constants';
export const plannerListener = createListenerMiddleware();
function shouldContinue(getState: () => RootState) {
  const state = getState()
  const thread = state.chat.activeThread
  const activeThread = state.chat.threads[thread]
  const messageHistory = activeThread.messages
  const lastMessage = messageHistory[messageHistory.length - 1]

  // For V2 API: check if should continue
  const useV2Api = state.settings.useV2API && state.settings.drMode
  if (useV2Api) {
    // Check if there are any unfinished tool messages (TODO status)
    const hasUnfinishedTools = messageHistory.some(
      (msg) => msg.role === 'tool' && !msg.action.finished
    )

    // If there are unfinished tools, continue to execute them
    if (hasUnfinishedTools) {
      return true
    }

    // Find the last assistant message to check its source
    const lastAssistantMsg = messageHistory.findLast(
      (msg) => msg.role === 'assistant' && msg.content.type === 'ACTIONS'
    )

    if (lastAssistantMsg && lastAssistantMsg.role === 'assistant' && lastAssistantMsg.content.type === 'ACTIONS') {
      // If tools came from pending (we executed them), send results back to server
      if (lastAssistantMsg.content.source === 'pending') {
        return true
      }
      // If tools came from completed (server sent them), stop (no more work)
      if (lastAssistantMsg.content.source === 'completed') {
        return false
      }
    }

    // Default: stop
    return false
  }

  // For V1 API: existing logic
  // check if there are 0 tool calls in the last assistant message. if so, we don't continue
  if (lastMessage.role == 'assistant' && lastMessage.content.toolCalls.length == 0) {
    return false
  }
  // check if the last tool was respondToUser and check what its params were
  if (lastMessage.role == 'tool' && (lastMessage.action.function.name == 'markTaskDone' || lastMessage.action.function.name == 'UpdateTaskStatus')) {
    return false;
  } else {
    // if last tool was not respondToUser, we continue anyway. not sure if we should keep it this way?
    return true
  }
}

async function plan(signal: AbortSignal, plannerConfig: ToolPlannerConfig) {
  if (plannerConfig.type == 'simple') {
    return simplePlan(signal, plannerConfig)
  } else {
    return cotPlan(signal, plannerConfig)
  }
}

const startListening = plannerListener.startListening.withTypes<
  RootState,
  AppDispatch
>();

startListening({
  matcher: isAnyOf(addUserMessage, abortPlan),
  effect: async (action, listenerApi) => {
    if (addUserMessage.match(action)) {
      let getState = listenerApi.getState
      let dispatch = listenerApi.dispatch
      let signal = listenerApi.signal
      const plannerConfig = await getApp().getPlannerConfig()
      try {
        dispatch(setActiveThreadStatus('PLANNING'));
        // do planning
        await listenerApi.pause(plan(signal, plannerConfig));
        // do tool execution
        dispatch(setActiveThreadStatus('EXECUTING'));
        await listenerApi.pause(performActions(signal));
        console.log("done with perform actions")
        // check if we need to continue tool calls. maybe should have a counter
        // here to limit the number of iterations?
        let _steps = 0
        const MAX_STEPS = 8
        while (shouldContinue(getState)) {
          _steps += 1
          if (_steps > MAX_STEPS) {
            break
          }
          dispatch(setActiveThreadStatus('PLANNING'));
          await listenerApi.pause(plan(signal, plannerConfig));
          dispatch(setActiveThreadStatus('EXECUTING'));
          await listenerApi.pause(performActions(signal));
        }
      } catch (err) {
        if (err instanceof TaskAbortError) {
          // don't do toast stuff. this happens when the user aborts the planner so not really an error
          return
        }
        let description = "Unknown error"
        if (isAxiosError(err)) {
          description = err.response?.data?.error || err.message
        } else if (err instanceof Error) {
          description = err.message
        } 
        
        // Capture error to backend for analysis
        try {
          const iframeParams = getParsedIframeInfo()
          axios.post(`${configs.SERVER_BASE_URL}/user_state/capture_error`, {
            error_description: description,
            iframe_params: iframeParams
          }).catch(captureErr => {
            // Silently handle capture errors to avoid cascading failures
            console.warn("Failed to capture error:", captureErr)
          })
        } catch (captureErr) {
          // Silently handle any errors in the capture process
          console.warn("Error in capture process:", captureErr)
        }

        // shorten it if it's too long
        description = description.length > 1000 ? description.substring(0, 1000) + '...' : description
        // log it
        console.warn("Planner error", description)

        toast({
          title: 'Planner Error',
          description,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'bottom-right',
        })
        // TODO(@arpit): fix state here in case of abort.
        // eg. if tool uses are pending, set them to cancelled or something
        // Vivek: Have handled in the respective tool call (sets it to failure for now)
      } finally {
        dispatch(setActiveThreadStatus('FINISHED'));
      }
    } else {
      listenerApi.cancelActiveListeners();
    }
  }
});
