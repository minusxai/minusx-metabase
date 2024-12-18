import { dispatch } from "../state/dispatch"
import { getState, RootState } from "../state/store"
import { setUsedMeasures, setUsedDimensions, setUsedFilters, SemanticFilter, SemanticMember } from '../state/settings/reducer'

export const getAppSettings = () => {
  const state: RootState = getState()
  const settings = state.settings
  return {
    savedQueries: settings.savedQueries,
    newSearch: settings.newSearch,
    semanticPlanner: settings.demoMode,
    measures: settings.availableMeasures,
    dimensions: settings.availableDimensions
  }
}

export const setUsedMeasuresAction = (measures: string[]) => {
  dispatch(setUsedMeasures(measures))
}

export const setUsedDimensionsAction = (measures: string[]) => {
  dispatch(setUsedDimensions(measures))
}

export const setUsedFiltersAction = (filters: SemanticFilter[]) => {
  dispatch(setUsedFilters(filters))
}