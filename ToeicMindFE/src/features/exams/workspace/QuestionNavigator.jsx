import { Dialog } from '../../../components/ui/Dialog.jsx'
import { PART_NAMES } from '../../../lib/format.js'
import { answerStatus, statusCounts } from './studyModel.js'

const STATUS_TEXT = { correct: 'đúng', wrong: 'sai', selected: 'đã chọn', todo: 'chưa làm' }
const REVIEW_TEXT = { correct: 'đúng', wrong: 'sai', todo: 'bỏ trống' }

// Bảng câu hỏi dạng ngăn bên phải. Luyện tập: hiện đúng/sai, bấm để chuyển nhóm câu.
// Luyện thi (exam): chỉ phân biệt đã trả lời / chưa làm và không cho quay lại (onJump = null).
// Đáp án chi tiết (review): đúng / sai / bỏ trống theo answers[id].review; isDimmed(groupId) làm mờ nhóm ngoài bộ lọc.
export function QuestionNavigator({ groups, numbers, answers, marks, currentGroupId, exam = false, review = false, isDimmed, onJump, onClose, footer }) {
  const ids = groups.flatMap((group) => group.questionIds)
  const counts = statusCounts(answers, ids)
  const answered = counts.correct + counts.wrong + counts.selected
  const skipped = review ? ids.filter((id) => answers[id]?.review === 'skipped').length : 0
  const parts = [...new Set(groups.map((group) => group.partNo))]
  const status = (id) => {
    if (review) return answers[id]?.review === 'skipped' ? 'todo' : answers[id]?.review
    const value = answerStatus(answers[id])
    return exam && value !== 'todo' ? 'selected' : value
  }
  const text = (value) => (review ? REVIEW_TEXT[value] : exam && value === 'selected' ? 'đã trả lời' : STATUS_TEXT[value])

  return (
    <Dialog title="Danh sách câu hỏi" size="drawer" onClose={onClose}
      description={exam ? 'Luyện thi không quay lại câu đã qua; bảng này để theo dõi tiến độ.' : 'Bấm số câu để chuyển tới câu đó.'}>
      <p className="nav-counts">
        {review
          ? <><span data-state="correct">{counts.correct} Đúng</span><span data-state="wrong">{counts.wrong - skipped} Sai</span><span data-state="todo">{skipped} Bỏ trống</span></>
          : exam
          ? <><span data-state="selected">{answered} đã trả lời</span><span data-state="todo">{counts.todo} chưa làm</span></>
          : <><span data-state="correct">{counts.correct} Đúng</span><span data-state="wrong">{counts.wrong} Sai</span><span data-state="selected">{counts.selected} Đã chọn</span><span data-state="todo">{counts.todo} Chưa làm</span></>}
      </p>
      <ul className="nav-legend" aria-label="Chú thích">
        <li><i data-state="current" />Đang xem</li>
        {review ? <><li><i data-state="correct" />Đúng</li><li><i data-state="wrong" />Sai</li></>
          : exam ? <li><i data-state="selected" />Đã trả lời</li> : <><li><i data-state="correct" />Đúng</li><li><i data-state="wrong" />Sai</li><li><i data-state="selected" />Đã chọn, chưa xem đáp án</li></>}
        <li><i data-state="todo" />{review ? 'Bỏ trống' : 'Chưa làm'}</li>
        {!exam && <li><i data-state="marked" />Đánh dấu</li>}
      </ul>
      {parts.map((partNo) => {
        const inPart = groups.filter((group) => group.partNo === partNo)
        const partIds = inPart.flatMap((group) => group.questionIds)
        return (
          <section key={partNo} className="nav-part">
            <h3 className="nav-part-title">Part {partNo} · {PART_NAMES[partNo] || ''} <span className="muted">({partIds.length} câu)</span></h3>
            <div className="nav-grid">
              {inPart.flatMap((group) => group.questionIds.map((id) => {
                const value = status(id)
                const current = group.groupId === currentGroupId
                const marked = marks?.has(id)
                return (
                  <button key={id} type="button" className="nav-cell" data-state={value} data-current={current} data-marked={marked}
                    data-dimmed={isDimmed?.(group.groupId) || undefined} aria-current={current ? 'true' : undefined} disabled={!onJump}
                    aria-label={`Câu ${numbers.get(id)}: ${text(value)}${marked ? ', đã đánh dấu' : ''}${current ? ', đang xem' : ''}`}
                    onClick={() => { onJump?.(group.groupId); onClose() }}>
                    {numbers.get(id)}
                  </button>
                )
              }))}
            </div>
          </section>
        )
      })}
      {footer}
    </Dialog>
  )
}
