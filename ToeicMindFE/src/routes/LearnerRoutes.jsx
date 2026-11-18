import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loading } from '../components/ui/Feedback.jsx'
import UserInfoPage from '../features/auth/components/UserInfoPage.jsx'
import HomePage from '../features/home/HomePage.jsx'
import WelcomePage from '../features/plan/WelcomePage.jsx'
import { onboardingRedirect } from '../features/plan/planModel.js'
import { useProfileGate } from '../features/plan/useProfileGate.js'
import { safeReturnPath } from './learnerRoutes.js'

// Mỗi nhóm trang tải theo nhu cầu để bản đầu nhẹ; trang làm bài, nghe chép và từ vựng chỉ tải khi mở.
const TestsPage = lazy(() => import('../features/exams/TestsPage.jsx'))
const AttemptPage = lazy(() => import('../features/exams/AttemptPage.jsx'))
const ResultPage = lazy(() => import('../features/exams/ResultPage.jsx'))
const ReviewPage = lazy(() => import('../features/exams/ReviewPage.jsx'))
const HistoryPage = lazy(() => import('../features/exams/HistoryPage.jsx'))
const BankPage = lazy(() => import('../features/bank/BankPage.jsx'))
const DictationItemsPage = lazy(() => import('../features/dictation/DictationItemsPage.jsx'))
const DictationTrainerPage = lazy(() => import('../features/dictation/DictationTrainerPage.jsx'))
const VocabHomePage = lazy(() => import('../features/vocab/VocabHomePage.jsx'))
const VocabSetupPage = lazy(() => import('../features/vocab/VocabSetupPage.jsx'))
const VocabPlayPage = lazy(() => import('../features/vocab/VocabPlayPage.jsx'))
const VocabWordsPage = lazy(() => import('../features/vocab/VocabWordsPage.jsx'))
const MyVocabPage = lazy(() => import('../features/vocab/MyVocabPage.jsx'))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage.jsx'))
const GrammarTopicPage = lazy(() => import('../features/grammar/GrammarTopicPage.jsx'))
const VipPage = lazy(() => import('../features/vip/VipPage.jsx'))
const VipResultPage = lazy(() => import('../features/vip/VipResultPage.jsx'))
const PlanPage = lazy(() => import('../features/plan/PlanPage.jsx'))
const PlacementPage = lazy(() => import('../features/plan/PlacementPage.jsx'))

// Vừa đăng nhập xong vẫn đang ở /login: chuyển tới trang người dùng định mở (state.from) hoặc trang chủ.
function AfterLogin() {
  const { state } = useLocation()
  return <Navigate to={safeReturnPath(state?.from)} replace />
}

export default function LearnerRoutes({ session, onLogout, onUpdateUser, onReplaceSession, onSetPassword, onSessionExpired }) {
  // Tài khoản chưa đặt mục tiêu (mới đăng ký/đăng nhập lần đầu) phải thiết lập ở /welcome trước khi dùng các trang khác.
  const gate = useProfileGate(session.user?.userId)
  const location = useLocation()
  if (gate.status === 'loading') return <Loading label="Đang tải hồ sơ học tập…" />
  const redirect = onboardingRedirect(gate.status, location.pathname)
  if (redirect) {
    const from = location.pathname === '/login' ? location.state?.from : `${location.pathname}${location.search}`
    return <Navigate to={redirect} replace state={{ from }} />
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage session={session} />} />
        <Route path="/welcome" element={<WelcomePage session={session} required={gate.status === 'required'} onProfileSaved={gate.markSet} onLogout={onLogout} />} />
        {/* Đã đăng nhập thì các đường dẫn xác thực không còn ý nghĩa. */}
        <Route path="/login" element={<AfterLogin />} />
        <Route path="/forgot-password" element={<Navigate to="/" replace />} />

        <Route path="/plan" element={<PlanPage />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/tests" element={<TestsPage />} />
        <Route path="/attempt/:attemptId" element={<AttemptPage />} />
        <Route path="/result/:attemptId" element={<ResultPage />} />
        <Route path="/review/:attemptId" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />

        <Route path="/listen" element={<Navigate to="/listen/dictation" replace />} />
        <Route path="/listen/:tab" element={<BankPage kind="listen" />} />
        <Route path="/read" element={<Navigate to="/read/grammar" replace />} />
        <Route path="/read/:tab" element={<BankPage kind="read" />} />
        <Route path="/read/grammar/topics/:topicId" element={<GrammarTopicPage />} />
        <Route path="/dictation/items" element={<DictationItemsPage />} />
        <Route path="/dictation/item/:itemId" element={<DictationTrainerPage />} />

        <Route path="/vocab" element={<VocabHomePage />} />
        <Route path="/vocab/learn" element={<VocabSetupPage />} />
        <Route path="/vocab/play" element={<VocabPlayPage />} />
        <Route path="/vocab/words" element={<VocabWordsPage />} />
        <Route path="/vocab/mine" element={<MyVocabPage />} />

        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/vip" element={<VipPage />} />
        <Route path="/vip/result" element={<VipResultPage />} />
        <Route
          path="/account"
          element={<UserInfoPage session={session} onLogout={onLogout} onUpdateUser={onUpdateUser} onReplaceSession={onReplaceSession} onSetPassword={onSetPassword} onSessionExpired={onSessionExpired} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
