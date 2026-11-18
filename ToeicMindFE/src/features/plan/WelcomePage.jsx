import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Brand } from '../../components/ui/Brand.jsx'
import { Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDate } from '../../lib/format.js'
import { useToast } from '../../providers/toastContext.js'
import { paths, safeReturnPath } from '../../routes/learnerRoutes.js'
import { GoalForm } from './components/GoalForm.jsx'
import { minutesLabel } from './planModel.js'
import { getPlacementStatus, startPlacement } from './services/planApi.js'

const STEPS = ['Mục tiêu học', 'Trình độ hiện tại']

function StepIndicator({ step }) {
  return (
    <ol className="welcome-steps" aria-label={`Bước ${step}/${STEPS.length}`}>
      {STEPS.map((label, index) => {
        const no = index + 1
        const state = no < step ? 'done' : no === step ? 'current' : 'todo'
        return (
          <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="welcome-step-dot">{state === 'done' ? <Icon name="check" size={14} /> : no}</span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

// Bước 2: mời làm bài kiểm tra đầu vào (nếu Admin đã thiết lập) để lộ trình biết trình độ; được để sau.
function LevelStep({ profile, onLater }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const { data, loading } = useAsync(() => getPlacementStatus().catch(() => null), [])

  async function start() {
    if (busy) return
    setBusy(true)
    try { const attempt = await startPlacement(); navigate(paths.attempt(attempt.attemptId), { replace: true }) } catch (error) { toast(error.message, 'error', 5000); setBusy(false) }
  }

  const test = data?.test
  const canTest = !!data && (data.available || data.inProgressAttemptId)
  return (
    <section className="card welcome-card">
      <p className="welcome-saved" role="status"><Icon name="circle-check" size={18} />Đã lưu mục tiêu của bạn</p>
      <div className="tag-row">
        {profile?.targetScore && <Pill tone="accent">Mục tiêu {profile.targetScore} điểm</Pill>}
        {profile?.dailyMinutes && <Pill>{minutesLabel(profile.dailyMinutes)} mỗi ngày</Pill>}
        {profile?.examDate && <Pill tone="muted">Thi ngày {formatDate(profile.examDate)}</Pill>}
      </div>
      <h1 className="page-title welcome-title">Xác định trình độ hiện tại</h1>
      {loading ? <Loading label="Đang kiểm tra bài kiểm tra đầu vào…" /> : canTest ? (
        <>
          <p className="muted">Làm bài kiểm tra ngắn gồm cả Nghe và Đọc để ToeicMind ước tính điểm, Level từng kỹ năng và chọn bài học vừa sức cho bạn.</p>
          {test && (
            <ul className="welcome-facts">
              <li><Icon name="list" size={16} />{test.totalQuestions} câu hỏi</li>
              <li><Icon name="clock" size={16} />{Math.ceil(test.timeLimitSeconds / 60)} phút</li>
              <li><Icon name="layers" size={16} />{test.parts.length} Part</li>
            </ul>
          )}
          <div className="welcome-actions">
            {data.inProgressAttemptId
              ? <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(paths.attempt(data.inProgressAttemptId), { replace: true })}><Icon name="play" size={16} />Làm tiếp bài kiểm tra</button>
              : <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={busy}><Icon name="play" size={16} />{busy ? 'Đang chuẩn bị…' : 'Làm bài kiểm tra đầu vào'}</button>}
            <button type="button" className="btn btn-outline btn-lg" onClick={onLater} disabled={busy}>Để sau, vào Trang chủ</button>
          </div>
          <p className="muted small">Bạn có thể làm bài này bất cứ lúc nào ở mục <b>Lộ trình</b>.</p>
        </>
      ) : (
        <>
          <p className="muted">Lộ trình sẽ ước tính trình độ từ các bài bạn luyện tập. Bắt đầu với vài bài trong ngân hàng câu hỏi hoặc một đề thi thử.</p>
          <div className="welcome-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onLater}><Icon name="arrow-right" size={16} />Bắt đầu học</button>
          </div>
        </>
      )}
    </section>
  )
}

// Thiết lập ban đầu (bắt buộc với tài khoản chưa có mục tiêu): bước 1 đặt mục tiêu, bước 2 mời kiểm tra đầu vào.
// required: lúc mở trang tài khoản còn phải thiết lập; vào /welcome khi đã thiết lập rồi thì chuyển tới Lộ trình.
export default function WelcomePage({ session, required, onProfileSaved, onLogout }) {
  useDocumentTitle('Thiết lập mục tiêu')
  const navigate = useNavigate()
  const { state } = useLocation()
  const [mustSetup] = useState(required)
  const [saved, setSaved] = useState(null)
  if (!mustSetup) return <Navigate to="/plan" replace />

  const name = session?.user?.username || 'bạn'
  const finish = () => navigate(safeReturnPath(state?.from), { replace: true })
  return (
    <div className="welcome">
      <header className="welcome-head">
        <Brand />
        <span className="spacer" />
        <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}><Icon name="log-out" size={14} />Đăng xuất</button>
      </header>
      <StepIndicator step={saved ? 2 : 1} />
      {saved ? <LevelStep profile={saved} onLater={finish} /> : (
        <section className="card welcome-card">
          <p className="welcome-eyebrow">Bước 1/2</p>
          <h1 className="page-title welcome-title">Chào {name}! Hãy đặt mục tiêu học</h1>
          <p className="muted">ToeicMind dùng mục tiêu để chia bài học mỗi ngày và ưu tiên kỹ năng còn thiếu. Bạn cần hoàn tất bước này trước khi bắt đầu; có thể đổi lại bất cứ lúc nào ở mục Lộ trình.</p>
          <p className="muted small">Mục có dấu <span className="required-mark">*</span> là bắt buộc.</p>
          <GoalForm required idPrefix="welcome" submitLabel="Lưu và tiếp tục" actionsClassName="welcome-actions"
            onSaved={(profile) => { onProfileSaved(); setSaved(profile || { isSet: true }) }} />
        </section>
      )}
    </div>
  )
}
