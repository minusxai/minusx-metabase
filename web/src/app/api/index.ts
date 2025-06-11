import auth from './auth'
import { getLLMResponse } from './planner'
import notifications from './notifications'
import axios from 'axios';

const setAxiosJwt = (token: string) => {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export {
  auth,
  getLLMResponse,
  notifications,
  setAxiosJwt,
}