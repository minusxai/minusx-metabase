import { RPCs, memoize } from 'web'
import { get } from 'lodash'
import { getWithWarning } from '../common/utils'
import { DatabaseSchemaQueryResponse } from './types'

const DEFAULT_TTL = 0
// sample /api/projects response:
/*
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 81547,
      "uuid": "0190ed48-e824-0000-e672-18e73e032322",
      "organization": "0190ed48-e725-0000-74eb-63e5bc82b1bb",
      "api_token": "phc_raFEq4FnuETYCApJnezA6L4Fys2d2Ciq5sZ6mtAbGyW",
      "name": "MinusX",
      "completed_snippet_onboarding": false,
      "has_completed_onboarding_for": {
        "session_replay": true
      },
      "ingested_event": true,
      "is_demo": false,
      "timezone": "UTC",
      "access_control": false
    }
  ]
}
*/
interface ProjectsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: number;
  }[]
}

// api implementation, not using right now
const getProjectIdUsingApi = async () => {
  const response = await RPCs.fetchData('/api/projects', 'GET') as ProjectsResponse
  // TODO: figure out if there are multiple projects how to deal with it? lol
  if (response?.count == 1) {
    return getWithWarning(response, 'results[0].id', 0)
  } else if (response?.count > 1) {
    console.warn('Multiple projects found, using first one')
    return getWithWarning(response, 'results[0].id', 0)
  }
  throw new Error('No projects found')
}

const getCurrentProjectId = async () => {
  const projectId = await RPCs.getPosthogAppContext('current_team.id') as number
  if (projectId) {
    return projectId
  } else {
    throw new Error('No current project found')
  }
}

export const memoizedGetCurrentProjectId = memoize(getCurrentProjectId, DEFAULT_TTL)

const getDatabaseSchema = async (projectId: number) => {
  const response = await RPCs.fetchData(
    `/api/projects/${projectId}/query/`, 
    'POST', 
    {
      "query": {
        "kind": "DatabaseSchemaQuery"
      }
    },
    {},
    {cookieKey: 'posthog_csrftoken', headerKey: 'X-Csrftoken'}
  ) as DatabaseSchemaQueryResponse
  const extractedTables  = Object.values(response.tables)
  return extractedTables
}

const getCurrentProjectDatabaseSchema = async () => {
  const projectId = await memoizedGetCurrentProjectId()
  if (projectId) {
    return getDatabaseSchema(projectId)
  } else {
    console.warn("No current project found")
    return []
  }
}

export const memoizedGetCurrentProjectDatabaseSchema = memoize(getCurrentProjectDatabaseSchema, DEFAULT_TTL)

