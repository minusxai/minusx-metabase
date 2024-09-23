import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type token = string

type Membership = 'free' | 'tier-1'

interface LoginState {
    session_jwt?: token;
    profile_id?: string;
    email?: string;
    membership: Membership;
    credits_expired: boolean
}

interface AuthState extends LoginState{
    is_authenticated: boolean;
}

const initialState: AuthState = {
    is_authenticated: false,
    membership: 'free',
    credits_expired: false
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
      const { session_jwt, profile_id, email, membership, credits_expired } = action.payload
      state.session_jwt = session_jwt
      state.profile_id = profile_id
      state.email = email
      state.is_authenticated = true
      state.membership = membership
      state.credits_expired = credits_expired
    },
    update_profile: (state, action: PayloadAction<Partial<LoginState>>) => {
      const { email, membership, credits_expired } = action.payload
      state.email = email ?? state.email
      state.membership = membership ?? state.membership
      state.credits_expired = credits_expired ?? state.credits_expired
    },
  },
})

// Action creators are generated for each case reducer function
export const { register, login, update_profile } = authSlice.actions

export default authSlice.reducer
