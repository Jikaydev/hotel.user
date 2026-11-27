export type Hotel = {
  id: number | string
  name: string
  city: string
  detail: string
  rating: string
  reviews: string
  price: number
  image: string
  tag: string
}

export type HotelSearchParams = {
  city?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  rooms?: number
}
