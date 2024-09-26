import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type token = string

interface LoginState {
    session_jwt?: token;
    profile_id?: string;
    email?: string;
}

interface AuthState extends LoginState{
    is_authenticated: boolean;
}

const initialState: AuthState = {
    is_authenticated: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    register: (
      state,
      action: PayloadAction<token>
    ) => {
        state.session_jwt = action.payload
    },
    login: (
      state,
      action: PayloadAction<LoginState>
    ) => {
      const { session_jwt, profile_id, email } = action.payload
      state.session_jwt = session_jwt
      state.profile_id = profile_id
      state.email = email
      state.is_authenticated = true
    },
    update_profile: (state, action: PayloadAction<Partial<LoginState>>) => {
      const { email} = action.payload
      state.email = email ?? state.email
    },
  },
})

// Action creators are generated for each case reducer function
export const { register, login, update_profile } = authSlice.actions

export default authSlice.reducer
