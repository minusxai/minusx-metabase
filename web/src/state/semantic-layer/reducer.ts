import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Measure { 
  name: string
  description: string
}

export interface Dimension {
  name: string
  description: string
  unique_values?: string[]
}

interface SemanticLayerState {
  availableMeasures: Measure[]
  availableDimensions: Dimension[]
}

const initialState: SemanticLayerState = {
  availableMeasures: [],
  availableDimensions: [],
}

export const semanticLayerSlice = createSlice({
  name: 'semanticLayer',
  initialState,
  reducers: {
    setAvailableMeasures: (state, action: PayloadAction<Measure[]>) => {
      state.availableMeasures = action.payload
    },
    setAvailableDimensions: (state, action: PayloadAction<Dimension[]>) => {
      state.availableDimensions = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setAvailableMeasures, setAvailableDimensions } = semanticLayerSlice.actions

export default semanticLayerSlice.reducer