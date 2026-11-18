import { Link } from 'react-router-dom'
import { ProgressBar } from '../../components/ui/Badges.jsx'
import { ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ATTEMPT_MODE, PART_NAMES, percent } from '../../lib/format.js'
import { paths } from '../../routes/learnerRoutes.js'
import { AttemptTable } from '../exams/components/AttemptTable.jsx'
import { getDashboard } from '../exams/services/examApi.js'
import { PlanWidget } from '../plan/components/PlanWidget.jsx'
import { ScoreChart } from './components/ScoreChart.jsx'
import { StudyHeatmap } from './components/StudyHeatmap.jsx'

const QUICK = [
  ['/listen/dictation', 'headphones', 'Luyện Nghe', 'Nghe chép & Part 1–4'],
  ['/read/grammar', 'book', 'Luyện Đọc', 'Ngữ pháp & Part 5–7'],
  ['/tests', 'file', 'Làm đề thi', 'Luyện thi hoặc luyện tập'],
]

export default function HomePage({ session }) {
  useDocumentTitle('Trang chủ')
  const { data, error, loading, reload } = useAsync(() => getDashboard(), [])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const user = session.user
  const doing = (data.recentAttempts || []).find((attempt) => attempt.status === 'IN_PROGRESS')

  const accuracy = data.accuracyPercent != null ? Math.round(data.accuracyPercent) : 0
  const totals = (data.parts || []).reduce((sum, part) => ({
    practiced: sum.practiced + (part.practicedCount || 0), total: sum.total + (part.totalQuestions || 0),
    correct: sum.correct + (part.correctCount || 0), wrong: sum.wrong + (part.wrongCount || 0),
  }), { practiced: 0, total: 0, correct: 0, wrong: 0 })
  // Số liệu bổ trợ (quy chuẩn 2.0 mục 14.5): gom vào một thẻ gọn bên cạnh "Hôm nay nên học", không lấn CTA học tiếp.
  const stats = [
    { label: 'Chuỗi ngày học', value: <><Icon name="flame" size={20} />{data.currentStreak}</>, note: `Kỷ lục ${data.longestStreak} ngày` },
    { label: 'Độ chính xác', value: `${accuracy}%`, note: `${data.correctAnswers}/${data.answeredQuestions} câu đúng` },
    { label: 'Bài đã nộp', value: data.submittedAttempts, note: `Tổng ${data.totalAttempts} lượt làm` },
    { label: 'Điểm TOEIC cao nhất', value: data.bestTotalScaled ?? '–', note: data.lastTotalScaled != null ? `Gần nhất ${data.lastTotalScaled}` : 'Chưa có bài đủ điểm' },
  ]

  return (
    <div className="stack home">
      <header>
        <h1 className="page-title">Xin chào, {user.username || user.email}</h1>
        <p className="page-lead">{data.studiedToday ? 'Hôm nay bạn đã học rồi — tiếp tục phát huy!' : 'Hôm nay bạn chưa luyện bài nào. Bắt đầu thôi!'}</p>
      </header>

      {/* Thứ tự theo mục 14.5: Hôm nay nên học → bài đang dở → lối tắt → tiến độ → lịch sử; số liệu là khối phụ bên phải. */}
      <div className="home-hero">
        <div className="home-main">
          <PlanWidget />
          {doing && (
            <div className="callout home-resume">
              <Icon name="clock" size={20} />
              <p className="spacer"><b>Bạn đang làm dở</b> “{doing.examTitle || 'Ngân hàng câu hỏi'}” ({ATTEMPT_MODE[doing.mode] || doing.mode}).</p>
              <Link className="btn btn-primary btn-sm" to={paths.attempt(doing.attemptId)}>Làm tiếp</Link>
            </div>
          )}
        </div>
        <section className="card home-stats" aria-labelledby="home-stats-title">
          <h2 className="card-title" id="home-stats-title">Thành tích của bạn</h2>
          <dl className="home-stat-list">
            {stats.map((stat) => (
              <div key={stat.label} className="home-stat">
                <dt className="home-stat-label">{stat.label}</dt>
                <dd className="home-stat-value">{stat.value}</dd>
                <dd className="home-stat-note">{stat.note}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <nav className="quick-grid home-quick" aria-label="Lối tắt học tập">
        {QUICK.map(([to, icon, title, text]) => (
          <Link key={to} className="quick-link" to={to}><span className="quick-icon"><Icon name={icon} size={22} /></span><span><strong>{title}</strong><span className="muted small">{text}</span></span></Link>
        ))}
        <Link className="quick-link" to="/vocab"><span className="quick-icon"><Icon name="text" size={22} /></span><span><strong>Học từ vựng</strong><span className="muted small">{data.savedWordCount} từ đã lưu</span></span></Link>
      </nav>

      <div className="home-progress">
        <section className="card">
          <h2 className="card-title">Tiến độ theo Part</h2>
          {(data.parts || []).length ? data.parts.map((part) => (
            <div key={part.partNo} className="part-progress">
              <div className="row small">
                <b>Part {part.partNo}</b><span className="muted">{part.partName || PART_NAMES[part.partNo] || ''}</span><span className="spacer" />
                <span><b>{part.practicedCount}</b>/{part.totalQuestions} câu · <span className="ok-text">✓ {part.correctCount}</span> · <span className="bad-text">✗ {part.wrongCount}</span></span>
              </div>
              <ProgressBar value={percent(part.practicedCount, part.totalQuestions)} label={`Tiến độ Part ${part.partNo}`} />
            </div>
          )) : <p className="muted">Chưa có dữ liệu.</p>}
          {(data.parts || []).length > 0 && (
            <div className="home-progress-foot small">
              <span>Đã luyện <b>{totals.practiced}</b>/{totals.total} câu ({percent(totals.practiced, totals.total)}%) · <span className="ok-text">✓ {totals.correct}</span> · <span className="bad-text">✗ {totals.wrong}</span></span>
              <span className="spacer" />
              <Link className="text-link" to="/listen/dictation">Luyện Nghe →</Link>
              <Link className="text-link" to="/read/grammar">Luyện Đọc →</Link>
            </div>
          )}
        </section>
        <div className="home-side">
          <section className="card">
            <h2 className="card-title">Lịch học 12 tuần</h2>
            <StudyHeatmap days={data.studyDays || []} />
            <p className="muted small heat-note">Ô càng đậm, ngày đó làm càng nhiều bài.</p>
          </section>
          <section className="card"><h2 className="card-title">Điểm các bài Luyện thi</h2><ScoreChart points={data.scoreHistory || []} /></section>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Bài làm gần đây</h2>
        <AttemptTable items={(data.recentAttempts || []).slice(0, 5)} />
        <p className="heat-note"><Link className="text-link" to="/history">Xem toàn bộ lịch sử →</Link></p>
      </section>
    </div>
  )
}
