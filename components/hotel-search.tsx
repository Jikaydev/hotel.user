'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, BedDouble, CalendarDays, Check, ChevronDown, Compass, CreditCard, Globe2, MapPin, Minus, Plus, Search, ShoppingBag, Star, Users, UserRound, X, ArrowUp, ShieldCheck, Wallet } from 'lucide-react'
import mockHotels from '@/public/data/_mock/hotels.json'
import type { Hotel } from '@/lib/modules/hotels'

const destinations = ['Đà Nẵng', 'Phú Quốc', 'Đà Lạt', 'Nha Trang']
const hotels: Hotel[] = mockHotels
type WalletTransaction = { id: string; type: 'topup' | 'payment'; amount: number; description: string; createdAt: string }

function Counter({ label, value, onChange, min = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <div className="counter-row"><span>{label}</span><div className="counter-controls"><button type="button" aria-label={`Giảm ${label}`} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={15} /></button><span aria-live="polite">{value}</span><button type="button" aria-label={`Tăng ${label}`} onClick={() => onChange(value + 1)}><Plus size={15} /></button></div></div>
}

export function HotelSearch() {
  const [destination, setDestination] = useState('')
  const [checkIn, setCheckIn] = useState('2026-12-10')
  const [checkOut, setCheckOut] = useState('2026-12-13')
  const [guests, setGuests] = useState(2)
  const [rooms, setRooms] = useState(1)
  const [showGuests, setShowGuests] = useState(false)
  const [searched, setSearched] = useState(false)
  const [language, setLanguage] = useState('VI')
  const [languageOpen, setLanguageOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cart, setCart] = useState<Hotel[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [booking, setBooking] = useState<Hotel | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingCode, setBookingCode] = useState('')
  const [bookingHistory, setBookingHistory] = useState<{ hotel: Hotel; code: string }[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [topUpAmount, setTopUpAmount] = useState(0)
  const [bookingError, setBookingError] = useState('')
  const [walletReady, setWalletReady] = useState(false)
  const formatDate = (value: string) => value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`)) : ''
  const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN').format(value)
  const nights = Math.max(1, Math.round((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000))
  const availableHotels = searched && destination ? hotels.filter((hotel) => hotel.city === destination) : hotels
  useEffect(() => {
    try {
      const savedBalance = Number(window.localStorage.getItem('vp-ota-demo-wallet-balance') || 0)
      const savedTransactions = JSON.parse(window.localStorage.getItem('vp-ota-demo-wallet-transactions') || '[]') as WalletTransaction[]
      setWalletBalance(Number.isFinite(savedBalance) ? savedBalance : 0)
      setWalletTransactions(Array.isArray(savedTransactions) ? savedTransactions : [])
    } catch {
      setWalletBalance(0)
      setWalletTransactions([])
    }
    setWalletReady(true)
  }, [])
  useEffect(() => {
    if (!walletReady) return
    window.localStorage.setItem('vp-ota-demo-wallet-balance', String(walletBalance))
    window.localStorage.setItem('vp-ota-demo-wallet-transactions', JSON.stringify(walletTransactions))
  }, [walletBalance, walletTransactions, walletReady])
  const addToCart = (hotel: Hotel) => setCart((current) => current.some((item) => item.id === hotel.id) ? current : [...current, hotel])
  const startBooking = (hotel: Hotel) => { setBooking(hotel); setBookingComplete(false); setBookingError('') }
  const topUpWallet = () => {
    if (!Number.isSafeInteger(topUpAmount) || topUpAmount < 10000) return
    const transaction: WalletTransaction = { id: `TOP${Date.now()}`, type: 'topup', amount: topUpAmount, description: 'Nạp tiền demo vào ví', createdAt: new Date().toISOString() }
    setWalletBalance((balance) => balance + topUpAmount)
    setWalletTransactions((transactions) => [transaction, ...transactions])
  }
  const finishBooking = () => {
    if (!booking) return
    const amount = booking.price
    if (walletBalance < amount) {
      setBookingError('Số dư ví chưa đủ. Hãy nạp thêm tiền demo để tiếp tục.')
      return
    }
    const code = `VP${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const transaction: WalletTransaction = { id: code, type: 'payment', amount: -amount, description: `Thanh toán ${booking.name}`, createdAt: new Date().toISOString() }
    setWalletBalance((balance) => balance - amount)
    setWalletTransactions((transactions) => [transaction, ...transactions])
    setBookingCode(code)
    setBookingHistory((current) => [{ hotel: booking, code }, ...current])
    setBookingComplete(true)
    setBookingError('')
    setCart((current) => current.filter((item) => item.id !== booking.id))
  }

  return (
    <main className="hotel-page">
      <section className="hero" id="home">
        <div className="hero-image" />
        <header className="topbar">
          <a className="brand" href="#home" aria-label="VP - OTA trang chủ"><span className="brand-mark">✳</span><span>VP - OTA</span></a>
          <nav className={`nav-links ${mobileOpen ? 'nav-open' : ''}`} aria-label="Điều hướng chính"><a className="active" href="#search" onClick={() => setMobileOpen(false)}>Lưu trú</a><a href="#destinations" onClick={() => setMobileOpen(false)}>Điểm đến</a><a href="#booking" onClick={() => setMobileOpen(false)}>Ưu đãi</a></nav>
          <div className="header-actions">
            <div className="header-popover-wrap"><button className="language" aria-expanded={languageOpen} onClick={() => { setLanguageOpen(!languageOpen); setProfileOpen(false) }}><Globe2 size={16} /> {language} <ChevronDown size={14} /></button>{languageOpen && <div className="header-popover language-popover"><button onClick={() => { setLanguage('VI'); setLanguageOpen(false) }}>Tiếng Việt {language === 'VI' && <Check size={14} />}</button><button onClick={() => { setLanguage('EN'); setLanguageOpen(false) }}>English {language === 'EN' && <Check size={14} />}</button></div>}</div>
            <button className="header-icon-button cart-button" aria-label={`Giỏ đặt phòng, ${cart.length} khách sạn`} onClick={() => { setCartOpen(true); setProfileOpen(false) }}><ShoppingBag size={19} /><span>Giỏ đặt phòng</span>{cart.length > 0 && <b className="cart-count">{cart.length}</b>}</button>
            <div className="header-popover-wrap profile-wrap"><button className="profile-button" aria-label="Tài khoản khách" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setLanguageOpen(false) }}><UserRound size={17} /><span>Tài khoản</span><ChevronDown size={13} /></button>{profileOpen && <div className="header-popover profile-popover"><div className="profile-summary"><span className="avatar">K</span><span><strong>Khách VP - OTA</strong><small>Trải nghiệm đặt phòng demo</small></span></div><button onClick={() => { setProfileOpen(false); setHistoryOpen(true) }}>Đơn đặt phòng của tôi <ArrowRight size={14} /></button><button onClick={() => { setProfileOpen(false); setCartOpen(true) }}>Giỏ đặt phòng <ShoppingBag size={14} /></button><button onClick={() => { setProfileOpen(false); setWalletOpen(true) }}>Ví của tôi <Wallet size={15} /></button></div>}</div>
          </div>
          <button className="mobile-menu" aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><span /><span /><span /></button>
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
        <div className="section-intro hotel-section-heading"><div><span className="search-kicker">CHỌN NƠI NGHỈ DƯỠNG</span><h2>{searched && destination ? `Khách sạn tại ${destination}` : 'Những kỳ nghỉ được yêu thích'}</h2></div><span className="hotel-count">{availableHotels.length} khách sạn gợi ý</span></div>
        <div className="hotel-list">{availableHotels.length ? availableHotels.map((hotel) => <article className="hotel-card" key={hotel.id}><button type="button" className="hotel-card-details-trigger" aria-label={`Xem chi tiết ${hotel.name}`} onClick={() => setSelectedHotel(hotel)}><span className="hotel-photo" style={{ backgroundImage: `url('${hotel.image}')` }}><span>{hotel.tag}</span></span><span className="hotel-details"><span className="hotel-location"><MapPin size={13} /> {hotel.city}</span><strong className="hotel-name">{hotel.name}</strong><span className="hotel-description">{hotel.detail}</span><span className="hotel-rating"><span><Star size={13} fill="currentColor" /> {hotel.rating}</span> Tuyệt vời · {hotel.reviews} đánh giá</span><span className="hotel-detail-link">Xem chi tiết</span></span></button><div className="hotel-price"><span className="price-note">Giá mỗi đêm từ</span><strong>{formatPrice(hotel.price)} <small>₫</small></strong><span className="price-total">Giá phòng tính theo 1 đêm</span><div className="hotel-actions"><button className="add-cart-button" aria-label={`Thêm ${hotel.name} vào giỏ`} onClick={() => addToCart(hotel)}>{cart.some((item) => item.id === hotel.id) ? <Check size={16} /> : <ShoppingBag size={16} />}</button><button className="book-button" onClick={() => startBooking(hotel)}>Đặt phòng <ArrowRight size={15} /></button></div></div></article>) : <div className="no-results"><BedDouble size={24} /><strong>Chưa có chỗ nghỉ trong danh sách demo</strong><span>Thử Đà Nẵng, Phú Quốc hoặc Đà Lạt nhé.</span></div>}</div>
      </section>
      {selectedHotel && <div className="overlay hotel-detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedHotel(null) }}><section className="hotel-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="hotel-detail-title"><button className="close-button hotel-detail-close" aria-label="Đóng chi tiết khách sạn" onClick={() => setSelectedHotel(null)}><X size={19} /></button><div className="hotel-detail-image" style={{ backgroundImage: `url('${selectedHotel.image}')` }}><span>{selectedHotel.tag}</span></div><div className="hotel-detail-content"><span className="hotel-location"><MapPin size={14} /> {selectedHotel.city}</span><h2 id="hotel-detail-title">{selectedHotel.name}</h2><p>{selectedHotel.detail}</p><div className="hotel-rating"><span><Star size={13} fill="currentColor" /> {selectedHotel.rating}</span> Tuyệt vời · {selectedHotel.reviews} đánh giá</div><div className="hotel-detail-facts"><span><CalendarDays size={16} /> {formatDate(checkIn)} – {formatDate(checkOut)} · {nights} đêm</span><span><Users size={16} /> {guests} khách · {rooms} phòng</span></div><div className="hotel-detail-price"><span>Giá phòng · 1 đêm</span><strong>{formatPrice(selectedHotel.price)} ₫</strong></div><div className="hotel-detail-actions"><button className="add-cart-button" aria-label={`Thêm ${selectedHotel.name} vào giỏ`} onClick={() => addToCart(selectedHotel)}>{cart.some((item) => item.id === selectedHotel.id) ? <Check size={16} /> : <ShoppingBag size={16} />} Thêm vào giỏ</button><button className="book-button" onClick={() => { startBooking(selectedHotel); setSelectedHotel(null) }}>Đặt phòng <ArrowRight size={15} /></button></div></div></section></div>}
      {searched && <div className="results-notice" role="status"><BedDouble size={18} /><span>Đang tìm chỗ nghỉ tại <strong>{destination || 'mọi điểm đến'}</strong> · {formatDate(checkIn)} – {formatDate(checkOut)} · {guests} khách, {rooms} phòng</span><button onClick={() => setSearched(false)} aria-label="Đóng"><X size={16} /></button></div>}
      <footer className="footer"><div className="footer-main"><div className="footer-about"><a className="brand footer-brand" href="#home"><span className="brand-mark">✳</span><span>VP - OTA</span></a><p>Chọn đúng nơi ở, trọn vẹn kỳ nghỉ.</p></div><div className="footer-column"><strong>Khám phá</strong><a href="#search">Tìm khách sạn</a><a href="#destinations">Điểm đến yêu thích</a><a href="#hotels">Ưu đãi lưu trú</a></div><div className="footer-column"><strong>Hỗ trợ khách hàng</strong><a href="#booking">Hướng dẫn đặt phòng</a><a href="#booking">Thanh toán & xác nhận</a><a href="mailto:hello@VP - OTA.example">Liên hệ hỗ trợ</a></div><div className="footer-contact"><strong>Đồng hành cùng chuyến đi</strong><span>Hỗ trợ mỗi ngày · 08:00 – 22:00</span><a href="tel:19001234">1900 1234</a></div></div><div className="footer-bottom"><span>© 2026 VP - OTA. Bản demo phục vụ giới thiệu/kiểm thử — không phát sinh giao dịch thật.</span></div></footer>
      <button className="back-to-top" aria-label="Quay lại đầu trang" title="Quay lại đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={19} /></button>
      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div className="panel-heading"><div><span className="search-kicker">CHUYẾN ĐI CỦA BẠN</span><h2 id="cart-title">Giỏ đặt phòng <span className="panel-count">{cart.length}</span></h2></div><button className="close-button" aria-label="Đóng giỏ hàng" onClick={() => setCartOpen(false)}><X size={19} /></button></div>{cart.length ? <><div className="cart-items">{cart.map((hotel) => <article className="cart-item" key={hotel.id}><div className="cart-thumb" style={{ backgroundImage: `url('${hotel.image}')` }} /><div className="cart-item-copy"><strong>{hotel.name}</strong><span>{hotel.city} · 1 đêm</span><b>{formatPrice(hotel.price)} ₫</b></div><button aria-label={`Xóa ${hotel.name}`} onClick={() => setCart((items) => items.filter((item) => item.id !== hotel.id))}><X size={16} /></button></article>)}</div><div className="cart-summary"><span>Tạm tính · 1 đêm</span><strong>{formatPrice(cart.reduce((sum, item) => sum + item.price, 0))} ₫</strong></div><button className="panel-primary" onClick={() => { startBooking(cart[0]); setCartOpen(false) }}>Tiếp tục đặt phòng <ArrowRight size={16} /></button><p className="demo-disclaimer">Đây là giao diện demo. Chưa có giao dịch thanh toán thật.</p></> : <div className="empty-cart"><ShoppingBag size={32} /><strong>Giỏ đặt phòng đang trống</strong><span>Thêm khách sạn bạn thích để xem lại tại đây.</span><button onClick={() => { setCartOpen(false); document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth' }) }}>Khám phá khách sạn</button></div>}</section></div>}
      {historyOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false) }}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="history-title"><div className="panel-heading"><div><span className="search-kicker">TÀI KHOẢN DEMO</span><h2 id="history-title">Đơn đặt phòng</h2></div><button className="close-button" aria-label="Đóng lịch sử đặt phòng" onClick={() => setHistoryOpen(false)}><X size={19} /></button></div>{bookingHistory.length ? <div className="cart-items">{bookingHistory.map(({ hotel, code }) => <article className="history-card" key={code}><div className="cart-thumb" style={{ backgroundImage: `url('${hotel.image}')` }} /><div className="cart-item-copy"><strong>{hotel.name}</strong><span>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} đêm</span><b>Mã demo: {code}</b><small>Đã xác nhận · Chưa phát sinh giao dịch</small></div></article>)}</div> : <div className="empty-cart"><BedDouble size={32} /><strong>Bạn chưa có đơn đặt phòng</strong><span>Các lượt đặt phòng demo đã xác nhận sẽ xuất hiện ở đây.</span><button onClick={() => { setHistoryOpen(false); document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth' }) }}>Tìm khách sạn</button></div>}</section></div>}
      {walletOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setWalletOpen(false) }}><section className="side-panel" role="dialog" aria-modal="true" aria-labelledby="wallet-title"><div className="panel-heading"><div><span className="search-kicker">TÀI KHOẢN DEMO</span><h2 id="wallet-title">Ví của tôi</h2></div><button className="close-button" aria-label="Đóng ví" onClick={() => setWalletOpen(false)}><X size={19} /></button></div><div className="wallet-card"><Wallet size={22} /><span>Số dư ví</span><strong>{formatPrice(walletBalance)} ₫</strong><small>Số dư ví demo</small></div><div className="wallet-topup"><strong>Nạp tiền demo</strong><label htmlFor="wallet-topup-amount">Nhập số tiền muốn nạp</label><div className="wallet-amount-input"><input id="wallet-topup-amount" type="number" inputMode="numeric" min="10000" step="10000" placeholder="Tối thiểu 10.000 ₫" value={topUpAmount || ''} onChange={(event) => setTopUpAmount(Number(event.target.value))} /><span>₫</span></div><small className="wallet-input-hint">Số tiền nạp tối thiểu 10.000 ₫</small><div className="wallet-suggestions" aria-label="Mức tiền đề xuất">{[500000, 1000000, 2000000, 5000000, 10000000].map((amount) => <button type="button" className={topUpAmount === amount ? 'selected' : ''} key={amount} onClick={() => setTopUpAmount(amount)}>{formatPrice(amount)} ₫</button>)}</div><button className="panel-primary" disabled={!Number.isSafeInteger(topUpAmount) || topUpAmount < 10000} onClick={topUpWallet}>Nạp {topUpAmount >= 10000 ? `${formatPrice(topUpAmount)} ₫` : 'vào ví'} <ArrowRight size={16} /></button></div><div className="wallet-transactions"><h3>Lịch sử giao dịch</h3>{walletTransactions.length ? walletTransactions.map((transaction) => <article className="wallet-transaction" key={transaction.id}><span className={transaction.amount > 0 ? 'wallet-transaction-icon incoming' : 'wallet-transaction-icon'}>{transaction.amount > 0 ? <Plus size={15} /> : <CreditCard size={15} />}</span><span className="wallet-transaction-info"><strong>{transaction.description}</strong><small>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(transaction.createdAt))}</small></span><b className={transaction.amount > 0 ? 'incoming' : ''}>{transaction.amount > 0 ? '+' : ''}{formatPrice(transaction.amount)} ₫</b></article>) : <p className="wallet-empty-history">Chưa có giao dịch. Nạp demo để thử luồng thanh toán.</p>}</div><p className="demo-disclaimer">Ví và giao dịch chỉ dùng để mô phỏng; không phát sinh thanh toán thật.</p></section></div>}
      {booking && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setBooking(null) }}><section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="panel-heading"><div><span className="search-kicker">{bookingComplete ? 'ĐẶT PHÒNG THÀNH CÔNG' : 'HOÀN TẤT ĐẶT PHÒNG'}</span><h2 id="booking-title">{bookingComplete ? 'Kỳ nghỉ đã sẵn sàng' : 'Xác nhận & thanh toán'}</h2></div><button className="close-button" aria-label="Đóng cửa sổ đặt phòng" onClick={() => setBooking(null)}><X size={19} /></button></div>{bookingComplete ? <div className="booking-success"><span className="success-mark"><Check size={30} /></span><h3>Đã thanh toán thành công!</h3><p>Mã đặt phòng demo của bạn</p><strong className="booking-code">{bookingCode}</strong><div className="success-summary"><span>{booking.name}</span><span>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} đêm</span></div><p className="demo-disclaimer">Đây là giao dịch minh họa; chưa tạo đặt phòng hoặc thu tiền thật.</p><button className="panel-primary" onClick={() => setBooking(null)}>Hoàn tất</button></div> : <><div className="booking-hotel-summary"><div className="booking-thumb" style={{ backgroundImage: `url('${booking.image}')` }} /><div><strong>{booking.name}</strong><span>{booking.city} · {guests} khách · {rooms} phòng</span><span>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} đêm</span></div></div><div className="booking-total"><span>Giá phòng · 1 đêm</span><strong>{formatPrice(booking.price)} ₫</strong></div>{bookingError && <p className="booking-error" role="alert">{bookingError} <button onClick={() => { setBooking(null); setWalletOpen(true) }}>Nạp ví</button></p>}<p className="demo-disclaimer">Thanh toán bằng ví demo · Số dư hiện tại {formatPrice(walletBalance)} ₫</p><button className="panel-primary" onClick={finishBooking}>Thanh toán <ArrowRight size={16} /></button></>}</section></div>}
    </main>
  )
}
