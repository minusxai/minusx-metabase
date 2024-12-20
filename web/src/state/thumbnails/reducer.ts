import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Image } from '../chat/reducer'

export interface SemanticFilter {
  or?: SemanticFilter[]
  and?: SemanticFilter[]
  member?: string
  operator?: string
  values?: string[]
}

export interface TimeDimension {
  dimension: string
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  dateRange?: string[] // [start, end], YYYY-MM-DD format
}

export type Order = [string, 'asc' | 'desc']

export interface SemanticQuery {
  measures: string[]
  dimensions: string[]
  filters: SemanticFilter[]
  timeDimensions: TimeDimension[]
  order: Order[]
}

export interface ThumbnailsState {
  thumbnails: Image[]
  instructions: string
  semanticQuery: SemanticQuery
}

const initialState: ThumbnailsState = {
  thumbnails: [],
  instructions: '',
  semanticQuery: {
    measures: [],
    dimensions: [],
    filters: [],
    timeDimensions: [],
    order: []
  }
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
    setSemanticQuery: (state, action: PayloadAction<Partial<SemanticQuery>>) => {
      state.semanticQuery = {
        ...state.semanticQuery,
        ...action.payload
      }
    },
    resetSemanticQuery: (state) => {
      state.semanticQuery = initialState.semanticQuery
    }
  },
})

// Action creators are generated for each case reducer function
export const { addThumbnail, removeThumbnail, resetThumbnails, setInstructions, setSemanticQuery, resetSemanticQuery } = thumbnailsSlice.actions

export default thumbnailsSlice.reducer
