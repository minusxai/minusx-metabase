import { getState } from "../state/store"

export const getAppSettings = () => {
  const settings = getState().settings
  return {
    confirmChanges: settings.confirmChanges,
    savedQueries: settings.savedQueries
  }
}