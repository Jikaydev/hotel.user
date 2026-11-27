'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BedDouble, CalendarDays, Check, ChevronDown, Compass, Globe2, MapPin, Minus, Plus, Search, ShoppingBag, Star, Users, UserRound, X, ArrowUp, Wallet } from 'lucide-react'
import { CartPanel, CheckoutDialog, OrdersPanel, WalletPanel, type Choice } from '@/components/booking-panels'
import { bookingApi, type Account, type Booking, type Customer } from '@/lib/modules/booking/api'
import { searchStays, type Offer, type StayHotel } from '@/lib/modules/hotels/stays'

const destinations = ['Phú Quốc', 'Nha Trang', 'Đà Lạt', 'Sa Pa', 'Hội An', 'Hà Nội']
const dayFromToday = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

function Counter({ label, value, onChange, min = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <div className="counter-row"><span>{label}</span><div className="counter-controls"><button type="button" aria-label={`Giảm ${label}`} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={15} /></button><span aria-live="polite">{value}</span><button type="button" aria-label={`Tăng ${label}`} onClick={() => onChange(value + 1)}><Plus size={15} /></button></div></div>
}

export function HotelSearch() {
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState(() => dayFromToday(7))
  const [checkOut, setCheckOut] = useState(() => dayFromToday(9))
  const [guests, setGuests] = useState(2)
  const [rooms, setRooms] = useState(1)
  const [showGuests, setShowGuests] = useState(false)
  const [searched, setSearched] = useState(false)
  const [language, setLanguage] = useState('VI')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [hotels, setHotels] = useState<StayHotel[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('an')
  const [account, setAccount] = useState<Account | null>(null)
  const [cart, setCart] = useState<Choice[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState<Choice | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<StayHotel | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [walletOpen, setWalletOpen] = useState(false)
  const formatDate = (value: string) => value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`)) : ''
  const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN').format(value)
  const nights = Math.max(1, Math.round((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000))
  const availableHotels = searched && destination ? hotels.filter((hotel) => hotel.city === destination) : hotels

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return
    const controller = new AbortController()
    setLoadState('loading')
    searchStays(checkIn, checkOut, guests, rooms, controller.signal)
      .then((result) => { setHotels(result); setLoadState('ready') })
      .catch((error: Error) => { if (error.name !== 'AbortError') { setHotels([]); setLoadState('error') } })
    return () => controller.abort()
  }, [checkIn, checkOut, guests, rooms, reloadKey])

  useEffect(() => {
    const saved = window.localStorage.getItem('vp-ota-demo-customer')
    if (saved) setCustomerId(saved)
    bookingApi.customers().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  const loadAccount = useCallback(() => bookingApi.account(customerId).then(setAccount).catch(() => setAccount(null)), [customerId])
  useEffect(() => { loadAccount() }, [loadAccount])

  const refresh = () => { loadAccount() }
  const reloadSearch = () => setReloadKey((key) => key + 1)
  const chooseCustomer = (id: string) => { setCustomerId(id); setAccount(null); setCart([]); setProfileOpen(false); window.localStorage.setItem('vp-ota-demo-customer', id) }

  const toChoice = (hotel: StayHotel, offer: Offer): Choice => ({
    key: [offer.roomTypeId, offer.ratePlanId, checkIn, checkOut, rooms, guests].join('|'),
    hotelName: hotel.name, city: hotel.city, image: hotel.image, roomName: offer.roomName, ratePlanName: offer.ratePlanName,
    checkIn, checkOut, nights, rooms, adults: guests, total: offer.total * rooms,
    propertyId: hotel.id, roomTypeId: offer.roomTypeId, ratePlanId: offer.ratePlanId,
  })
  const addToCart = (choice: Choice) => setCart((current) => current.some((item) => item.key === choice.key) ? current : [...current, choice])
  const inCart = (choice: Choice) => cart.some((item) => item.key === choice.key)
  const startCheckout = (choice: Choice) => { setSelectedHotel(null); setCartOpen(false); setHistoryOpen(false); setCheckout(choice) }

  const payOrder = (booking: Booking) => startCheckout({
    key: booking.id, orderId: booking.id, hotelName: booking.hotelName, city: '', image: hotels.find((h) => h.name === booking.hotelName)?.image ?? '',
    roomName: booking.roomName, ratePlanName: booking.ratePlanName, checkIn: booking.checkIn, checkOut: booking.checkOut,
    nights: Math.round((Date.parse(booking.checkOut) - Date.parse(booking.checkIn)) / 86400000), rooms: booking.rooms, adults: booking.adults, total: booking.amount,
  })
  const cancelOrder = async (booking: Booking) => {
    if (!window.confirm(`Hủy đơn ${booking.code}?`)) return
    try {
      const result = await bookingApi.cancel(booking.id, customerId)
      setOrderMessage(result.refunded ? `Đã hủy và hoàn ${formatPrice(result.refunded)} ₫ (mô phỏng).` : 'Đã hủy đơn.')
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : String(error))
    }
    loadAccount()
    reloadSearch()
  }

  return (
    <main className="hotel-page">
      <section className="hero" id="home">
        <div className="hero-image" />
        <header className="topbar">
          <a className="brand" href="#home" aria-label="VP - OTA trang chủ"><span className="brand-mark">✳</span><span>VP - OTA</span></a>
          <div className="header-actions">
            <div className="header-popover-wrap"><button className="language" aria-expanded={languageOpen} onClick={() => { setLanguageOpen(!languageOpen); setProfileOpen(false) }}><Globe2 size={16} /> {language} <ChevronDown size={14} /></button>{languageOpen && <div className="header-popover language-popover"><button onClick={() => { setLanguage('VI'); setLanguageOpen(false) }}>Tiếng Việt {language === 'VI' && <Check size={14} />}</button><button onClick={() => { setLanguage('EN'); setLanguageOpen(false) }}>English {language === 'EN' && <Check size={14} />}</button></div>}</div>
            <button className="header-icon-button cart-button" aria-label={`Giỏ đặt phòng, ${cart.length} khách sạn`} onClick={() => { setCartOpen(true); setProfileOpen(false) }}><ShoppingBag size={19} /><span>Giỏ đặt phòng</span>{cart.length > 0 && <b className="cart-count">{cart.length}</b>}</button>
            <div className="header-popover-wrap profile-wrap"><button className="profile-button" aria-label="Tài khoản khách" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setLanguageOpen(false) }}><UserRound size={17} /><span>{account?.customer.name ?? 'Tài khoản'}</span><ChevronDown size={13} /></button>{profileOpen && <div className="header-popover profile-popover"><div className="profile-summary"><span className="avatar">{(account?.customer.name ?? 'K').split(' ').pop()?.charAt(0)}</span><span><strong>{account?.customer.name ?? 'Khách VP - OTA'}</strong><small>Ví: {formatPrice(account?.customer.balance ?? 0)} ₫</small></span></div><label className="customer-switch">Khách mẫu<select value={customerId} onChange={(event) => chooseCustomer(event.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.note}</option>)}</select></label><button onClick={() => { setProfileOpen(false); setOrderMessage(''); loadAccount(); setHistoryOpen(true) }}>Đơn đặt phòng của tôi <ArrowRight size={14} /></button><button onClick={() => { setProfileOpen(false); setCartOpen(true) }}>Giỏ đặt phòng <ShoppingBag size={14} /></button><button onClick={() => { setProfileOpen(false); loadAccount(); setWalletOpen(true) }}>Ví của tôi <Wallet size={15} /></button></div>}</div>
          </div>
        </header>
        <div className="hero-copy">
          <div className="eyebrow"><span /> KỲ NGHỈ CỦA BẠN BẮT ĐẦU TỪ ĐÂY</div><h1>Đi muôn nơi,<br /><em>ngủ thật ngon.</em></h1><p>Chọn điểm đến. Chốn nghỉ dưỡng thuộc về bạn.</p>
        </div>
        <div className="search-shell" id="search">
          <div className="search-heading"><div><span className="search-kicker">LÊN KẾ HOẠCH CHUYẾN ĐI</span><h2>Hãy lựa chọn các địa điểm đến của bạn</h2></div><span className="secure-note"><Compass size={15} /> Thuộc sở hữu của Vinpearl</span></div>
          <form className="search-form" onSubmit={(event) => { event.preventDefault(); setSearched(true); document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            <label className="search-field destination-field"><span className="field-icon"><MapPin size={19} /></span><span className="field-content"><span className="field-label">Điểm đến</span><input aria-label="Địa điểm" list="destination-list" placeholder="Bạn muốn đi đâu?" value={destination} onChange={(event) => setDestination(event.target.value)} /><datalist id="destination-list">{destinations.map((city) => <option key={city} value={city} />)}</datalist></span></label>
            <label className="search-field date-field"><span className="field-icon"><CalendarDays size={19} /></span><span className="field-content"><span className="field-label">Nhận phòng</span><input aria-label="Ngày nhận phòng" type="date" value={checkIn} onChange={(event) => { setCheckIn(event.target.value); if (checkOut <= event.target.value) { const next = new Date(`${event.target.value}T00:00:00`); next.setDate(next.getDate() + 1); setCheckOut(next.toISOString().slice(0, 10)) } }} /></span></label>
            <label className="search-field date-field"><span className="field-icon"><CalendarDays size={19} /></span><span className="field-content"><span className="field-label">Trả phòng</span><input aria-label="Ngày trả phòng" type="date" value={checkOut} min={checkIn} onChange={(event) => setCheckOut(event.target.value)} /></span></label>
            <div className="search-field guest-field"><span className="field-icon"><Users size={19} /></span><button type="button" className="guest-trigger" aria-expanded={showGuests} onClick={() => setShowGuests(!showGuests)}><span className="field-content"><span className="field-label">Khách & phòng</span><span className="field-value">{guests} khách, {rooms} phòng</span></span><ChevronDown size={16} /></button>{showGuests && <div className="guest-popover"><Counter label="Người lớn" value={guests} onChange={setGuests} /><Counter label="Phòng" value={rooms} onChange={setRooms} /><button type="button" className="done-button" onClick={() => setShowGuests(false)}>Xong</button></div>}</div>
            <button className="search-button" type="submit"><Search size={19} /> <span>Tìm khách sạn</span></button>
          </form>
        </div>
      </section>
      <section className="hotel-section" id="hotels" aria-label="Danh sách khách sạn" >
        <div className="section-intro hotel-section-heading"><div><span className="search-kicker">CHỌN NƠI NGHỈ DƯỠNG</span><h2>{searched && destination ? `Khách sạn tại ${destination}` : 'Những kỳ nghỉ được yêu thích'}</h2></div><span className="hotel-count">{loadState === 'loading' ? 'Đang tìm phòng…' : `${availableHotels.length} khách sạn còn phòng`}</span></div>
        <div className="hotel-list">{availableHotels.length ? availableHotels.map((hotel) => <article className="hotel-card" key={hotel.id}><button type="button" className="hotel-card-details-trigger" aria-label={`Xem chi tiết ${hotel.name}`} onClick={() => setSelectedHotel(hotel)}><span className="hotel-photo" style={{ backgroundImage: `url('${hotel.image}')` }}><span>{hotel.tag}</span></span><span className="hotel-details"><span className="hotel-location"><MapPin size={13} /> {hotel.city}</span><strong className="hotel-name">{hotel.name}</strong><span className="hotel-description">{hotel.detail}</span><span className="hotel-rating"><span><Star size={13} fill="currentColor" /> {hotel.rating}</span> {hotel.reviews}</span><span className="hotel-detail-link">Xem chi tiết</span></span></button><div className="hotel-price"><span className="price-note">Giá mỗi đêm từ</span><strong>{formatPrice(hotel.price)} <small>₫</small></strong><span className="price-total">Giá 1 phòng · đang tìm {nights} đêm</span><div className="hotel-actions"><button className="add-cart-button" aria-label={`Thêm ${hotel.name} vào giỏ`} onClick={() => addToCart(toChoice(hotel, hotel.offers[0]))}>{inCart(toChoice(hotel, hotel.offers[0])) ? <Check size={16} /> : <ShoppingBag size={16} />}</button><button className="book-button" onClick={() => startCheckout(toChoice(hotel, hotel.offers[0]))}>Đặt phòng <ArrowRight size={15} /></button></div></div></article>) : <div className="no-results"><BedDouble size={24} /><strong>{loadState === 'loading' ? 'Đang tìm phòng…' : loadState === 'error' ? 'Không tải được dữ liệu khách sạn' : 'Không còn phòng cho lựa chọn này'}</strong><span>{loadState === 'error' ? 'Kiểm tra hệ thống local đã bật chưa.' : 'Thử đổi ngày hoặc điểm đến.'}</span></div>}</div>
      </section>
      {selectedHotel && <div className="overlay hotel-detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedHotel(null) }}><section className="hotel-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="hotel-detail-title"><button className="close-button hotel-detail-close" aria-label="Đóng chi tiết khách sạn" onClick={() => setSelectedHotel(null)}><X size={19} /></button><div className="hotel-detail-image" style={{ backgroundImage: `url('${selectedHotel.image}')` }}><span>{selectedHotel.tag}</span></div><div className="hotel-detail-content"><span className="hotel-location"><MapPin size={14} /> {selectedHotel.city}</span><h2 id="hotel-detail-title">{selectedHotel.name}</h2><p>{selectedHotel.address}</p><div className="hotel-rating"><span><Star size={13} fill="currentColor" /> {selectedHotel.rating}</span> {selectedHotel.reviews}</div><div className="hotel-detail-facts"><span><CalendarDays size={16} /> {formatDate(checkIn)} – {formatDate(checkOut)} · {nights} đêm</span><span><Users size={16} /> {guests} khách · {rooms} phòng</span></div>
        <ul className="offer-list">{selectedHotel.offers.map((offer) => { const choice = toChoice(selectedHotel, offer); return <li key={choice.key}><div><strong>{offer.roomName}</strong><span>{offer.ratePlanName} · còn {offer.available} phòng</span><b>{formatPrice(choice.total)} ₫</b><small>{nights} đêm · {rooms} phòng</small></div><div className="hotel-detail-actions"><button className="add-cart-button" aria-label={`Thêm ${offer.roomName} ${offer.ratePlanName} vào giỏ`} onClick={() => addToCart(choice)}>{inCart(choice) ? <Check size={16} /> : <ShoppingBag size={16} />}</button><button className="book-button" onClick={() => startCheckout(choice)}>Đặt <ArrowRight size={14} /></button></div></li> })}</ul>
      </div></section></div>}
      {searched && <div className="results-notice" role="status"><BedDouble size={18} /><span>Đang tìm chỗ nghỉ tại <strong>{destination || 'mọi điểm đến'}</strong> · {formatDate(checkIn)} – {formatDate(checkOut)} · {guests} khách, {rooms} phòng</span><button onClick={() => setSearched(false)} aria-label="Đóng"><X size={16} /></button></div>}
      <footer className="footer"><div className="footer-main"><div className="footer-about"><a className="brand footer-brand" href="#home"><span className="brand-mark">✳</span><span>VP - OTA</span></a><p>Chọn đúng nơi ở, trọn vẹn kỳ nghỉ.</p></div><div className="footer-column"><strong>Khám phá</strong><a href="#search">Tìm khách sạn</a><a href="#destinations">Điểm đến yêu thích</a><a href="#hotels">Ưu đãi lưu trú</a></div><div className="footer-column"><strong>Hỗ trợ khách hàng</strong><a href="#booking">Hướng dẫn đặt phòng</a><a href="#booking">Thanh toán & xác nhận</a><a href="mailto:hello@VP - OTA.example">Liên hệ hỗ trợ</a></div><div className="footer-contact"><strong>Đồng hành cùng chuyến đi</strong><span>Hỗ trợ mỗi ngày · 08:00 – 22:00</span><a href="tel:19001234">1900 1234</a></div></div><div className="footer-bottom"><span>© 2026 VP - OTA. Bản demo phục vụ giới thiệu/kiểm thử — không phát sinh giao dịch thật.</span></div></footer>
      <button className="back-to-top" aria-label="Quay lại đầu trang" title="Quay lại đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={19} /></button>
      {cartOpen && <CartPanel cart={cart} onRemove={(key) => setCart((items) => items.filter((item) => item.key !== key))} onCheckout={startCheckout} onClose={() => setCartOpen(false)} onBrowse={() => { setCartOpen(false); document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth' }) }} />}
      {historyOpen && <OrdersPanel account={account} message={orderMessage} onPay={payOrder} onCancel={cancelOrder} onClose={() => setHistoryOpen(false)} onBrowse={() => { setHistoryOpen(false); document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth' }) }} />}
      {walletOpen && <WalletPanel account={account} onTopUp={async (amount) => { await bookingApi.topUp(customerId, amount); await loadAccount() }} onClose={() => setWalletOpen(false)} />}
      {checkout && <CheckoutDialog key={checkout.key + customerId} choice={checkout} customerId={customerId} balance={account?.customer.balance ?? 0} onClose={() => { setCheckout(null); reloadSearch() }} onChanged={refresh} onPaid={(paid) => setCart((items) => items.filter((item) => item.key !== paid.key))} />}
    </main>
  )
}
