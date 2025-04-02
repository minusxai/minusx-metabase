import { configs } from '../../constants'
import axios, { AxiosError } from 'axios';
import { dispatch, logoutState } from '../../state/dispatch';
import { toast } from '../toast';
const url = `${configs.PLANNER_BASE_URL}/getLLMResponse`
const dr_url = `${configs.BASE_SERVER_URL}/deepresearch/chat_planner`

export const getLLMResponse = async (payload: any, signal?: AbortSignal, deepresearch = false) => {
    const remoteUrl = deepresearch ? dr_url : url
    return await axios.post(remoteUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal
    }).catch((error: Error | AxiosError) => {
      // check if unauthorized response, logout and throw error
      // otherwise pass error up
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          logoutState();
          toast({
            title: 'Unauthorized',
            description: "Please login again",
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'bottom-right',
          })
          throw new Error("Unauthorized, please login again")
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