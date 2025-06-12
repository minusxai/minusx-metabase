import axios from 'axios';
import { configs } from '../../constants';
import { NotificationsResponse, NotificationActionResponse } from '../../types/notifications';

const API_BASE_URL = configs.BASE_SERVER_URL + '/notifications';

export default {
  async getNotifications(): Promise<NotificationsResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  async markDelivered(notificationId: string): Promise<NotificationActionResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${notificationId}/delivered`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
      throw error;
    }
  },

  async markExecuted(notificationId: string): Promise<NotificationActionResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${notificationId}/executed`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as executed:', error);
      throw error;
    }
  }
};