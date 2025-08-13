import { createApi } from '@reduxjs/toolkit/query/react'
import { createConcurrencyBaseQuery } from './concurrency'
import { configs } from '../../constants'

// Types based on the atlas API schema
export interface AssetInfo {
  slug: string
  name: string
  type: 'main_doc' | 'playbook' | 'notes' | 'context'
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
  role: 'admin' | 'member'
  created_at: string
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

export const atlasApi = createApi({
  reducerPath: 'atlasApi',
  baseQuery: createConcurrencyBaseQuery(configs.ATLAS_BASE_URL, 1),
  keepUnusedDataFor: 300, // Cache for 5 minutes
  tagTypes: ['User', 'Assets'],
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
  }),
})

export const { 
  useGetAtlasMeQuery,
  useLazyGetAtlasMeQuery
} = atlasApi