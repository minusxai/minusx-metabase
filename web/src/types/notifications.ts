export interface NotificationContent {
  type: string;
  message: string;
  // Future content properties can be added here
}

export interface Notification {
  id: string;
  profile_id: string;
  content: NotificationContent;
  delivered_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
}

export interface NotificationActionResponse {
  success: boolean;
}