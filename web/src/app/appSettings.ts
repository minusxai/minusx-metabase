import { getState } from "../state/store"

export const getAppSettings = () => {
  const settings = getState().settings
  return {
    savedQueries: settings.savedQueries
  }
}