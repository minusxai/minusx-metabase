
import { configs } from '../../constants'
import axios, { AxiosError } from 'axios';
import { dispatch, logoutState } from '../../state/dispatch';
import { toast } from '../toast';
import { update_profile } from '../../state/auth/reducer';
const url = `${configs.PLANNER_BASE_URL}/getLLMResponse`


export const getLLMResponse = async (payload: any, signal?: AbortSignal) => {
    return await axios.post(url, payload, {
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
          dispatch(update_profile({ credits_expired: true }))
          throw error
        } else {
          throw error
        }
      } else {
        throw error
      }
    })
}