import { createHttpClient } from '@/lib/api/http-client'
import type { Hotel, HotelSearchParams } from './types'

// Created on demand so mock-only mode works without API environment variables.
function hotelsClient() {
  return createHttpClient('hotels')
}

export const hotelsApi = {
  list(params: HotelSearchParams = {}) {
    const query = new URLSearchParams()
    if (params.city) query.set('city', params.city)
    if (params.checkIn) query.set('checkIn', params.checkIn)
    if (params.checkOut) query.set('checkOut', params.checkOut)
    if (params.guests !== undefined) query.set('guests', String(params.guests))
    if (params.rooms !== undefined) query.set('rooms', String(params.rooms))
    const suffix = query.size ? `?${query.toString()}` : ''
    return hotelsClient().request<Hotel[]>(`hotels${suffix}`)
  },
}
