import { getState, RootState } from "../state/store"

export const getAppSettings = () => {
  const state: RootState = getState()
  const settings = state.settings
  return {
    savedQueries: settings.savedQueries,
    newSearch: settings.newSearch
  }
}