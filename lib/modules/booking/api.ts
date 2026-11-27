// Đặt phòng và thanh toán MÔ PHỎNG (không có tiền thật, không nhập số thẻ).
import { publicApiUrl } from '@/lib/modules/hotels/stays'

export type Customer = { id: string; name: string; note: string; balance: number }
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
export type Booking = {
  id: string; code: string; hotelName: string; roomName: string; ratePlanName: string
  checkIn: string; checkOut: string; rooms: number; adults: number; amount: number
  refundable: boolean; status: BookingStatus; note: string | null
}
export type WalletEntry = { id: string; kind: 'TOPUP' | 'PAYMENT' | 'REFUND'; amount: number; description: string; createdAt: string }
export type Account = { customer: Customer; bookings: Booking[]; transactions: WalletEntry[] }
export type PaymentMethod = 'WALLET' | 'CARD'
export type CardScenario = 'SUCCESS' | 'DECLINED' | 'INSUFFICIENT' | 'EXPIRED_CARD' | 'TIMEOUT'

export type OrderRequest = {
  customerId: string; propertyId: string; roomTypeId: string; ratePlanId: string
  checkIn: string; checkOut: string; rooms: number; adults: number; expectedTotal: number
}

export class BookingError extends Error {
  constructor(message: string, readonly code: string, readonly details: { shortfall?: number; newTotal?: number } = {}) {
    super(message)
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${publicApiUrl}${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new BookingError('Không kết nối được hệ thống. Kiểm tra lại rồi thử tiếp.', 'NETWORK')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.errors?.[0] ?? {}
    throw new BookingError(payload?.message ?? `Lỗi HTTP ${response.status}`, detail.field ?? 'ERROR', detail)
  }
  return payload.data as T
}

export const bookingApi = {
  customers: () => request<Customer[]>('/customers'),
  account: (customerId: string) => request<Account>(`/customers/${customerId}`),
  topUp: (customerId: string, amount: number) => request<{ customer: Customer }>('/wallet/topup', { customerId, amount }),
  create: (order: OrderRequest) => request<Booking>('/bookings', order),
  pay: (bookingId: string, customerId: string, method: PaymentMethod, cardScenario?: CardScenario) =>
    request<{ booking: Booking }>(`/bookings/${bookingId}/pay`, { customerId, method, cardScenario }),
  cancel: (bookingId: string, customerId: string) => request<{ booking: Booking; refunded: number }>(`/bookings/${bookingId}/cancel`, { customerId }),
}

export const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
export const formatDay = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`))
