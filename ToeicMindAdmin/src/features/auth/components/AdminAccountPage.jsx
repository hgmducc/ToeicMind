import { useId, useRef, useState } from 'react'
import { changePassword, login, updateProfile } from '../services/authApi.js'
import { mapApiFieldErrors, validateChangePassword, validateProfile } from '../validation.js'
import { Icon } from '../../../components/ui/Icon.jsx'

// Tài khoản quản trị của chính mình: xem và tự sửa tên hiển thị, đổi mật khẩu.
// Không hiển thị dữ liệu kỹ thuật (JSON UserDto, hạn token). Admin không có chức năng sửa hồ sơ của người dùng khác.

const dateLabel = (value) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có thông tin'

function Field({ id, label, error, hint, ...input }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...input} />
      {hint && <p className="muted account-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="account-error" id={`${id}-error`}>{error}</p>}
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

const focusFirst = (form, errors) => { const key = Object.keys(errors)[0]; if (key) form?.querySelector(`[name="${key}"]`)?.focus() }

function ProfileForm({ user, accessToken, onSaved, onSessionExpired }) {
  const id = useId()
  const form = useRef(null)
  const [username, setUsername] = useState(user.username || '')
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [busy, run] = useSubmitLock()
  const unchanged = username.trim() === (user.username || '')

  function submit(event) {
    event.preventDefault()
    const invalid = validateProfile({ username })
    setErrors(invalid)
    setNotice(null)
    if (Object.keys(invalid).length) { focusFirst(form.current, invalid); return }
    if (unchanged) return
    run(async () => {
      try {
        const saved = await updateProfile({ username }, accessToken)
        if (saved.role !== 'ADMIN') { onSessionExpired(); return }
        setUsername(saved.username)
        onSaved(saved)
        setNotice({ kind: 'success', text: 'Đã lưu tên hiển thị.' })
      } catch (error) {
        if (error.status === 401) { onSessionExpired(); return }
        const fieldErrors = mapApiFieldErrors(error)
        if (error.code === 'USERNAME_REQUIRED' || error.code === 'USERNAME_TOO_LONG') fieldErrors.username = error.message
        setErrors(fieldErrors)
        setNotice({ kind: 'error', text: error.message })
      }
    })
  }

  return (
    <form ref={form} className="account-form" onSubmit={submit} noValidate>
      <Field id={`${id}-username`} name="username" label="Tên hiển thị" autoComplete="nickname" maxLength={100} value={username} error={errors.username}
        hint="Tối đa 100 ký tự." onChange={(event) => { setUsername(event.target.value); setErrors({}); setNotice(null) }} />
      {notice && <p className="admin-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || unchanged}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>
  )
}

const EMPTY = { oldPassword: '', newPassword: '', confirmNewPassword: '' }

function PasswordForm({ user, accessToken, onChanged, onReloginFailed, onSessionExpired }) {
  const id = useId()
  const form = useRef(null)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [busy, run] = useSubmitLock()
  const change = (key) => (event) => { setValues((v) => ({ ...v, [key]: event.target.value })); setErrors((e) => ({ ...e, [key]: undefined })); setNotice(null) }

  function submit(event) {
    event.preventDefault()
    const invalid = validateChangePassword(values)
    setErrors(invalid)
    setNotice(null)
    if (Object.keys(invalid).length) { focusFirst(form.current, invalid); return }
    run(async () => {
      try {
        await changePassword(values, accessToken)
      } catch (error) {
        if (error.code === 'INVALID_OLD_PASSWORD') { setErrors({ oldPassword: 'Mật khẩu hiện tại không đúng.' }); form.current?.querySelector('[name="oldPassword"]')?.focus(); return }
        if (error.status === 401) { onSessionExpired(); return }
        const fieldErrors = mapApiFieldErrors(error)
        if (error.code === 'SAME_AS_OLD_PASSWORD') fieldErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
        setErrors(fieldErrors)
        setNotice({ kind: 'error', text: error.message })
        return
      }
      // Backend đăng xuất mọi phiên sau khi đổi mật khẩu: đăng nhập lại bằng mật khẩu mới để giữ phiên hiện tại.
      const newPassword = values.newPassword
      setValues(EMPTY)
      try {
        onChanged(await login({ email: user.email, password: newPassword }))
        setNotice({ kind: 'success', text: 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.' })
      } catch {
        onReloginFailed()
      }
    })
  }

  return (
    <form ref={form} className="account-form" onSubmit={submit} noValidate>
      <input type="text" name="email" autoComplete="username" value={user.email} readOnly hidden />
      <Field id={`${id}-old`} name="oldPassword" type="password" label="Mật khẩu hiện tại" autoComplete="current-password" value={values.oldPassword} error={errors.oldPassword} onChange={change('oldPassword')} />
      <Field id={`${id}-new`} name="newPassword" type="password" label="Mật khẩu mới" autoComplete="new-password" hint="Ít nhất 6 ký tự." value={values.newPassword} error={errors.newPassword} onChange={change('newPassword')} />
      <Field id={`${id}-confirm`} name="confirmNewPassword" type="password" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={values.confirmNewPassword} error={errors.confirmNewPassword} onChange={change('confirmNewPassword')} />
      {notice && <p className="admin-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
    </form>
  )
}

export default function AdminAccountPage({ session, onLogout, onUpdateUser, onUpdateSession, onSetPassword, onSessionExpired }) {
  const { user, accessToken } = session
  const fields = [
    ['Địa chỉ email (tên đăng nhập)', user.email],
    ['Vai trò', 'Quản trị viên'],
    ['Trạng thái', user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status === 'LOCKED' ? 'Đã khóa' : user.status],
    ['Ngày tham gia', dateLabel(user.createdAt)],
  ]

  return (
    <section className="admin-account" aria-labelledby="user-info-title">
      <div className="admin-section-heading">
        <div><p className="eyebrow">TÀI KHOẢN</p><h2 id="user-info-title">Thông tin tài khoản</h2><p className="muted">Hồ sơ và mật khẩu của chính bạn. Thông tin cá nhân của người dùng khác chỉ do họ tự chỉnh sửa.</p></div>
      </div>
      <div className="account-grid">
        <section className="admin-card">
          <div className="account-identity"><div className="account-avatar" aria-hidden="true">{(user.username || 'A').charAt(0).toUpperCase()}</div><div><h3 className="account-name">{user.username || 'Quản trị viên'}</h3><p className="muted account-email">{user.email}</p><span className="status-badge" data-status="ADMIN">Quản trị viên</span></div></div>
          <dl className="account-details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có thông tin'}</dd></div>)}</dl>
          <h4 className="account-subtitle">Sửa hồ sơ</h4>
          <ProfileForm user={user} accessToken={accessToken} onSaved={onUpdateUser} onSessionExpired={onSessionExpired} />
          <p className="muted account-hint">Email là tên đăng nhập nên không đổi được tại đây.</p>
        </section>
        <section className="admin-card">
          <h3>Mật khẩu và bảo mật</h3>
          {user.hasPassword
            ? <PasswordForm user={user} accessToken={accessToken} onChanged={onUpdateSession} onReloginFailed={onLogout} onSessionExpired={onSessionExpired} />
            : <><p className="muted">Bạn đang đăng nhập bằng Google. Thiết lập mật khẩu dự phòng để có thể đăng nhập bằng email.</p><button type="button" className="btn btn-primary" onClick={onSetPassword}>Thiết lập mật khẩu</button></>}
          <div className="account-logout">
            <p className="muted">Đăng xuất khi bạn đã hoàn tất công việc, đặc biệt trên thiết bị dùng chung.</p>
            <button type="button" className="btn btn-danger" onClick={onLogout}><Icon name="log-out" size={16} />Đăng xuất</button>
          </div>
        </section>
      </div>
    </section>
  )
}
