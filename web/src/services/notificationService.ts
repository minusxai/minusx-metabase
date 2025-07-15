import { AppDispatch } from '../state/store';
import { setNotifications, setPollingStatus, markAsDelivered } from '../state/notifications/reducer';
import { notifications as notificationsAPI } from '../app/api';
import { isEmpty } from 'lodash';

class NotificationService {
  private dispatch: AppDispatch | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  initialize(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  async fetchNotifications() {
    if (!this.dispatch) {
      console.error('NotificationService not initialized');
      return;
    }

    try {
      const response = await notificationsAPI.getNotifications();
      
      if (response.success && !isEmpty(response.notifications)) {
        // Set the notifications in Redux store
        this.dispatch(setNotifications(response.notifications));

        // Mark all fetched notifications as delivered
        const deliveryPromises = response.notifications
          .filter(notification => !notification.delivered_at)
          .map(async (notification) => {
            try {
              await notificationsAPI.markDelivered(notification.id);
              if (this.dispatch) {
                this.dispatch(markAsDelivered(notification.id));
              }
            } catch (error) {
              console.error(`Error marking notification ${notification.id} as delivered:`, error);
            }
          });

        await Promise.all(deliveryPromises);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  startPolling() {
    if (this.isPolling || !this.dispatch) return;

    this.isPolling = true;
    this.dispatch(setPollingStatus(true));

    // Fetch immediately on start
    this.fetchNotifications();

    // Set up polling every 1 minute (60000 ms)
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications();
    }, 60000);
  }

  stopPolling() {
    if (!this.isPolling || !this.dispatch) return;

    this.isPolling = false;
    this.dispatch(setPollingStatus(false));

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  isCurrentlyPolling() {
    return this.isPolling;
  }

  cleanup() {
    this.stopPolling();
    this.dispatch = null;
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();

export default notificationService;