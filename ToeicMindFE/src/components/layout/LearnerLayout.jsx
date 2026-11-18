import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useVipStatus } from '../../features/vip/useVipStatus.js'
import { onVipRequired } from '../../lib/learnerHttp.js'
import { NAV_ITEMS, isFocusRoute, navKeyForPath } from '../../routes/learnerRoutes.js'
import { Brand } from '../ui/Brand.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { Icon } from '../ui/Icon.jsx'

function planLabel(vip) {
  if (!vip) return null
  if (vip.isAdmin) return 'Quản trị viên'
  return vip.isVip ? `VIP · còn ${vip.daysLeft} ngày` : 'Tài khoản miễn phí'
}

function UserMenu({ user, vip, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const label = user.username || user.email || 'Tài khoản'

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="avatar" aria-hidden="true">{label.charAt(0).toUpperCase()}</span>
        <span className="user-button-name">{label}</span>
        {vip?.isVip && !vip.isAdmin && <span className="vip-tag" title={planLabel(vip)}><Icon name="star" size={11} />VIP</span>}
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <p className="menu-who">{user.email}</p>
          {vip && <p className="menu-plan" data-vip={vip.isVip}>{planLabel(vip)}</p>}
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)}><Icon name="user" size={16} />Tài khoản</Link>
          <Link role="menuitem" to="/reports" onClick={() => setOpen(false)}><Icon name="flag" size={16} />Báo lỗi của tôi</Link>
          {vip && !vip.isAdmin && <Link role="menuitem" to="/vip" onClick={() => setOpen(false)}><Icon name="star" size={16} />{vip.isVip ? 'Gia hạn VIP' : 'Nâng cấp VIP'}</Link>}
          <button type="button" role="menuitem" onClick={onLogout}><Icon name="log-out" size={16} />Đăng xuất</button>
        </div>
      )}
    </div>
  )
}

// Máy chủ trả 402 VIP_REQUIRED ở bất kỳ API nào → mời nâng cấp (một hộp thoại duy nhất).
function VipPrompt() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  useEffect(() => onVipRequired(() => setOpen(true)), [])
  if (!open) return null
  return (
    <Dialog title="Nội dung dành cho VIP" size="sm" onClose={() => setOpen(false)}>
      <p className="dialog-text">Nội dung này chỉ dành cho tài khoản VIP. Nâng cấp VIP để mở khóa đề thi, từ vựng, Nghe và Đọc của các bộ đề VIP.</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Để sau</button>
        <button type="button" className="btn btn-primary" onClick={() => { setOpen(false); navigate('/vip') }}><Icon name="star" size={16} />Nâng cấp VIP</button>
      </div>
    </Dialog>
  )
}

export function LearnerLayout({ session, onLogout, notice, onDismissNotice, children }) {
  const { pathname, key } = useLocation()
  const vip = useVipStatus(pathname.startsWith('/vip') ? key : 'static')   // tải lại khi vào các trang /vip (sau thanh toán)
  const active = navKeyForPath(pathname)
  const focus = isFocusRoute(pathname)

  // Đổi trang: cuộn lên đầu và đưa focus tới nội dung chính (quy chuẩn 2.0 mục 14.3) để bàn phím/trình đọc màn hình
  // nhận biết đã sang trang mới. Bỏ qua lần mở đầu tiên và khi đang có hộp thoại mở.
  const firstRender = useRef(true)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (firstRender.current) { firstRender.current = false; return }
    if (!document.querySelector('dialog[open]')) document.getElementById('learner-main')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="learner-shell" data-focus={focus}>
      <a className="skip-link" href="#learner-main">Đi đến nội dung</a>
      {!focus && (
        <header className="learner-topbar">
          <div className="learner-topbar-inner">
            <Link className="learner-brand" to="/" aria-label="ToeicMind — Trang chủ"><Brand /></Link>
            <nav className="learner-nav" aria-label="Menu chính">
              {NAV_ITEMS.map((item) => (
                <Link key={item.id} to={item.path} className="learner-nav-item" data-active={active === item.id} aria-current={active === item.id ? 'page' : undefined}>
                  <Icon name={item.icon} size={17} /><span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <UserMenu user={session.user} vip={vip} onLogout={onLogout} />
          </div>
        </header>
      )}
      <main id="learner-main" className="learner-main" tabIndex={-1}>
        {notice && (
          <div className="form-notice learner-notice" role="status">
            <div className="notice-content">{notice}</div>
            <button type="button" className="icon-btn" aria-label="Ẩn thông báo" onClick={onDismissNotice}><Icon name="x" size={16} /></button>
          </div>
        )}
        {children}
      </main>
      <VipPrompt />
    </div>
  )
}
