import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Pill, ProgressBar } from '../../components/ui/Badges.jsx'
import { ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ATTEMPT_MODE, ATTEMPT_SCOPE, PART_NAMES, formatClock, formatDateTime, percent } from '../../lib/format.js'
import { paths } from '../../routes/learnerRoutes.js'
import { readLastBank } from '../bank/bankSession.js'
import { useStartBank } from '../bank/useStartBank.js'
import { ModeDialog } from './components/ModeDialog.jsx'
import { getAttemptResult } from './services/examApi.js'
import { answerSheet } from './resultModel.js'

const STATE_TEXT = { correct: 'Đúng', wrong: 'Sai', skipped: 'Bỏ trống' }

// Bảng đáp án: số câu, đáp án đúng và lựa chọn của người học khi sai; bấm vào ô để xem giải thích câu đó.
function AnswerSheet({ sheet, attemptId }) {
  const { counts } = sheet
  return (
    <section className="card">
      <div className="row answer-sheet-head">
        <h2 className="card-title spacer">Đáp án</h2>
        <span className="answer-legend" data-state="correct">Đúng {counts.correct}</span>
        <span className="answer-legend" data-state="wrong">Sai {counts.wrong}</span>
        <span className="answer-legend" data-state="skipped">Bỏ trống {counts.skipped}</span>
      </div>
      <p className="muted small">Mỗi ô là số câu và đáp án đúng; câu sai có thêm lựa chọn của bạn (gạch ngang). Bấm vào ô để xem giải thích.</p>
      {sheet.parts.map((part) => (
        <div key={part.partNo} className="answer-part">
          <p className="group-label">Part {part.partNo} · {PART_NAMES[part.partNo] || ''}</p>
          <div className="answer-grid">
            {part.items.map((item) => (
              <Link key={item.questionId} className="answer-cell" data-state={item.state} to={`${paths.review(attemptId)}#q-${item.questionId}`}
                title={`Câu ${item.no}: ${STATE_TEXT[item.state]}${item.correctLabel ? ` · đáp án ${item.correctLabel}` : ''}${item.state === 'wrong' && item.selectedLabel ? ` · bạn chọn ${item.selectedLabel}` : ''}`}>
                <span className="answer-no">{item.no}</span>
                <b className="answer-key">{item.correctLabel || '?'}</b>
                {item.state === 'wrong' && item.selectedLabel && <s className="answer-mine">{item.selectedLabel}</s>}
                {item.state === 'skipped' && <span className="answer-mine">–</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function ScoreRing({ value }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const tone = value >= 80 ? 'high' : value >= 50 ? 'mid' : 'low'
  return (
    <svg className="score-ring" viewBox="0 0 120 120" role="img" aria-label={`${value}% câu đúng`}>
      <circle className="ring-track" cx="60" cy="60" r={radius} />
      <circle className="ring-value" data-tone={tone} cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} transform="rotate(-90 60 60)" />
      <text className="ring-text" x="60" y="67" textAnchor="middle">{value}%</text>
    </svg>
  )
}

export default function ResultPage() {
  const { attemptId } = useParams()
  const startBank = useStartBank()
  const [redo, setRedo] = useState(false)
  const { data: result, error, loading, reload } = useAsync(() => getAttemptResult(attemptId), [attemptId])
  useDocumentTitle('Kết quả bài làm')

  if (loading) return <Loading />
  if (error?.code === 'ATTEMPT_NOT_SUBMITTED') return <Navigate to={paths.attempt(attemptId)} replace />
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/history" />

  const accuracy = result.totalQuestions ? Math.round(((result.correctCount || 0) * 100) / result.totalQuestions) : 0
  const placement = result.scope === 'PLACEMENT'
  const bank = result.scope === 'BANK' || placement
  const last = result.scope === 'BANK' ? readLastBank() : null
  const hasScore = result.totalScaled != null || result.listeningScaled != null || result.readingScaled != null
  // Bảng đáp án có ở mọi lượt đã nộp, kể cả Luyện thi (trừ khi backend tắt Learning:AllowExamReview → questions rỗng/null).
  const sheet = result.questions?.length ? answerSheet(result.questions, bank) : null

  return (
    <div className="stack">
      <section className="card">
        <div className="row">
          <h1 className="page-title">{result.examTitle || 'Luyện theo ngân hàng câu hỏi'}</h1>
          <Pill tone={result.mode === 'EXAM' ? undefined : 'success'}>{ATTEMPT_MODE[result.mode] || result.mode}</Pill>
          <Pill tone="muted">{ATTEMPT_SCOPE[result.scope] || result.scope}</Pill>
          {result.isAutoSubmitted && <Pill tone="warning">Tự nộp do hết giờ</Pill>}
          {result.status === 'ABANDONED' && <Pill tone="muted">Bỏ dở</Pill>}
        </div>
        <p className="muted small">Nộp lúc {formatDateTime(result.submittedAt)}{result.durationSeconds != null ? ` · làm trong ${formatClock(result.durationSeconds)}` : ''}</p>
        <div className="score-row">
          {hasScore && (
            <div>
              <p className="muted small">{placement ? 'Điểm TOEIC ước tính' : 'Điểm TOEIC'}</p><p className="score-big">{result.totalScaled ?? '–'}</p>
              <p className="muted small">Nghe {result.listeningScaled ?? '–'} · Đọc {result.readingScaled ?? '–'}</p>
              {placement && (result.listeningLevel || result.readingLevel) && (
                <div className="tag-row result-levels">
                  {result.listeningLevel && <Pill>Nghe: {result.listeningLevel.name}</Pill>}
                  {result.readingLevel && <Pill>Đọc: {result.readingLevel.name}</Pill>}
                </div>
              )}
            </div>
          )}
          <ScoreRing value={accuracy} />
          <div>
            <p className="result-count"><b>{result.correctCount ?? 0}</b> / {result.totalQuestions} câu đúng</p>
            <p className="muted">Đã trả lời {result.answeredCount} câu · bỏ trống {result.totalQuestions - result.answeredCount}</p>
            {result.totalScaled == null && result.mode === 'EXAM' && !placement && <p className="muted small">Điểm quy đổi chỉ có khi thi đủ 100 câu Nghe hoặc 100 câu Đọc.</p>}
          </div>
        </div>
      </section>

      {placement && (
        <div className="callout callout--info">
          <Icon name="target" size={20} />
          <p className="spacer">Điểm ước tính từ tỷ lệ đúng của bài kiểm tra ngắn, quy về thang TOEIC. <b>Lộ trình cá nhân</b> đã cập nhật Level và chủ điểm cần luyện theo kết quả này.</p>
          <Link className="btn btn-primary btn-sm" to="/plan">Xem lộ trình</Link>
        </div>
      )}

      <section className="card">
        <h2 className="card-title">Kết quả theo Part</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Part</th><th>Đúng</th><th>Tỷ lệ</th><th>Đã làm</th></tr></thead>
            <tbody>
              {result.parts.map((part) => {
                const rate = percent(part.correct, part.total)
                return (
                  <tr key={part.partNo}>
                    <td><b>Part {part.partNo}</b><div className="muted small">{PART_NAMES[part.partNo] || ''}</div></td>
                    <td><b>{part.correct}</b>/{part.total}</td>
                    <td className="rate-cell"><ProgressBar value={rate} tone={rate >= 80 ? 'success' : undefined} label={`Tỷ lệ đúng Part ${part.partNo}`} /></td>
                    <td>{part.answered}/{part.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {sheet
        ? <AnswerSheet sheet={sheet} attemptId={attemptId} />
        : result.mode === 'EXAM' && <p className="callout callout--info">Đề này đang tắt xem đáp án sau khi thi. Dùng chế độ <b>Luyện tập</b> nếu muốn xem giải thích từng câu.</p>}

      <div className="row">
        {sheet && <Link className="btn btn-primary" to={paths.review(attemptId)}>Xem đáp án &amp; giải thích chi tiết</Link>}
        {bank && last && <button type="button" className="btn btn-secondary" onClick={() => startBank(last.partNo, last.cardKey, 'NEW', { categoryId: last.categoryId, levelNo: last.levelNo })}>Học tiếp mục này</button>}
        {result.examId && <button type="button" className="btn btn-outline" onClick={() => setRedo(true)}>Làm lại đề</button>}
        {!placement && <Link className="btn btn-outline" to="/plan">Lộ trình</Link>}
        <Link className="btn btn-outline" to="/history">Lịch sử</Link>
        <Link className="btn btn-outline" to="/">Trang chủ</Link>
      </div>
      {redo && <ModeDialog examId={result.examId} title={result.examTitle} onClose={() => setRedo(false)} />}
    </div>
  )
}
