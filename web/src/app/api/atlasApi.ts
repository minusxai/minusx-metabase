import { createApi } from '@reduxjs/toolkit/query/react'
import { createConcurrencyBaseQuery } from './concurrency'
import { configs } from '../../constants'

// Types based on the atlas API schema
export interface AssetInfo {
  slug: string
  name: string
  type: 'main_doc' | 'playbook' | 'notes' | 'context' | 'scheduled_report' | 'alert'
  content: object
  team_slug: string
  company_slug: string
  permission: 'edit' | 'view'
  created_at: string
  updated_at: string
}

export interface CompanyInfo {
  slug: string
  name: string
  role: 'admin' | 'member' | 'godmode_access'
  created_at: string
  admins?: string[]  // List of admin emails (visible to godmode users)
  context?: {
    metabaseOrigin?: string
  }
}

export interface TeamInfo {
  slug: string
  name: string
  company_slug: string
  company_name: string
  role: 'owner' | 'viewer'
  created_at: string
}

export interface ProfileInfo {
  id: string
  email: string
  created_at: string
}

export interface MeResponse {
  profile: ProfileInfo
  companies: CompanyInfo[]
  teams: TeamInfo[]
  accessible_assets: AssetInfo[]
}

export interface AtlasApiResponse<T> {
  success: boolean
  data: T
  meta?: Record<string, any>
}

// Job Types
export type JobStatus = 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT'

export interface JobRun {
  id: number
  job_id: string
  status: JobStatus
  created_at: string
  completed_at: string | null
  input: {
    data: {
      url: string
      questions: string[]
    }
    type: string
    emails: string[]
    job_id: string
    timeout: number
    schedule: string
    requested_at: string
  }
  output: any | null
  error_message: string | null
  timeout: number
}

export interface JobExecuteRequest {
  job_ids: string[]
  forced: boolean
  send_email: boolean
}

export interface JobExecuteResponse {
  job_runs: JobRun[]
  total_jobs: number
  new_runs_created: number
}

export interface CreateAssetRequest {
  name: string
  type: 'scheduled_report' | 'alert'
  content: {
    url: string
    questions: string[]
    schedule: string
    emails: string[]
    template?: string
  }
}

export const atlasApi = createApi({
  reducerPath: 'atlasApi',
  baseQuery: createConcurrencyBaseQuery(configs.ATLAS_BASE_URL, 1),
  keepUnusedDataFor: 300, // Cache for 5 minutes
  tagTypes: ['User', 'Assets', 'JobRuns'],
  endpoints: (builder) => ({
    getAtlasMe: builder.query<MeResponse, void>({
      query: () => ({
        url: 'me',
        method: 'GET',
      }),
      transformResponse: (response: AtlasApiResponse<MeResponse>) => {
        return response.success ? response.data : {
          profile: { id: '', email: '', created_at: '' },
          companies: [],
          teams: [],
          accessible_assets: []
        }
      },
      providesTags: ['User', 'Assets'],
    }),
    // Job endpoints
    executeJob: builder.mutation<JobExecuteResponse, { assetIds: string[], isForced?: boolean, sendEmail?: boolean }>({
      query: ({ assetIds, isForced = false, sendEmail = false }) => ({
        url: '../jobs/execute',
        method: 'POST',
        body: {
          job_ids: assetIds,
          forced: isForced,
          send_email: sendEmail
        }
      }),
      invalidatesTags: ['JobRuns'],
    }),
    getJobRunHistory: builder.query<JobRun[], string>({
      query: (jobId) => ({
        url: `../jobs/runs/job/${jobId}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response
        } else if (response && Array.isArray(response.data)) {
          return response.data
        } else if (response && response.success && Array.isArray(response.data)) {
          return response.data
        }
        return []
      },
      providesTags: (result, error, jobId) => [{ type: 'JobRuns' as const, id: jobId }],
    }),
    sendJobEmail: builder.mutation<AtlasApiResponse<any>, number>({
      query: (runId) => ({
        url: `../jobs/${runId}/send_email`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, runId) => [{ type: 'JobRuns' as const }],
    }),
    createAsset: builder.mutation<AtlasApiResponse<{ asset: AssetInfo }>, {
      companySlug: string
      teamSlug: string
      data: CreateAssetRequest
      asUser?: string  // For godmode: which admin to act as
    }>({
      query: ({ companySlug, teamSlug, data, asUser }) => {
        const url = `company/${companySlug}/team/${teamSlug}/assets`;
        return {
          url: asUser ? `${url}?as_user=${encodeURIComponent(asUser)}` : url,
          method: 'POST',
          body: data
        };
      },
      invalidatesTags: ['User', 'Assets'],
    }),
  }),
})

export const {
  useGetAtlasMeQuery,
  useLazyGetAtlasMeQuery,
  useExecuteJobMutation,
  useGetJobRunHistoryQuery,
  useLazyGetJobRunHistoryQuery,
  useSendJobEmailMutation,
  useCreateAssetMutation
} = atlasApi