import { MetabaseAppStateDashboard } from '../DOMToState';

// if url has /dashboard/ in it, then it's a dashboard
export const isDashboardPageUrl = (url: string) => {
  return url.includes('/dashboard/');
}

export function getDashboardPrimaryDbId(appState: MetabaseAppStateDashboard | null) {
  if (!appState) {
    return undefined;
  }
  const dbIds = appState.cards.map(card => card.databaseId)
  // count and return the most frequently occurring dbId
  const counts = dbIds.reduce((acc, dbId) => {
    acc[dbId] = (acc[dbId] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  // sort counts by value, descending
  const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1])
  // convert to integer
  return parseInt(sortedCounts[0][0])
}