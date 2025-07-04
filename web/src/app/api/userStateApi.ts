import { createApi } from '@reduxjs/toolkit/query/react'
import { createConcurrencyBaseQuery } from './concurrency'
import { configs } from '../../constants'

export const userStateApi = createApi({
  reducerPath: 'userStateApi',
  baseQuery: createConcurrencyBaseQuery(configs.SERVER_BASE_URL, 1),
  keepUnusedDataFor: 0,
  endpoints: (builder) => ({
    getUserState: builder.query({
      query: () => ({
        url: 'user_state/get_or_create',
        method: 'POST',
      }),
      transformResponse: (response: any) => {
        return response.success ? response.data : {}
      },
    }),
    
    submitReview: builder.mutation({
      query: ({ rating, comments }) => ({
        url: 'user_state/review',
        method: 'POST',
        body: { rating, comments },
      }),
      transformResponse: (response: any) => {
        return response.success ? response.data : {}
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            userStateApi.util.updateQueryData('getUserState', undefined, () => data)
          )
        } catch {
          // Request failed, do nothing
        }
      },
    }),
  }),
})

export const { 
  useGetUserStateQuery, 
  useSubmitReviewMutation 
} = userStateApi