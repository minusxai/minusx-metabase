import { store } from './store'

export const dispatch: typeof store.dispatch = (...args: Parameters<typeof store.dispatch>) => store.dispatch(...args)

export const resetState = () => dispatch({
  type: 'reset'
})

export const logoutState = () => dispatch({
  type: 'logout'
})

export const uploadThread = (thread: []) => dispatch({
  type: 'upload_thread',
  payload: thread
})

export const uploadState = (state: {}) => dispatch({
  type: 'upload_state',
  payload: state
})
