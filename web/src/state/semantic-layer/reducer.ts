import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Layer {
  name: string
  description: string
}

export interface Measure { 
  name: string
  description: string
}

export interface Dimension {
  name: string
  description: string
  sample_values?: string[]
  distinct_count?: number
}

interface SemanticLayerState {
  availableMeasures: Measure[]
  availableDimensions: Dimension[]
  availableLayers: Layer[]
}

const initialState: SemanticLayerState = {
  availableMeasures: [],
  availableDimensions: [],
  availableLayers: [],
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
    setAvailableLayers: (state, action: PayloadAction<Layer[]>) => {
      state.availableLayers = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setAvailableMeasures, setAvailableDimensions, setAvailableLayers } = semanticLayerSlice.actions

export default semanticLayerSlice.reducer