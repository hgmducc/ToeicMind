import { useRef, useState } from 'react'
import { getMe, refresh as refreshAuthToken } from '../services/authApi.js'
import { APP_AUDIENCE } from '../../../config/app.js'

function dateLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa có thông tin'
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export default function UserInfoPage({
  session,
  onLogout,
  onUpdateUser,
  onUpdateSession,
  onSetPassword,
  onSessionExpired,
}) {
  const { user, accessToken, registrationOnly } = session
  const [refreshing, setRefreshing] = useState(false)
  const [refreshingToken, setRefreshingToken] = useState(false)
  const [message, setMessage] = useState(null)
  const inFlight = useRef(false)

  async function refresh() {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    setMessage(null)
    try {
      const live = await getMe(accessToken)
      if (APP_AUDIENCE === 'admin' && live.role !== 'ADMIN') { onSessionExpired(); return }
      onUpdateUser(live)
      setMessage({ kind: 'success', text: 'Đã cập nhật thông tin từ máy chủ.' })
    } catch (error) {
      if (error.status === 401) { onSessionExpired(); return }
      setMessage({ kind: 'error', text: error.message })
    } finally { inFlight.current = false; setRefreshing(false) }
  }

  async function handleRefreshToken() {
    if (inFlight.current || !session?.refreshToken) return
    inFlight.current = true
    setRefreshingToken(true)
    setMessage(null)
    try {
      const refreshed = await refreshAuthToken(session.refreshToken)
      if (APP_AUDIENCE === 'admin' && refreshed.user?.role !== 'ADMIN') {
        onSessionExpired()
        return
      }
      if (onUpdateSession) {
        onUpdateSession(refreshed)
      } else if (onUpdateUser && refreshed.user) {
        onUpdateUser(refreshed.user)
      }
      setMessage({
        kind: 'success',
        text: `Đã làm mới token thành công! Access token mới có hiệu lực đến: ${dateLabel(refreshed.expiresAt)}.`,
      })
    } catch (error) {
      if (error.status === 401) {
        onSessionExpired()
        return
      }
      setMessage({ kind: 'error', text: error.message })
    } finally {
      inFlight.current = false
      setRefreshingToken(false)
    }
  }

  const fields = [
    ['Mã người dùng (userId)', user.userId], ['Tên hiển thị (username)', user.username],
    ['Địa chỉ email (email)', user.email], ['Vai trò (role)', user.role],
    ['Trạng thái (status)', user.status], ['Đã có mật khẩu (hasPassword)', String(user.hasPassword)],
    ['Ngày tạo (createdAt)', dateLabel(user.createdAt)],
  ]

  return (
    <section className="user-info-container" aria-labelledby="user-info-title">
      <div className="user-info-title-block">
        <p className="eyebrow">{registrationOnly ? 'ĐĂNG KÝ THÀNH CÔNG' : 'ĐĂNG NHẬP THÀNH CÔNG'}</p>
        <h1 id="user-info-title" className="user-info-title" tabIndex={-1}>Thông tin tài khoản</h1>
        <p className="user-info-subtitle">Trang kiểm thử thông tin người dùng sau đăng nhập hoặc đăng ký.</p>
      </div>
      {registrationOnly && <p className="form-notice" data-kind="success" role="status">Tài khoản đã được tạo. Hãy đăng nhập để kiểm thử các chức năng cần xác thực.</p>}
      {message && <p className="form-notice" data-kind={message.kind} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      <div className="user-info-card">
        <dl className="info-grid">
          {fields.map(([label, value]) => <div key={label} className="info-item"><dt className="info-label">{label}</dt><dd className="info-value">{value ?? 'Chưa có thông tin'}</dd></div>)}
        </dl>
      </div>
      <div className="user-info-card">
        <h2 className="card-heading">Dữ liệu người dùng (UserDto)</h2>
        <pre className="user-dto-json">{JSON.stringify(user, null, 2)}</pre>
      </div>
      {accessToken && user.hasPassword === false && (
        <div className="password-alert-card">
          <p>Chưa có mật khẩu. Tài khoản hiện chỉ đăng nhập bằng Google; bạn có thể thiết lập mật khẩu dự phòng tại đây.</p>
          <button type="button" className="submit-button" disabled={refreshing || refreshingToken} onClick={onSetPassword}>Thiết lập mật khẩu dự phòng</button>
        </div>
      )}
      {accessToken && <p className="user-info-subtitle">Phiên đã xác thực · Access token hết hạn: {dateLabel(session.expiresAt)} · Refresh token hết hạn: {dateLabel(session.refreshExpiresAt)}</p>}
      <div className="user-info-actions">
        {accessToken && session?.refreshToken && (
          <button
            type="button"
            className="action-btn action-btn--secondary"
            disabled={refreshing || refreshingToken}
            onClick={handleRefreshToken}
          >
            {refreshingToken ? 'Đang làm mới token…' : 'Làm mới Refresh Token'}
          </button>
        )}
        {accessToken && (
          <button
            type="button"
            className="action-btn action-btn--secondary"
            disabled={refreshing || refreshingToken}
            onClick={refresh}
          >
            {refreshing ? 'Đang tải…' : 'Làm mới thông tin'}
          </button>
        )}
        <button
          type="button"
          className="action-btn action-btn--danger"
          disabled={refreshing || refreshingToken}
          onClick={onLogout}
        >
          {registrationOnly ? 'Đến trang đăng nhập' : 'Đăng xuất'}
        </button>
      </div>
    </section>
  )
}
