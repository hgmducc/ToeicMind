import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Notice } from '../../../components/ui/Feedback.jsx'
import { formatDue, percent } from '../../../lib/format.js'
import { MODES, MODE_IDS } from '../engine/modeCatalog.js'
import { FAMILIARITY, evaluateWord } from '../engine/scoring.js'
import { FamiliarityBadge, ResultChips } from './WordParts.jsx'

function ScheduleCell({ entry }) {
  if (!entry) return <span className="muted">—</span>
  if (entry.state === 'saving') return <span className="muted">Đang lưu…</span>
  if (entry.state === 'failed') return <span className="bad-text">Chưa lưu được</span>
  if (entry.state === 'skipped') return <span className="muted" title="Từ chưa đến hạn ôn nên lịch ôn được giữ nguyên.">Giữ nguyên lịch</span>
  return <span>{entry.result?.nextReviewAt ? `Ôn lại: ${formatDue(entry.result.nextReviewAt).toLowerCase()}` : 'Đã lưu'}</span>
}

export function SessionSummary({ plans, results, saved, startedAt, onRestart, onRetrySave, learnLink, wordsLink }) {
  const answers = Object.values(results).flat()
  const total = answers.length
  const correct = answers.filter((r) => r.cls !== 'wrong').length
  const slow = answers.filter((r) => r.cls === 'slow').length
  const times = answers.filter((r) => r.cls !== 'wrong' && r.ms > 0).map((r) => r.ms)
  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 100) / 10 : 0
  const [finishedAt] = useState(() => Date.now())
  const minutes = Math.round((finishedAt - startedAt) / 60000)

  const rows = plans
    .map((plan) => ({ plan, list: results[plan.id] || [] }))
    .filter((row) => row.list.length)
    .map((row) => ({ ...row, evaluation: evaluateWord(row.list) }))
  const distribution = [...FAMILIARITY].reverse().map((level) => ({ ...level, count: rows.filter((row) => row.evaluation.grade === level.grade).length }))
  const perMode = MODE_IDS.map((id) => {
    const list = answers.filter((r) => r.mode === id)
    return { id, ok: list.filter((r) => r.cls !== 'wrong').length, bad: list.filter((r) => r.cls === 'wrong').length }
  }).filter((entry) => entry.ok + entry.bad > 0)
  const failed = Object.values(saved).filter((entry) => entry.state === 'failed').length

  return (
    <section className="card vq-summary" aria-labelledby="vq-summary-title">
      <span className="vq-summary-icon" aria-hidden="true"><Icon name="check" size={30} /></span>
      <h1 className="page-title" id="vq-summary-title" tabIndex={-1}>Hoàn thành lượt học!</h1>
      <p className="score-big">{percent(correct, total)}%</p>
      <p className="muted">{correct} đúng · {total - correct} sai{slow ? ` · ${slow} đúng nhưng chậm` : ''}{average ? ` · trung bình ${average} giây/câu` : ''} · {minutes || '<1'} phút</p>

      {rows.length > 0 && (
        <div className="vq-distribution" aria-label="Độ quen thuộc của các từ trong lượt này">
          {distribution.map((level) => (
            <span key={level.key} className="vq-dist-item" data-tone={level.tone}><b>{level.count}</b> {level.label}</span>
          ))}
        </div>
      )}

      {failed > 0 && (
        <Notice kind="error">
          Chưa lưu được kết quả của {failed} từ vào lịch ôn. <button type="button" className="text-link" onClick={onRetrySave}>Thử lưu lại</button>
        </Notice>
      )}

      <h2 className="vq-summary-title">Độ quen thuộc của từng từ</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Từ</th><th>Độ quen thuộc</th><th>Các câu đã làm</th><th>Lịch ôn</th></tr></thead>
          <tbody>
            {rows.map(({ plan, list, evaluation }) => (
              <tr key={plan.id}>
                <td><b>{plan.item.word.lemma}</b> <span className="muted small">{plan.item.word.posCode}</span><div className="muted small">{plan.item.word.meaningVi}</div></td>
                <td><FamiliarityBadge level={evaluation} /><div className="muted small">đúng {evaluation.correct}/{evaluation.total}</div></td>
                <td><ResultChips results={list} /></td>
                <td className="small"><ScheduleCell entry={saved[plan.id]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="vq-summary-title">Theo dạng câu hỏi</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Dạng câu hỏi</th><th>Đúng</th><th>Sai</th></tr></thead>
          <tbody>
            {perMode.map((entry) => (
              <tr key={entry.id}><td>{MODES[entry.id].name} <span className="muted small">{MODES[entry.id].vi}</span></td><td className="ok-text">{entry.ok}</td><td className="bad-text">{entry.bad}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row vq-summary-actions">
        <button type="button" className="btn btn-primary" onClick={onRestart}><Icon name="refresh" size={16} />Học tiếp</button>
        <Link className="btn btn-outline" to={learnLink}>Đổi cách học</Link>
        <Link className="btn btn-outline" to={wordsLink}>Danh sách từ</Link>
      </div>
    </section>
  )
}
