import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { formatDate } from '../../../lib/format.js'
import { changePassword, login, updateProfile } from '../services/authApi.js'
import { mapApiFieldErrors, validateChangePassword, validateProfile } from '../validation.js'

// Trang Tài khoản: người dùng tự xem và tự sửa thông tin của mình (tên hiển thị, mật khẩu).
// Không hiển thị dữ liệu kỹ thuật (JSON UserDto, hạn token). Quản trị viên không có API sửa hồ sơ người khác.

function Field({ id, label, error, hint, ...input }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...input} />
      {hint && <p className="muted small" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="form-error" id={`${id}-error`}>{error}</p>}
    </div>
  )
}

function useSubmitLock() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  async function run(task) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try { await task() } finally { lock.current = false; setBusy(false) }
  }
  return [busy, run]
}

function focusFirstError(form, errors) {
  const first = Object.keys(errors)[0]
  if (first) form?.querySelector(`[name="${first}"]`)?.focus()
}

function ProfileForm({ user, accessToken, onSaved, onSessionExpired }) {
  const id = useId()
  const form = useRef(null)
  const [username, setUsername] = useState(user.username || '')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, run] = useSubmitLock()
  const unchanged = username.trim() === (user.username || '')

  function submit(event) {
    event.preventDefault()
    const invalid = validateProfile({ username })
    setErrors(invalid)
    setMessage(null)
    if (Object.keys(invalid).length) { focusFirstError(form.current, invalid); return }
    if (unchanged) return
    run(async () => {
      try {
        const saved = await updateProfile({ username }, accessToken)
        setUsername(saved.username)
        onSaved(saved)
        setMessage({ kind: 'success', text: 'Đã lưu tên hiển thị.' })
      } catch (error) {
        if (error.status === 401) { onSessionExpired(); return }
        const fieldErrors = mapApiFieldErrors(error)
        if (error.code === 'USERNAME_REQUIRED' || error.code === 'USERNAME_TOO_LONG') fieldErrors.username = error.message
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: error.message })
      }
    })
  }

  return (
    <form ref={form} className="account-form" onSubmit={submit} noValidate>
      <Field id={`${id}-username`} name="username" label="Tên hiển thị" autoComplete="nickname" maxLength={100} value={username} error={errors.username}
        hint="Hiện ở lời chào và menu tài khoản. Tối đa 100 ký tự."
        onChange={(event) => { setUsername(event.target.value); setErrors({}); setMessage(null) }} />
      {message && <p className="form-notice" data-kind={message.kind} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || unchanged}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>
  )
}

const EMPTY_PASSWORDS = { oldPassword: '', newPassword: '', confirmNewPassword: '' }

function PasswordForm({ user, accessToken, onChanged, onReloginFailed, onSessionExpired }) {
  const id = useId()
  const form = useRef(null)
  const [values, setValues] = useState(EMPTY_PASSWORDS)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, run] = useSubmitLock()
  const change = (key) => (event) => { setValues((v) => ({ ...v, [key]: event.target.value })); setErrors((e) => ({ ...e, [key]: undefined })); setMessage(null) }

  function submit(event) {
    event.preventDefault()
    const invalid = validateChangePassword(values)
    setErrors(invalid)
    setMessage(null)
    if (Object.keys(invalid).length) { focusFirstError(form.current, invalid); return }
    run(async () => {
      try {
        await changePassword(values, accessToken)
      } catch (error) {
        if (error.code === 'INVALID_OLD_PASSWORD') { setErrors({ oldPassword: 'Mật khẩu hiện tại không đúng.' }); form.current?.querySelector('[name="oldPassword"]')?.focus(); return }
        if (error.status === 401) { onSessionExpired(); return }
        const fieldErrors = mapApiFieldErrors(error)
        if (error.code === 'SAME_AS_OLD_PASSWORD') fieldErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
        setErrors(fieldErrors)
        setMessage({ kind: 'error', text: error.message })
        return
      }
      // Backend đăng xuất mọi phiên sau khi đổi mật khẩu: đăng nhập lại bằng mật khẩu mới để giữ phiên trên thiết bị này.
      const newPassword = values.newPassword
      setValues(EMPTY_PASSWORDS)
      try {
        onChanged(await login({ email: user.email, password: newPassword }))
        setMessage({ kind: 'success', text: 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.' })
      } catch {
        onReloginFailed('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.')
      }
    })
  }

  return (
    <form ref={form} className="account-form" onSubmit={submit} noValidate>
      <input type="text" name="email" autoComplete="username" value={user.email} readOnly hidden />
      <Field id={`${id}-old`} name="oldPassword" type="password" label="Mật khẩu hiện tại" autoComplete="current-password" value={values.oldPassword} error={errors.oldPassword} onChange={change('oldPassword')} />
      <Field id={`${id}-new`} name="newPassword" type="password" label="Mật khẩu mới" autoComplete="new-password" value={values.newPassword} error={errors.newPassword} hint="Ít nhất 6 ký tự." onChange={change('newPassword')} />
      <Field id={`${id}-confirm`} name="confirmNewPassword" type="password" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={values.confirmNewPassword} error={errors.confirmNewPassword} onChange={change('confirmNewPassword')} />
      {message && <p className="form-notice" data-kind={message.kind} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
    </form>
  )
}

export default function UserInfoPage({ session, onLogout, onUpdateUser, onReplaceSession, onSetPassword, onSessionExpired }) {
  const { user, accessToken } = session
  const isAdmin = user.role === 'ADMIN'
  const facts = [
    ['Email đăng nhập', user.email],
    ['Ngày tham gia', user.createdAt ? formatDate(user.createdAt) : 'Chưa có thông tin'],
    ['Gói học', isAdmin ? 'Quản trị viên (đủ quyền VIP)' : user.isVip ? `VIP${user.vipExpiresAt ? ` đến ${formatDate(user.vipExpiresAt)}` : ''}` : 'Miễn phí'],
    ['Cách đăng nhập', user.hasPassword ? 'Email và mật khẩu (có thể dùng Google nếu đã liên kết)' : 'Google'],
  ]

  return (
    <div className="stack account-page">
      <header className="account-head">
        <p className="eyebrow">Tài khoản</p>
        <h1 id="user-info-title" className="page-title" tabIndex={-1}>Thông tin tài khoản</h1>
        <p className="muted">Chỉ bạn mới chỉnh sửa được thông tin cá nhân của mình; quản trị viên không thay đổi được các thông tin này.</p>
      </header>

      <div className="account-grid">
        <section className="card account-card" aria-labelledby="account-profile-title">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">{(user.username || user.email || '?').trim().charAt(0).toUpperCase()}</span>
            <div className="account-identity-text">
              <h2 id="account-profile-title" className="account-name">{user.username || 'Chưa đặt tên'}</h2>
              <p className="muted account-email">{user.email}</p>
              <div className="tag-row">
                <Pill tone={isAdmin ? 'accent' : 'muted'}>{isAdmin ? 'Quản trị viên' : 'Học viên'}</Pill>
                {!isAdmin && user.isVip && <Pill tone="accent"><Icon name="star" size={12} />VIP</Pill>}
              </div>
            </div>
          </div>
          <dl className="account-facts">
            {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <h3 className="account-section-title">Sửa hồ sơ</h3>
          <ProfileForm user={user} accessToken={accessToken} onSaved={onUpdateUser} onSessionExpired={onSessionExpired} />
          <p className="muted small">Email là tên đăng nhập (gắn với tài khoản Google) nên không đổi được tại đây.</p>
        </section>

        <div className="account-side">
          <section className="card account-card" aria-labelledby="account-security-title">
            <h2 id="account-security-title" className="card-title">Mật khẩu và bảo mật</h2>
            {user.hasPassword
              ? <PasswordForm user={user} accessToken={accessToken} onChanged={onReplaceSession} onReloginFailed={onLogout} onSessionExpired={onSessionExpired} />
              : (
                <div className="account-form">
                  <p className="muted">Tài khoản đang đăng nhập bằng Google. Tạo mật khẩu để đăng nhập được bằng email và mật khẩu.</p>
                  <button type="button" className="btn btn-primary" onClick={onSetPassword}>Tạo mật khẩu</button>
                </div>
              )}
          </section>
          {!isAdmin && (
            <section className="card account-card">
              <h2 className="card-title">Mục tiêu học tập</h2>
              <p className="muted">Điểm mục tiêu, ngày thi và số phút học mỗi ngày được chỉnh ở trang Lộ trình.</p>
              <Link className="btn btn-outline" to="/plan"><Icon name="target" size={16} />Mở Lộ trình</Link>
            </section>
          )}
          <section className="card account-card">
            <h2 className="card-title">Đăng xuất</h2>
            <p className="muted">Đăng xuất khi dùng xong, nhất là trên máy dùng chung.</p>
            <button type="button" className="btn btn-ghost-danger account-logout" onClick={() => onLogout()}><Icon name="log-out" size={16} />Đăng xuất</button>
          </section>
        </div>
      </div>
    </div>
  )
}
