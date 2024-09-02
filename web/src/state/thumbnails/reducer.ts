import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Image } from '../chat/reducer'

export interface ThumbnailsState {
  thumbnails: Image[]
  instructions: string
}

const initialState: ThumbnailsState = {
    thumbnails: [],
    instructions: ''
}

export const thumbnailsSlice = createSlice({
  name: 'thumbnails',
  initialState,
  reducers: {
    addThumbnail: (
      state,
      action: PayloadAction<Image>
    ) => {
        state.thumbnails.push(action.payload)
    },
    removeThumbnail: (
        state,
        action: PayloadAction<number>
      ) => {
        state.thumbnails.splice(action.payload, 1)
    },
    resetThumbnails: (
      state,
    ) => {
      state.thumbnails = []
    },
    setInstructions: (
      state,
      action: PayloadAction<string>
    ) => {
      state.instructions = action.payload
    },
  },
})

// Action creators are generated for each case reducer function
export const { addThumbnail, removeThumbnail, resetThumbnails, setInstructions } = thumbnailsSlice.actions

export default thumbnailsSlice.reducer
