import { queryCache } from '@/lib/api/query-cache'
import { hotelsApi } from './api'
import type { HotelSearchParams } from './types'

function queryKey(params: HotelSearchParams) {
  return `hotels:list:${JSON.stringify(params)}`
}

export const hotelsQueries = {
  list(params: HotelSearchParams = {}) {
    return queryCache(queryKey(params), () => hotelsApi.list(params))
  },
}
