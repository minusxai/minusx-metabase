import axios from 'axios';
import { configs } from '../../constants';
import { toast } from '../toast';
const API_BASE_URL = configs.AUTH_BASE_URL

export default {
  async register() {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`);
      return response.data;
    } catch (error) {
      toast({
        title: 'Error registering',
        description: "Please try again",
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom-right',
      })
      console.error('Error during registration:', error);
      throw error;
    }
  },

  async login(auth_jwt: string, otp: string, session_jwt: string, discoverySource?: string ) {
    try {
      const requestBody: any = { auth_jwt, otp, session_jwt };
      if (discoverySource) {
        requestBody.discoverySource = discoverySource;
      }
      const response = await axios.post(`${API_BASE_URL}/login`, requestBody);
      return response.data;
    } catch (error) {
      toast({
        title: 'Invalid Code',
        description: "Please try again",
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom-right',
      })
      console.error('Error during login:', error);
      throw error;
    }
  },

  async verifyEmail(email: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/verify_email`, { email });
      return response.data;
    } catch (error) {
      toast({
        title: 'Error verifying email',
        description: "Please try again",
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom-right',
      })
      console.error('Error during verify email:', error);
      throw error;
    }
  },

  async refresh() {
    try {
      const response = await axios.post(`${API_BASE_URL}/refresh`);
      return response.data;
    } catch (error) {
      console.error('Error during refresh:', error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          return {
            expired: true
          }
        }
      }
      return {}
    }
  },

  async embedAuth(token: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/embed`, { token });
      return response.data;
    } catch (error) {
      console.error('Error during embed auth:', error);
    }
  }
}