
import { memoize } from 'web'
import { fetchData } from "../../../../../web/src/app/rpc";

const DEFAULT_TTL_FOR_FIELDS = 60 * 60 * 1000; // 1 hour

// if url has /dashboard/ in it, then it's a dashboard
export const isDashboardPage = (url: string) => {
  return url.includes('/dashboard/');
}

// subset
type FieldApiResponse = {
  table: {
    schema: string,
    name: string
  },
  name: string
}

async function getFieldResolvedName(fieldId: number) {
  const fieldInfo = await fetchData(`/api/field/${fieldId}`, 'GET') as FieldApiResponse
  return `${fieldInfo.table.schema}.${fieldInfo.table.name}.${fieldInfo.name}`
}

export const memoizedGetFieldResolvedName = memoize(getFieldResolvedName, DEFAULT_TTL_FOR_FIELDS)