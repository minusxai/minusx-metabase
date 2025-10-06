import { configs } from '../../constants'
import axios, { AxiosError } from 'axios';
import { dispatch, logoutState } from '../../state/dispatch';
import { toast } from '../toast';
const url = `${configs.PLANNER_BASE_URL}/getLLMResponse`
const dr_url = `${configs.BASE_SERVER_URL}/deepresearch/chat_planner`
const dr_url_v2 = `${configs.BASE_SERVER_URL}/deepresearch/v2/chat_planner`
const dr_tool_url = `${configs.BASE_SERVER_URL}/deepresearch/chat`
const prewarm_url = `${configs.BASE_SERVER_URL}/deepresearch/chat_plan_warm`

export const getLLMResponse = async (payload: any, signal?: AbortSignal, deepresearch = 'simple' ) => {
    let remoteUrl = deepresearch === 'simple' ? url : dr_url
    
    // If this is a prewarm request, use the prewarm URL instead
    if (payload.isPrewarm) {
      remoteUrl = prewarm_url
    }
    
    return await axios.post(remoteUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal
    }).catch((error: Error | AxiosError) => {
      // check if unauthorized response, logout and throw error
      // otherwise pass error up
      if (payload.isPrewarm) {
        return {
          data: {
            tool_calls: [],
            finish_reason: 'prewarm',
            content: '',
            tasks: []
          }
        }
      }
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error("Authentication error occurred.")
        } else if (error.response.status === 402) {
          // Hack to capture billing event
          dispatch({
            type: 'payments/credits_expired',
          })
          throw error
        } else {
          throw error
        }
      } else {
        throw error
      }
    })
}

