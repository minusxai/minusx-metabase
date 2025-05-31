import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { MxModel } from '../../helpers/utils'

interface CacheState {
  mxCollectionId: number | null | undefined
  mxModels: MxModel[]
}

const initialState: CacheState = {
  mxCollectionId: undefined,
  mxModels: [],
}

export const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setMxModels: (state, action: PayloadAction<MxModel[]>) => {
      state.mxModels = action.payload
    },
    setMxCollectionId: (state, action: PayloadAction<number | null>) => {
      state.mxCollectionId = action.payload
    }
  },
})

// Action creators are generated for each case reducer function
export const { setMxModels, setMxCollectionId } = cacheSlice.actions

export default cacheSlice.reducer