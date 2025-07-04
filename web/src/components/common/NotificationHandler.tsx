import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../state/store';
import { toast } from '../../app/toast';
import { markAsExecuted } from '../../state/notifications/reducer';
import { notifications as notificationsAPI } from '../../app/api';
import { Notification } from '../../types/notifications';
import { get } from 'lodash';

export const NotificationHandler: React.FC = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state: RootState) => state.notifications);

  const executeNotification = async (notification: Notification) => {
    try {
      if (notification.content.type === 'TOAST') {
        // Display toast notification
        const description = get(notification, 'content.message', '')
        if (description) {
          toast({
            title: 'Notification',
            description: notification.content.message,
            status: 'info',
            duration: 5000,
            isClosable: true,
            position: 'bottom-right',
          });
        }
      } else if (notification.content.type === 'DISPATCH') {
        const action = get(notification, 'content.action');
        const payload = get(notification, 'content.payload', {});
        if (action && typeof action === 'string') {
          // Dispatch the action with payload
          dispatch({
            type: action,
            payload,
          });
        }
      }

      // Mark as executed in local state
      dispatch(markAsExecuted(notification.id));

      // Mark as executed on server
      await notificationsAPI.markExecuted(notification.id);

    } catch (error) {
      console.error('Error executing notification:', error);
    }
  };

  useEffect(() => {
    // Find undelivered and unexecuted notifications
    const unprocessedNotifications = notifications.filter(
      n => !n.delivered_at || !n.executed_at
    );

    // Execute each unprocessed notification
    unprocessedNotifications.forEach(notification => {
      if (!notification.executed_at) {
        executeNotification(notification);
      }
    });
  }, [notifications]);

  // This component doesn't render anything - it just handles notification execution
  return null;
};

export default NotificationHandler;