import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthLayout } from './components/auth/AuthLayout.jsx'
import { APP_AUDIENCE } from './config/app.js'
import AuthPage from './features/auth/AuthPage.jsx'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx'
import SetPasswordModal from './features/auth/components/SetPasswordModal.jsx'
import UserInfoPage from './features/auth/components/AdminAccountPage.jsx'
import { getMe, logout } from './features/auth/services/authApi.js'
import { isAuthSession, readSession, sessionData, writeSession } from './features/auth/services/sessionStore.js'
import { CatalogView } from './features/admin/components/CatalogView.jsx'
import { DirectionsView } from './features/admin/components/DirectionsView.jsx'
import { GrammarArticlesView } from './features/admin/components/GrammarArticlesView.jsx'
import { ListeningItemsView } from './features/admin/components/ListeningItemsView.jsx'
import { MediaSlotsView } from './features/admin/components/MediaSlotsView.jsx'
import { PlacementView } from './features/admin/components/PlacementView.jsx'
import { ReportsView } from './features/admin/components/ReportsView.jsx'
import { UsersView } from './features/admin/components/UsersView.jsx'
import { VipView } from './features/admin/components/VipView.jsx'
import { AdminLayout } from './features/exams/components/AdminLayout.jsx'
import { DashboardView } from './features/exams/components/DashboardView.jsx'
import { ExamManagementView } from './features/exams/components/ExamManagementView.jsx'
import { ExamUploadView } from './features/exams/components/ExamUploadView.jsx'
import { getClientSession, onSessionExpired, onSessionRefreshed, setClientSession } from './lib/apiClient.js'
import { pathForView, viewForPath } from './routes/adminRoutes.js'

function loadSavedSession() {
  try { return readSession(window.localStorage) } catch { return null }
}

function RoutedExamUpload({ session, onDirtyChange, onNavigateToExams }) {
  const { examId } = useParams()
  return <ExamUploadView key={examId || 'new'} session={session} examId={examId} onDirtyChange={onDirtyChange} onNavigateToExams={onNavigateToExams} />
}

export default function App() {
  const routerNavigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(loadSavedSession)
  const [restoring, setRestoring] = useState(!!session)
  const [editorDirty, setEditorDirty] = useState(false)
  const [notice, setNotice] = useState(null)
  const [passwordModal, setPasswordModal] = useState(false)
  const routeBlocker = useBlocker(editorDirty)

  useEffect(() => {
    if (routeBlocker.state !== 'blocked') return
    if (window.confirm('Đề thi còn thay đổi chưa lưu. Rời trình biên soạn?')) {
      window.setTimeout(() => {
        setEditorDirty(false)
        routeBlocker.proceed()
      }, 0)
    } else {
      routeBlocker.reset()
    }
  }, [routeBlocker])

  function persist(next) {
    setClientSession(next)
    let saved = false
    try { saved = writeSession(window.localStorage, next) } catch { /* In-memory fallback */ }
    if (!saved && next) setNotice('Trình duyệt không cho lưu phiên. Phiên đăng nhập hiện tại chỉ được giữ đến khi tải lại trang.')
  }

  const handleLogout = useCallback(() => {
    setSession((current) => {
      if (current?.refreshToken) void logout(current.refreshToken).catch(() => {})
      return null
    })
    persist(null)
    setPasswordModal(false)
    setEditorDirty(false)
    routerNavigate('/login', { replace: true })
    window.google?.accounts?.id?.disableAutoSelect?.()
  }, [routerNavigate])

  useEffect(() => {
    const saved = loadSavedSession()
    if (!saved) return
    let active = true
    async function restore() {
      try {
        const user = await getMe(saved.accessToken)
        if (!active) return
        const next = sessionData({ ...(getClientSession() || saved), user })
        if (!isAuthSession(next)) throw new Error('Tài khoản không có quyền truy cập khu vực này.')
        setSession(next)
        persist(next)
        setPasswordModal(next.pendingPasswordPrompt)
        setRestoring(false)
      } catch (error) {
        if (!active) return
        setSession(null)
        persist(null)
        setRestoring(false)
        setNotice(error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : error.message)
        routerNavigate('/login', { replace: true })
      }
    }
    void restore()
    return () => { active = false }
  }, [routerNavigate])

  useEffect(() => {
    const unsubRefresh = onSessionRefreshed((updated) => {
      setSession((previous) => {
        if (!previous) return previous
        const next = sessionData({ ...previous, ...updated })
        persist(next)
        return next
      })
    })
    const unsubExpired = onSessionExpired(() => {
      handleLogout()
      setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    })
    return () => { unsubRefresh(); unsubExpired() }
  }, [handleLogout])

  useEffect(() => {
    if (!editorDirty) return undefined
    const warnBeforeUnload = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [editorDirty])

  function handleAuthSuccess(result, { provider } = {}) {
    if (!isAuthSession(result)) return
    const next = sessionData({ ...result, pendingPasswordPrompt: provider === 'google' && result.user.hasPassword === false })
    setNotice(null)
    setSession(next)
    persist(next)
    setPasswordModal(next.pendingPasswordPrompt)
    routerNavigate('/account', { replace: true })
  }

  function updateUser(user) {
    const next = sessionData({ ...session, user, pendingPasswordPrompt: false })
    if (!isAuthSession(next)) return handleLogout()
    setSession(next)
    persist(next)
  }

  function updateSession(refreshedSession) {
    const next = sessionData({ ...session, ...refreshedSession })
    if (!isAuthSession(next)) return handleLogout()
    setSession(next)
    persist(next)
  }

  function skipPassword() {
    setPasswordModal(false)
    const next = { ...session, pendingPasswordPrompt: false }
    setSession(next)
    persist(next)
  }

  function navigateToView(nextView, exam = null) {
    if (editorDirty && !window.confirm('Đề thi còn thay đổi chưa lưu. Rời trình biên soạn?')) return
    setEditorDirty(false)
    routerNavigate(pathForView(nextView, exam?.examId))
  }

  if (restoring) return <AuthLayout variant={APP_AUDIENCE}><p role="status" style={{ textAlign: 'center', padding: '40px' }}>Đang kiểm tra phiên đăng nhập…</p></AuthLayout>

  if (!session) {
    return (
      <AuthLayout variant={APP_AUDIENCE}>
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <Routes>
          <Route path="/login" element={<AuthPage onForgotPassword={() => routerNavigate('/forgot-password')} onAuthSuccess={handleAuthSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage onBack={() => routerNavigate('/login')} />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
        </Routes>
      </AuthLayout>
    )
  }

  return (
    <>
      <AdminLayout session={session} activeView={viewForPath(location.pathname)} onNavigate={navigateToView} onLogout={handleLogout}>
        {notice && <div className="admin-notice" role="status">{notice}</div>}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/account" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/account" replace />} />
          <Route path="/dashboard" element={<DashboardView session={session} onNavigate={navigateToView} />} />
          <Route path="/exams" element={<ExamManagementView session={session} onEditExamDirectly={(exam) => navigateToView('upload', exam)} onUploadNewExam={() => navigateToView('upload')} />} />
          <Route path="/exams/new" element={<RoutedExamUpload session={session} onDirtyChange={setEditorDirty} onNavigateToExams={() => navigateToView('exams')} />} />
          <Route path="/exams/:examId/edit" element={<RoutedExamUpload session={session} onDirtyChange={setEditorDirty} onNavigateToExams={() => navigateToView('exams')} />} />
          <Route path="/directions" element={<DirectionsView session={session} />} />
          <Route path="/media" element={<MediaSlotsView session={session} />} />
          <Route path="/catalog" element={<CatalogView session={session} />} />
          <Route path="/placement-tests" element={<PlacementView session={session} />} />
          <Route path="/grammar" element={<GrammarArticlesView session={session} />} />
          <Route path="/listening" element={<ListeningItemsView session={session} />} />
          <Route path="/users" element={<UsersView session={session} />} />
          <Route path="/vip" element={<VipView session={session} />} />
          <Route path="/stats" element={<Navigate to="/dashboard" replace />} />
          <Route path="/reports" element={<ReportsView session={session} />} />
          <Route path="/account" element={<UserInfoPage session={session} onLogout={handleLogout} onUpdateUser={updateUser} onUpdateSession={updateSession} onSetPassword={() => setPasswordModal(true)} onSessionExpired={() => { handleLogout(); setNotice('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.') }} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminLayout>

      {passwordModal && session?.accessToken && <SetPasswordModal accessToken={session.accessToken} initialStep={session.pendingPasswordPrompt ? 'prompt' : 'form'} onClose={skipPassword} onSuccess={(user) => { updateUser(user || { ...session.user, hasPassword: true }); setPasswordModal(false); setNotice('Thiết lập mật khẩu thành công. Bạn có thể đăng nhập bằng Google hoặc email và mật khẩu.') }} onSessionExpired={() => { handleLogout(); setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') }} />}
    </>
  )
}
