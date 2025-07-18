import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'


interface BillingState {
  isSubscribed: boolean
  credits: number
  stripeCustomerId?: string
  infoLoaded: boolean
  isEnterpriseCustomer: boolean
}

const initialState: BillingState = {
  isSubscribed: false,
  credits: 0,
  infoLoaded: false,
  isEnterpriseCustomer: false
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
      state.stripeCustomerId = action.payload.stripeCustomerId
      state.infoLoaded = action.payload.infoLoaded
      state.isEnterpriseCustomer = action.payload.isEnterpriseCustomer
    },
    updateCredits: (
      state,
      action: PayloadAction<number | undefined | null> 
    ) => {
      if (action.payload !== null && action.payload !== undefined) {
        state.credits = action.payload
      }
    }
  },
})

// Action creators are generated for each case reducer function
export const { setBillingInfo, updateCredits } = billingSlice.actions

export default billingSlice.reducer