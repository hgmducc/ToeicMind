import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { PageHero } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { PART_NAMES, formatDateTime } from '../../lib/format.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { getPlacementStatus, startPlacement } from './services/planApi.js'

// Trang giới thiệu bài kiểm tra đầu vào: cấu trúc, thời gian, cách tính kết quả; bắt đầu hoặc làm tiếp lượt dở.
export default function PlacementPage() {
  useDocumentTitle('Kiểm tra đầu vào')
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useAsync(getPlacementStatus, [])

  async function start() {
    if (busy) return
    setBusy(true)
    try {
      const attempt = await startPlacement()
      navigate(paths.attempt(attempt.attemptId))
    } catch (failure) {
      toast(failure.message, 'error', 5000)
      setBusy(false)
      reload()
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/plan" />

  const { test, lastResult } = data
  return (
    <div className="stack">
      <PageHero icon="target" eyebrow="Kiểm tra đầu vào" title={test?.title || 'Kiểm tra trình độ TOEIC'}>
        {test?.description || 'Bài kiểm tra ngắn gồm cả Nghe và Đọc. Kết quả ước tính điểm TOEIC và Level từng kỹ năng để lộ trình gợi ý bài học vừa sức.'}
      </PageHero>

      {!data.available && !data.inProgressAttemptId ? (
        <div className="card">
          <EmptyState title="Chưa có bài kiểm tra đầu vào" action={<Link className="btn btn-primary" to="/plan">Xem lộ trình</Link>}>
            Quản trị viên chưa thiết lập bài kiểm tra. Lộ trình vẫn gợi ý dựa trên kết quả luyện tập của bạn.
          </EmptyState>
        </div>
      ) : (
        <section className="card">
          {test && (
            <>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-value"><Icon name="list" size={22} />{test.totalQuestions}</div><div className="stat-label">câu hỏi</div></div>
                <div className="stat-card"><div className="stat-value"><Icon name="clock" size={22} />{Math.ceil(test.timeLimitSeconds / 60)}</div><div className="stat-label">phút làm bài</div></div>
                <div className="stat-card"><div className="stat-value"><Icon name="layers" size={22} />{test.parts.length}</div><div className="stat-label">Part</div></div>
              </div>
              <div className="tag-row">
                {test.parts.map((part) => <Pill key={part.partNo} tone="muted">Part {part.partNo} · {PART_NAMES[part.partNo]} · {part.questionCount} câu</Pill>)}
              </div>
            </>
          )}
          <ul className="plan-rules">
            <li>Làm như thi thật: có đồng hồ, không hiện đúng/sai khi đang làm, đổi đáp án được tới lúc nộp.</li>
            <li>Hết giờ bài tự nộp; câu bỏ trống tính sai. Có thể tạm dừng và làm tiếp, đồng hồ vẫn chạy.</li>
            <li>Sau khi nộp: điểm TOEIC ước tính, Level Nghe/Đọc, xem lại đáp án và giải thích; lộ trình tự cập nhật.</li>
          </ul>
          <div className="row">
            {data.inProgressAttemptId
              ? <Link className="btn btn-primary btn-lg" to={paths.attempt(data.inProgressAttemptId)}><Icon name="play" size={16} />Làm tiếp bài đang dở</Link>
              : <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={busy}><Icon name="play" size={16} />{busy ? 'Đang chuẩn bị…' : lastResult ? 'Làm lại bài kiểm tra' : 'Bắt đầu làm bài'}</button>}
            <Link className="btn btn-outline btn-lg" to="/plan">Xem lộ trình</Link>
          </div>
        </section>
      )}

      {lastResult && (
        <section className="card">
          <div className="row"><h2 className="card-title spacer">Kết quả gần nhất</h2><span className="muted small">{formatDateTime(lastResult.submittedAt)}</span></div>
          <div className="plan-score-row">
            <div><p className="muted small">Ước tính</p><p className="plan-score">{lastResult.totalScaled ?? '–'}</p></div>
            <div><p className="muted small">Nghe</p><p className="plan-score plan-score--sm">{lastResult.listeningScaled ?? '–'}</p>{lastResult.listeningLevel && <Pill>{lastResult.listeningLevel.name}</Pill>}</div>
            <div><p className="muted small">Đọc</p><p className="plan-score plan-score--sm">{lastResult.readingScaled ?? '–'}</p>{lastResult.readingLevel && <Pill>{lastResult.readingLevel.name}</Pill>}</div>
            <div><p className="muted small">Câu đúng</p><p className="plan-score plan-score--sm">{lastResult.correctCount ?? 0}/{lastResult.totalQuestions}</p></div>
          </div>
          <p className="heat-note"><Link className="text-link" to={paths.result(lastResult.attemptId)}>Xem kết quả chi tiết →</Link></p>
        </section>
      )}
    </div>
  )
}
