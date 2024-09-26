import { configs } from '../../constants'
import axios, { AxiosError } from 'axios';

export const getBillingInfo = async () => {
  const response = await axios.get(`${configs.SERVER_BASE_URL}/billing/info`)
  return response.data
}