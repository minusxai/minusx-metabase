import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Notification } from '../../types/notifications'

interface NotificationsState {
  notifications: Notification[];
  isPolling: boolean;
  lastFetchTime: number | null;
}

const initialState: NotificationsState = {
  notifications: [],
  isPolling: false,
  lastFetchTime: null,
}

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (
      state,
      action: PayloadAction<Notification[]>
    ) => {
      state.notifications = action.payload
      state.lastFetchTime = Date.now()
    },
    markAsDelivered: (
      state,
      action: PayloadAction<string>
    ) => {
      const notificationId = action.payload
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.delivered_at = new Date().toISOString()
      }
    },
    markAsExecuted: (
      state,
      action: PayloadAction<string>
    ) => {
      const notificationId = action.payload
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.executed_at = new Date().toISOString()
      }
    },
    removeExecutedNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.executed_at)
    },
    setPollingStatus: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.isPolling = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { 
  setNotifications, 
  markAsDelivered, 
  markAsExecuted, 
  removeExecutedNotifications, 
  setPollingStatus 
} = notificationsSlice.actions

export default notificationsSlice.reducer