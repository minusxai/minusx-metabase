import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import pLimit from 'p-limit'
import axios from 'axios'

// Store for API-specific limiters
const limiters = new Map<string, ReturnType<typeof pLimit>>()

// Custom axios-based baseQuery that works with our JWT setup
const createAxiosBaseQuery = (baseUrl: string): BaseQueryFn<any, unknown, unknown> => {
  return async ({ url, method = 'GET', body, params }) => {
    try {
      const result = await axios({
        url: `${baseUrl}/${url}`,
        method,
        data: body,
        params,
      })
      
      return { data: result.data }
    } catch (axiosError: any) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data || axiosError.message,
        },
      }
    }
  }
}

export function createConcurrencyBaseQuery(
  baseUrl: string, 
  concurrency?: number
): BaseQueryFn<any, unknown, unknown> {
  const baseQuery = createAxiosBaseQuery(baseUrl)
  
  // If no concurrency limit, return standard baseQuery
  if (!concurrency) {
    return baseQuery
  }
  
  // Create or get existing limiter for this baseUrl/concurrency combo
  const limitKey = `${baseUrl}_${concurrency}`
  if (!limiters.has(limitKey)) {
    limiters.set(limitKey, pLimit(concurrency))
  }
  const limiter = limiters.get(limitKey)!
  
  // Return wrapped baseQuery with concurrency control
  return async (args, api, extraOptions) => {
    return limiter(() => baseQuery(args, api, extraOptions))
  }
}