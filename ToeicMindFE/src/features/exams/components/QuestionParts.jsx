import { Dialog } from '../../../components/ui/Dialog.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useAsync } from '../../../hooks/useAsync.js'
import { sanitizeHtml } from '../../../lib/sanitize.js'
import { ErrorState, Loading } from '../../../components/ui/Feedback.jsx'
import { AnswerDetails, Transcript } from './AnswerDetails.jsx'
import { getExamDirections } from '../services/examApi.js'

export function Passage({ html, className = '' }) {
  if (!html) return null
  return <div className={`passage ${className}`.trim()} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
}

// Audio/hình của một nhóm câu hỏi. Link ký có hạn: khi audio lỗi gọi onMediaError để lấy link mới.
export function GroupMedia({ media, onMediaError, loadingAudio = false }) {
  const list = media || []
  if (!list.length) return loadingAudio ? <p className="muted small">Đang tải âm thanh…</p> : null
  return (
    <div className="group-media">
      {list.map((item, i) => item.mediaType === 'AUDIO'
        ? <audio key={`${item.url}-${i}`} controls preload="none" src={item.url} onError={onMediaError} />
        : <img key={`${item.url}-${i}`} alt={item.altText || 'Hình của nhóm câu'} src={item.url} loading="lazy" onError={onMediaError} />)}
    </div>
  )
}

export { Transcript } from './AnswerDetails.jsx'

// Kết quả khi Luyện tập hiện đáp án một câu: đúng/sai, script, rồi 3 khối Giải thích / Phân tích các đáp án / Từ vựng.
export function Explanation({ feedback, questionId, options, selectedOptionId }) {
  const correct = options?.find((option) => option.optionId === feedback.correctOptionId)
  return (
    <div className="explain">
      <p className="explain-result" data-ok={feedback.isCorrect ? 'true' : 'false'}>
        <Icon name={feedback.isCorrect ? 'circle-check' : 'alert-circle'} size={18} />{feedback.isCorrect ? 'Chính xác!' : 'Chưa đúng'}
        {!feedback.isCorrect && correct && <span className="explain-key">Đáp án đúng: {correct.optionLabel}</span>}
      </p>
      <Transcript english={feedback.transcriptEn} vietnamese={feedback.translationVi} />
      <AnswerDetails explanation={feedback.explanation} optionExplanations={feedback.optionExplanations} options={options}
        selectedOptionId={selectedOptionId} correctOptionId={feedback.correctOptionId} vocabularies={feedback.vocabularies} questionId={questionId} />
    </div>
  )
}

// Hộp báo lỗi dùng chung cho câu hỏi, từ vựng, bài ngữ pháp và bộ clip (UC-14).
export { ReportDialog } from '../../reports/ReportDialog.jsx'

// Hướng dẫn làm bài của đề (phần Nghe/Đọc và từng Part) để xem lại khi luyện tập. Nội dung chỉ tiếng Anh như đề thi thật.
export function DirectionsDialog({ examId, partNos, onClose }) {
  const { data, error, loading, reload } = useAsync(() => getExamDirections(examId), [examId])
  const skills = new Set(partNos.map((part) => (part <= 4 ? 'LISTENING' : 'READING')))
  const list = (data || []).filter((d) => (d.directionKind === 'SECTION' && skills.has(d.skill)) || (d.directionKind === 'PART' && partNos.includes(d.partNo)))
  return (
    <Dialog title="Hướng dẫn làm bài" onClose={onClose}>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : !list.length ? <p className="muted">Đề này chưa có hướng dẫn.</p> : (
        <div className="stack">
          {list.map((d) => (
            <section key={`${d.directionKind}-${d.skill}-${d.partNo}`} className="card">
              <h3 className="card-title">{d.directionKind === 'PART' ? `Part ${d.partNo}` : d.skill === 'LISTENING' ? 'Listening Test' : 'Reading Test'}</h3>
              <GroupMedia media={d.media} />
              <p className="preserve-lines">{d.directionsEn}</p>
              {d.exampleEn && <p className="small preserve-lines"><b>Example</b><br />{d.exampleEn}</p>}
            </section>
          ))}
        </div>
      )}
    </Dialog>
  )
}
