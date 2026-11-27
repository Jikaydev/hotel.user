'use client'

import { useState } from 'react'
import { ArrowRight, BedDouble, Check, CreditCard, Plus, ShoppingBag, Wallet, X } from 'lucide-react'
import { BookingError, bookingApi, formatDay, formatMoney, type Account, type Booking, type CardScenario, type PaymentMethod } from '@/lib/modules/booking/api'

/** A room the guest chose: either in the cart or already an order waiting for payment. */
export type Choice = {
  key: string; hotelName: string; city: string; image: string; roomName: string; ratePlanName: string
  checkIn: string; checkOut: string; nights: number; rooms: number; adults: number; total: number
  propertyId?: string; roomTypeId?: string; ratePlanId?: string
  orderId?: string
}

const statusText: Record<Booking['status'], string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', EXPIRED: 'Quá hạn', FAILED: 'Không đặt được',
}
const scenarios: [CardScenario, string][] = [
  ['SUCCESS', 'Thẻ hợp lệ (thành công)'], ['DECLINED', 'Ngân hàng từ chối'], ['INSUFFICIENT', 'Thẻ không đủ hạn mức'],
  ['EXPIRED_CARD', 'Thẻ hết hạn'], ['TIMEOUT', 'Cổng thanh toán không phản hồi'],
]
const stayText = (c: Choice) => `${formatDay(c.checkIn)} – ${formatDay(c.checkOut)} · ${c.nights} đêm · ${c.rooms} phòng · ${c.adults} khách`

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>{children}</div>
}

function PanelHeading({ kicker, title, id, onClose }: { kicker: string; title: React.ReactNode; id: string; onClose: () => void }) {
  return <div className="panel-heading"><div><span className="search-kicker">{kicker}</span><h2 id={id}>{title}</h2></div><button className="close-button" aria-label="Đóng" onClick={onClose}><X size={19} /></button></div>
}

export function CartPanel({ cart, onRemove, onCheckout, onClose, onBrowse }: {
  cart: Choice[]; onRemove: (key: string) => void; onCheckout: (choice: Choice) => void; onClose: () => void; onBrowse: () => void
}) {
  return <Overlay onClose={onClose}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
    <PanelHeading kicker="CHUYẾN ĐI CỦA BẠN" id="cart-title" title={<>Giỏ đặt phòng <span className="panel-count">{cart.length}</span></>} onClose={onClose} />
    {cart.length ? <>
      <div className="cart-items">{cart.map((item) => <article className="cart-item" key={item.key}>
        <div className="cart-thumb" style={{ backgroundImage: `url('${item.image}')` }} />
        <div className="cart-item-copy">
          <strong>{item.hotelName}</strong><span>{item.roomName} · {item.ratePlanName}</span><span>{stayText(item)}</span><b>{formatMoney(item.total)}</b>
          <button className="book-button" onClick={() => onCheckout(item)}>Đặt phòng này <ArrowRight size={14} /></button>
        </div>
        <button aria-label={`Xóa ${item.hotelName}`} onClick={() => onRemove(item.key)}><X size={16} /></button>
      </article>)}</div>
      <div className="cart-summary"><span>Tổng giỏ hàng</span><strong>{formatMoney(cart.reduce((sum, item) => sum + item.total, 0))}</strong></div>
      <p className="demo-disclaimer">Mỗi phòng thanh toán thành một đơn riêng. Phòng chỉ được giữ khi thanh toán thành công.</p>
    </> : <div className="empty-cart"><ShoppingBag size={32} /><strong>Giỏ đặt phòng đang trống</strong><span>Mở chi tiết khách sạn và chọn phòng để thêm vào đây.</span><button onClick={onBrowse}>Khám phá khách sạn</button></div>}
  </section></Overlay>
}

export function CheckoutDialog({ choice, customerId, balance, onClose, onChanged, onPaid }: {
  choice: Choice; customerId: string; balance: number
  onClose: () => void
  /** Money, rooms or orders changed: reload the account and the search. */
  onChanged: () => void
  onPaid: (choice: Choice) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('WALLET')
  const [scenario, setScenario] = useState<CardScenario>('SUCCESS')
  const [orderId, setOrderId] = useState(choice.orderId)
  const [total, setTotal] = useState(choice.total)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<BookingError | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const short = method === 'WALLET' ? Math.max(0, total - balance) : 0
  // Còn phòng thì mới cho bấm thanh toán lại.
  const closed = problem?.code === 'SOLD_OUT' || problem?.code === 'NOT_PAYABLE'

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setProblem(null)
    try {
      await work()
    } catch (error) {
      const failure = error instanceof BookingError ? error : new BookingError(String(error), 'ERROR')
      if (failure.details.newTotal) setTotal(failure.details.newTotal)
      if (failure.code === 'EXPIRED') setOrderId(undefined)
      setProblem(failure)
    } finally {
      setBusy(false)
      onChanged()
    }
  }

  const pay = () => run(async () => {
    let id = orderId
    if (!id) {
      if (!choice.propertyId || !choice.roomTypeId || !choice.ratePlanId) throw new BookingError('Hãy chọn lại phòng từ danh sách', 'ERROR')
      const order = await bookingApi.create({
        customerId, propertyId: choice.propertyId, roomTypeId: choice.roomTypeId, ratePlanId: choice.ratePlanId,
        checkIn: choice.checkIn, checkOut: choice.checkOut, rooms: choice.rooms, adults: choice.adults, expectedTotal: total,
      })
      id = order.id
      setOrderId(id)
    }
    const result = await bookingApi.pay(id, customerId, method, method === 'CARD' ? scenario : undefined)
    setBooking(result.booking)
    onPaid(choice)
  })

  const topUp = (amount: number) => run(async () => { await bookingApi.topUp(customerId, amount) })
  const suggested = Math.max(10000, Math.ceil(short / 10000) * 10000)

  return <Overlay onClose={onClose}><section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <PanelHeading kicker={booking ? 'ĐẶT PHÒNG THÀNH CÔNG' : 'HOÀN TẤT ĐẶT PHÒNG'} id="booking-title" title={booking ? 'Kỳ nghỉ đã sẵn sàng' : 'Xác nhận & thanh toán'} onClose={onClose} />
    {booking ? <div className="booking-success">
      <span className="success-mark"><Check size={30} /></span><h3>Thanh toán thành công</h3><p>Mã đặt phòng của bạn</p><strong className="booking-code">{booking.code}</strong>
      <div className="success-summary"><span>{booking.hotelName} · {booking.roomName}</span><span>{stayText(choice)}</span><span>{formatMoney(booking.amount)}</span></div>
      <p className="demo-disclaimer">Giao dịch mô phỏng: không thu tiền thật. Phòng đã được trừ trong hệ thống.</p>
      <button className="panel-primary" onClick={onClose}>Hoàn tất</button>
    </div> : <>
      <div className="booking-hotel-summary"><div className="booking-thumb" style={{ backgroundImage: `url('${choice.image}')` }} /><div><strong>{choice.hotelName}</strong><span>{choice.roomName} · {choice.ratePlanName}</span><span>{stayText(choice)}</span></div></div>
      <div className="booking-total"><span>Tổng thanh toán</span><strong>{formatMoney(total)}</strong></div>

      <fieldset className="pay-methods">
        <legend>Phương thức thanh toán</legend>
        <label><input type="radio" name="method" checked={method === 'WALLET'} onChange={() => { setMethod('WALLET'); setProblem(null) }} /> <Wallet size={15} /> Ví của tôi · {formatMoney(balance)}</label>
        <label><input type="radio" name="method" checked={method === 'CARD'} onChange={() => { setMethod('CARD'); setProblem(null) }} /> <CreditCard size={15} /> Thẻ thử (không nhập số thẻ)</label>
        {method === 'CARD' && <select aria-label="Tình huống thẻ thử" value={scenario} onChange={(event) => { setScenario(event.target.value as CardScenario); setProblem(null) }}>{scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
      </fieldset>

      {short > 0 && <div className="booking-error" role="alert">Ví thiếu {formatMoney(short)}. <button disabled={busy} onClick={() => topUp(suggested)}>Nạp thêm {formatMoney(suggested)}</button></div>}
      {problem && !(problem.code === 'INSUFFICIENT_FUNDS' && short > 0) && <p className="booking-error" role="alert">{problem.message}{problem.code === 'PRICE_CHANGED' && ` Giá mới: ${formatMoney(total)}. Bấm thanh toán lại nếu bạn đồng ý.`}</p>}

      <button className="panel-primary" disabled={busy || closed} onClick={pay}>{busy ? 'Đang xử lý…' : `Thanh toán ${formatMoney(total)}`} <ArrowRight size={16} /></button>
      <p className="demo-disclaimer">Thanh toán mô phỏng. Đơn chưa trả tiền được giữ 15 phút trong mục Đơn đặt phòng.</p>
    </>}
  </section></Overlay>
}

export function OrdersPanel({ account, onPay, onCancel, onClose, onBrowse, message }: {
  account: Account | null; onPay: (booking: Booking) => void; onCancel: (booking: Booking) => void; onClose: () => void; onBrowse: () => void; message: string
}) {
  const bookings = account?.bookings ?? []
  return <Overlay onClose={onClose}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="history-title">
    <PanelHeading kicker={account?.customer.name ?? 'TÀI KHOẢN'} id="history-title" title="Đơn đặt phòng" onClose={onClose} />
    {message && <p className="booking-error" role="status">{message}</p>}
    {bookings.length ? <div className="cart-items">{bookings.map((b) => <article className="history-card" key={b.id}>
      <div className="cart-item-copy">
        <strong>{b.hotelName}</strong><span>{b.roomName} · {b.ratePlanName}</span><span>{formatDay(b.checkIn)} – {formatDay(b.checkOut)} · {b.rooms} phòng</span>
        <b>{formatMoney(b.amount)}</b>
        <small>{b.code} · {statusText[b.status]}{b.note ? ` · ${b.note}` : ''}{!b.refundable && b.status === 'CONFIRMED' ? ' · Không hoàn tiền' : ''}</small>
        <div className="order-actions">
          {b.status === 'PENDING_PAYMENT' && <button className="book-button" onClick={() => onPay(b)}>Thanh toán</button>}
          {(b.status === 'PENDING_PAYMENT' || (b.status === 'CONFIRMED' && b.refundable)) && <button className="add-cart-button" onClick={() => onCancel(b)}>Hủy đơn</button>}
        </div>
      </div>
    </article>)}</div> : <div className="empty-cart"><BedDouble size={32} /><strong>Bạn chưa có đơn đặt phòng</strong><span>Đơn đã đặt sẽ xuất hiện ở đây.</span><button onClick={onBrowse}>Tìm khách sạn</button></div>}
  </section></Overlay>
}

export function WalletPanel({ account, onTopUp, onClose }: { account: Account | null; onTopUp: (amount: number) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = Number.isSafeInteger(amount) && amount >= 10000 && amount <= 100_000_000
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await onTopUp(amount)
      setAmount(0)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }
  return <Overlay onClose={onClose}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
    <PanelHeading kicker={account?.customer.name ?? 'TÀI KHOẢN'} id="wallet-title" title="Ví của tôi" onClose={onClose} />
    <div className="wallet-card"><Wallet size={22} /><span>Số dư ví</span><strong>{formatMoney(account?.customer.balance ?? 0)}</strong><small>Ví mô phỏng</small></div>
    <div className="wallet-topup">
      <strong>Nạp tiền (mô phỏng)</strong><label htmlFor="wallet-topup-amount">Nhập số tiền muốn nạp</label>
      <div className="wallet-amount-input"><input id="wallet-topup-amount" type="number" inputMode="numeric" min="10000" step="10000" placeholder="Tối thiểu 10.000 ₫" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value))} /><span>₫</span></div>
      <small className="wallet-input-hint">Từ 10.000 ₫ đến 100.000.000 ₫</small>
      <div className="wallet-suggestions" aria-label="Mức tiền đề xuất">{[500000, 1000000, 2000000, 5000000, 10000000].map((value) => <button type="button" className={amount === value ? 'selected' : ''} key={value} onClick={() => setAmount(value)}>{formatMoney(value)}</button>)}</div>
      {error && <p className="booking-error" role="alert">{error}</p>}
      <button className="panel-primary" disabled={!valid || busy} onClick={submit}>Nạp {valid ? formatMoney(amount) : 'vào ví'} <ArrowRight size={16} /></button>
    </div>
    <div className="wallet-transactions"><h3>Lịch sử giao dịch</h3>{account?.transactions.length ? account.transactions.map((t) => <article className="wallet-transaction" key={t.id}>
      <span className={t.amount > 0 ? 'wallet-transaction-icon incoming' : 'wallet-transaction-icon'}>{t.amount > 0 ? <Plus size={15} /> : <CreditCard size={15} />}</span>
      <span className="wallet-transaction-info"><strong>{t.description}</strong><small>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.createdAt))}</small></span>
      <b className={t.amount > 0 ? 'incoming' : ''}>{t.amount > 0 ? '+' : ''}{formatMoney(t.amount)}</b>
    </article>) : <p className="wallet-empty-history">Chưa có giao dịch.</p>}</div>
  </section></Overlay>
}
