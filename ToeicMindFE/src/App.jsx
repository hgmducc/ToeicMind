import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from './components/auth/AuthLayout.jsx'
import { LearnerLayout } from './components/layout/LearnerLayout.jsx'
import { APP_AUDIENCE } from './config/app.js'
import AuthPage from './features/auth/AuthPage.jsx'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import SetPasswordModal from './features/auth/components/SetPasswordModal.jsx'
import { getMe, logout } from './features/auth/services/authApi.js'
import { isAuthSession, readSession, sessionData, writeSession } from './features/auth/services/sessionStore.js'
import { getClientSession, onSessionExpired, onSessionRefreshed, setClientSession } from './lib/apiClient.js'
import LearnerRoutes from './routes/LearnerRoutes.jsx'

function loadSavedSession() {
  try { return readSession(window.localStorage) } catch { return null }
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(loadSavedSession)
  const [restoring, setRestoring] = useState(!!session)
  const [notice, setNotice] = useState(null)
  const [passwordModal, setPasswordModal] = useState(false)

  function persist(next) {
    setClientSession(next)
    let saved = false
    try { saved = writeSession(window.localStorage, next) } catch { /* Use in-memory state if storage is unavailable. */ }
    if (!saved && next) setNotice('Trình duyệt không cho lưu phiên. Phiên đăng nhập hiện tại chỉ được giữ đến khi tải lại trang.')
  }

  useEffect(() => {
    const saved = loadSavedSession()
    if (!saved) return undefined
    let active = true
    getMe(saved.accessToken).then((user) => {
      if (!active) return
      const next = sessionData({ ...(getClientSession() || saved), user })
      if (!isAuthSession(next)) throw new Error('Tài khoản không có quyền truy cập khu vực này.')
      setSession(next)
      persist(next)
      setPasswordModal(next.pendingPasswordPrompt)
      setRestoring(false)
    }).catch((error) => {
      if (!active) return
      setSession(null)
      persist(null)
      setRestoring(false)
      setNotice(error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : error.message)
      navigate('/login', { replace: true })
    })
    return () => { active = false }
    // Khôi phục phiên chỉ chạy một lần khi mở ứng dụng.
    // eslint-disable-next-line
  }, [])

  const handleLogout = useCallback((message) => {
    const refreshToken = getClientSession()?.refreshToken
    setSession(null)
    persist(null)
    setPasswordModal(false)
    setNotice(typeof message === 'string' ? message : null)
    navigate('/login', { replace: true })
    if (refreshToken) void logout(refreshToken).catch(() => {})
    window.google?.accounts?.id?.disableAutoSelect?.()
    // eslint-disable-next-line
  }, [navigate])

  useEffect(() => {
    const offRefresh = onSessionRefreshed((next) => setSession(next))
    const offExpired = onSessionExpired(() => {
      setSession(null)
      setPasswordModal(false)
      setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      navigate('/login', { replace: true })
    })
    return () => { offRefresh(); offExpired() }
  }, [navigate])

  function handleAuthSuccess(result, { provider, registered } = {}) {
    if (!isAuthSession(result)) return
    const next = sessionData({ ...result, pendingPasswordPrompt: provider === 'google' && result.user.hasPassword === false })
    setNotice(registered ? `Đăng ký thành công! Chào mừng ${result.user.username || 'bạn'} đến với ToeicMind.` : null)
    setSession(next)
    persist(next)
    setPasswordModal(next.pendingPasswordPrompt)
    // Việc chuyển tới trang định mở do route /login của khu vực đã đăng nhập đảm nhiệm (một cơ chế duy nhất, không tranh chấp).
  }

  function updateUser(user) {
    const next = sessionData({ ...session, user, pendingPasswordPrompt: false })
    if (!isAuthSession(next)) { handleLogout(); return }
    setSession(next)
    persist(next)
  }

  function skipPassword() {
    setPasswordModal(false)
    const next = { ...session, pendingPasswordPrompt: false }
    setSession(next)
    persist(next)
  }

  const expire = (message) => handleLogout(message)

  if (restoring) {
    return <AuthLayout variant={APP_AUDIENCE}><p role="status">Đang kiểm tra phiên đăng nhập…</p></AuthLayout>
  }

  if (!session) {
    return (
      <AuthLayout variant={APP_AUDIENCE}>
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <Routes>
          <Route path="/login" element={<AuthPage onForgotPassword={() => navigate('/forgot-password')} onAuthSuccess={handleAuthSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage onBack={() => navigate('/login')} />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />} />
        </Routes>
      </AuthLayout>
    )
  }

  return (
    <>
      <LearnerLayout session={session} onLogout={() => handleLogout()} notice={notice} onDismissNotice={() => setNotice(null)}>
        <LearnerRoutes
          session={session}
          onLogout={(message) => handleLogout(message)}
          onUpdateUser={updateUser}
          onReplaceSession={(result) => handleAuthSuccess(result)}
          onSetPassword={() => setPasswordModal(true)}
          onSessionExpired={() => expire('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.')}
        />
      </LearnerLayout>
      {passwordModal && session.accessToken && (
        <SetPasswordModal
          accessToken={session.accessToken}
          onClose={skipPassword}
          onSuccess={(user) => {
            updateUser(user || { ...session.user, hasPassword: true })
            setPasswordModal(false)
            setNotice('Thiết lập mật khẩu thành công. Bạn có thể đăng nhập bằng Google hoặc email và mật khẩu.')
          }}
          onSessionExpired={() => expire('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')}
        />
      )}
    </>
  )
}
