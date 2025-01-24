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
}

interface SemanticLayerState {
  availableMeasures: Measure[]
  availableDimensions: Dimension[]
  availableLayers: Layer[]
  fullLayerDump: string
}

const initialState: SemanticLayerState = {
  availableMeasures: [],
  availableDimensions: [],
  availableLayers: [],
  fullLayerDump: '',
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
    setFullLayerDump: (state, action: PayloadAction<string>) => {
      state.fullLayerDump = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { setAvailableMeasures, setAvailableDimensions, setAvailableLayers, setFullLayerDump } = semanticLayerSlice.actions

export default semanticLayerSlice.reducer