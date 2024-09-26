import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'


interface BillingState {
  isSubscribed: boolean
  credits: number
}

const initialState: BillingState = {
  isSubscribed: false,
  credits: 0
}


export const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setBillingInfo: (
      state,
      action: PayloadAction<BillingState>
    ) => {
      state.credits = action.payload.credits
      state.isSubscribed = action.payload.isSubscribed
    },
    removeOneCreditOnLlmCall: (
      state
    ) => {
      state.credits -= 1
    }
  },
})

// Action creators are generated for each case reducer function
export const { setBillingInfo, removeOneCreditOnLlmCall } = billingSlice.actions

export default billingSlice.reducer