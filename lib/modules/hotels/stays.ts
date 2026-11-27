// Khách sạn, giá và phòng còn bán được lấy từ hệ thống VTrip (API công khai của CMS local).
// Đặt NEXT_PUBLIC_VTRIP_API_URL nếu gateway không ở địa chỉ mặc định.
import type { Hotel } from './types'

export const publicApiUrl = process.env.NEXT_PUBLIC_VTRIP_API_URL ?? 'http://localhost:8090/splatform-cms/api/v1/public'

type Stay = { id: string; name: string; city: string; address: string; partner: string; star: number; offers: Offer[] }
type SearchResponse = { data: { nights: number; hotels: Stay[] } }

/** One room type + rate plan. `total` is the price of one room for the whole stay. */
export type Offer = { roomTypeId: string; roomName: string; ratePlanId: string; ratePlanName: string; total: number; available: number }
export type StayHotel = Hotel & { id: string; address: string; offers: Offer[] }

// Ảnh minh họa, chọn theo mã khách sạn để mỗi nơi luôn cùng một ảnh.
const images = [
  '1566073771259-6a8506099945', '1571896349842-33c89424de2d', '1542314831-068cd1dbfeeb',
  '1520250497591-112f2f40a3f4', '1582719508461-905c673771fd', '1551882547-ff40c63fe5fa',
].map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`)

const imageFor = (id: string) => images[Number.parseInt(id.slice(-3), 16) % images.length]

/** Hotels that still have enough rooms for the stay, cheapest offer first. */
export async function searchStays(checkIn: string, checkOut: string, guests: number, rooms: number, signal?: AbortSignal): Promise<StayHotel[]> {
  const adultsPerRoom = Math.max(1, Math.ceil(guests / rooms))
  const query = new URLSearchParams({ checkin: checkIn, checkout: checkOut, adults: String(adultsPerRoom) })
  const response = await fetch(`${publicApiUrl}/search?${query}`, { signal })
  if (!response.ok) throw new Error(`Tìm phòng lỗi (HTTP ${response.status})`)
  const { data } = (await response.json()) as SearchResponse
  return data.hotels
    .map((hotel) => ({ ...hotel, offers: hotel.offers.filter((offer) => offer.available >= rooms) }))
    .filter((hotel) => hotel.offers.length > 0)
    .map((hotel) => {
      const best = hotel.offers[0]
      return {
        id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        address: hotel.address,
        detail: `${best.roomName} · ${best.ratePlanName}`,
        rating: `${hotel.star} sao`,
        reviews: hotel.partner,
        price: Math.round(best.total / data.nights),
        image: imageFor(hotel.id),
        tag: best.available <= 3 ? `Chỉ còn ${best.available} phòng` : `Còn ${best.available} phòng`,
        offers: hotel.offers,
      }
    })
}
