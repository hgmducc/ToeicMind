import { Link } from 'react-router-dom'
import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { ATTEMPT_MODE, ATTEMPT_SCOPE, formatDateTime } from '../../../lib/format.js'
import { paths } from '../../../routes/learnerRoutes.js'

function ResultCell({ attempt }) {
  if (attempt.status === 'IN_PROGRESS') return <Pill tone="warning">Đang làm</Pill>
  if (attempt.status === 'ABANDONED') return <Pill tone="muted">Bỏ dở</Pill>
  return (
    <span>
      <b>{attempt.correctCount ?? '–'}/{attempt.totalQuestions}</b> câu đúng
      {attempt.totalScaled != null && <> · <b className="ok-text">{attempt.totalScaled}</b> điểm</>}
    </span>
  )
}

// Bảng lượt làm bài dùng ở trang chủ và lịch sử. onDelete có thì hiện nút xóa cho lượt đã kết thúc.
export function AttemptTable({ items, onDelete }) {
  if (!items.length) return <p className="muted">Chưa có bài làm nào.</p>
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Bài</th><th>Chế độ</th><th>Kết quả</th><th>Thời gian</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
        <tbody>
          {items.map((attempt) => (
            <tr key={attempt.attemptId}>
              <td><b>{attempt.examTitle || 'Ngân hàng câu hỏi'}</b><div className="muted small">{ATTEMPT_SCOPE[attempt.scope] || attempt.scope}</div></td>
              <td><Pill tone={attempt.mode === 'EXAM' ? undefined : 'success'}>{ATTEMPT_MODE[attempt.mode] || attempt.mode}</Pill></td>
              <td><ResultCell attempt={attempt} /></td>
              <td className="muted small">{formatDateTime(attempt.submittedAt || attempt.startedAt)}</td>
              <td className="cell-actions">
                {attempt.status === 'IN_PROGRESS' && <Link className="btn btn-primary btn-sm" to={paths.attempt(attempt.attemptId)}>Làm tiếp</Link>}
                {attempt.status === 'SUBMITTED' && <Link className="btn btn-outline btn-sm" to={paths.result(attempt.attemptId)}>Kết quả</Link>}
                {onDelete && attempt.status !== 'IN_PROGRESS' && (
                  <button type="button" className="icon-btn" data-tone="danger" aria-label="Xóa khỏi lịch sử" title="Xóa khỏi lịch sử" onClick={() => onDelete(attempt)}><Icon name="trash" size={16} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
