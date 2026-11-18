import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useStoredState } from '../../../hooks/useStoredState.js'
import { ExplanationCard, OptionAnalysis, TranscriptContent, VocabCards } from '../components/AnswerDetails.jsx'
import { Switch } from './StudyLayout.jsx'
import { isRevealed } from './studyModel.js'

function optionState(option, answer, exam) {
  // Xem lại: câu bỏ trống vẫn có feedback để tô đáp án đúng.
  if (!answer?.selected && !answer?.feedback) return undefined
  if (exam) return option.optionId === answer.selected ? 'selected' : undefined
  const feedback = answer.feedback
  if (feedback && option.optionId === feedback.correctOptionId) return 'correct'
  if (option.optionId === answer.selected) {
    if (feedback) return feedback.isCorrect ? 'correct' : 'wrong'
    return answer.correct === true ? 'correct' : answer.correct === false ? 'wrong' : 'selected'
  }
  return undefined
}

const REVIEW_STATUS = { correct: ['Đúng', 'success', 'circle-check'], wrong: ['Sai', 'danger', 'alert-circle'], skipped: ['Bỏ trống', 'muted', 'info'] }

// Một câu hỏi: số câu + nội dung, nút đánh dấu, các phương án "(A) …".
// hideText: Part 1–2 chỉ hiện (A)(B)(C)(D) khi chưa trả lời (Luyện tập có thể bật "Hiện chữ").
// status (trang Đáp án chi tiết): 'correct' | 'wrong' | 'skipped' → nhãn trạng thái ở đầu thẻ thay cho dòng "Chính xác!/Chưa đúng".
export function QuestionCard({ question, number, answer, exam = false, hideText = false, marked = false, busy = false, showRevealButton = false, status, onPick, onReveal, onMark, onReport }) {
  const locked = !exam && isRevealed(answer)
  const compact = hideText && !(locked || answer?.feedback)
  return (
    <article className="q study-q" id={`q${question.questionId}`} data-answered={!!answer?.selected} data-marked={marked} data-review={status}>
      {status && <p className="study-q-status"><Pill tone={REVIEW_STATUS[status][1]}><Icon name={REVIEW_STATUS[status][2]} size={13} />{REVIEW_STATUS[status][0]}</Pill></p>}
      <header className="study-q-head">
        <p className="study-q-text"><b>{number}.</b>{!compact && question.questionText ? ` ${question.questionText}` : ''}</p>
        {onReport && <button type="button" className="icon-btn study-q-icon" aria-label={`Báo lỗi câu ${number}`} title="Báo lỗi câu này" onClick={onReport}><Icon name="flag" size={16} /></button>}
        {onMark && <button type="button" className="icon-btn study-q-icon study-mark" aria-pressed={marked} aria-label={marked ? `Bỏ đánh dấu câu ${number}` : `Đánh dấu câu ${number}`} title="Đánh dấu để xem lại" onClick={onMark}><Icon name="star" size={18} /></button>}
      </header>
      <div className={`options study-options${compact ? ' study-options--letters' : ''}`} role="radiogroup" aria-label={`Đáp án câu ${number}`}>
        {question.options.map((option) => {
          const state = optionState(option, answer, exam)
          return (
            <button key={option.optionId} type="button" className={`option study-option${compact ? ' option--letter' : ''}`} role="radio"
              aria-checked={answer?.selected === option.optionId} aria-label={compact ? `Đáp án ${option.optionLabel}` : undefined}
              data-state={state} disabled={locked || busy} onClick={() => onPick(question.questionId, option.optionId)}>
              {state === 'correct' && <Icon name="circle-check" size={18} className="option-mark" />}
              {state === 'wrong' && <Icon name="alert-circle" size={18} className="option-mark" />}
              <b>({option.optionLabel})</b>{!compact && <span className="option-text">{option.optionText}</span>}
            </button>
          )
        })}
      </div>
      {showRevealButton && answer?.selected && !locked && (
        <div className="q-reveal">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onReveal(question.questionId)} disabled={busy}><Icon name="eye" size={14} />Xem đáp án</button>
          <span className="muted small">Bạn vẫn đổi được lựa chọn trước khi xem đáp án.</span>
        </div>
      )}
      {!exam && !status && answer?.feedback && (
        <p className="explain-result" data-ok={answer.feedback.isCorrect ? 'true' : 'false'}>
          <Icon name={answer.feedback.isCorrect ? 'circle-check' : 'alert-circle'} size={18} />{answer.feedback.isCorrect ? 'Chính xác!' : 'Chưa đúng'}
          {!answer.feedback.isCorrect && <span className="explain-key">Đáp án đúng: {question.options.find((o) => o.optionId === answer.feedback.correctOptionId)?.optionLabel}</span>}
        </p>
      )}
      {!exam && !status && locked && !answer.feedback && <p className="muted small">Đã chấm. Giải thích có ở trang Đáp án chi tiết sau khi kết thúc.</p>}
    </article>
  )
}

function Panel({ id, icon, label, open, onToggle, children, tone }) {
  return (
    <section className="study-panel" data-tone={tone} data-open={open} aria-labelledby={`${id}-label`}>
      <div className="study-panel-head" id={`${id}-label`}><Switch checked={open} onChange={onToggle} icon={icon} label={label} /></div>
      {open && <div className="study-panel-body">{children}</div>}
    </section>
  )
}

// Ba khối bật/tắt sau khi có đáp án (Luyện tập): Script & bản dịch, Giải thích chi tiết, Từ vựng nên học. Lựa chọn được nhớ.
export function RevealPanels({ group, questions, answers, numbers }) {
  const [open, setOpen] = useStoredState('toeicmind_fe_study_panels', { transcript: false, explain: true, vocab: false })
  const revealed = questions.filter((q) => answers[q.questionId]?.feedback)
  if (!revealed.length) return null
  const first = answers[revealed[0].questionId].feedback
  const listening = group.partNo <= 4
  const vocab = []
  const seen = new Set()
  for (const q of revealed) for (const v of answers[q.questionId].feedback.vocabularies || []) if (!seen.has(v.vocabId)) { seen.add(v.vocabId); vocab.push(v) }
  const toggle = (key) => (value) => setOpen((current) => ({ ...current, [key]: value }))
  const multi = questions.length > 1

  return (
    <div className="study-panels">
      {first.transcriptEn && (
        <Panel id={`tr-${group.groupId}`} icon="languages" label={listening ? 'Script & bản dịch' : 'Bản dịch'} open={open.transcript} onToggle={toggle('transcript')}>
          <TranscriptContent english={first.transcriptEn} vietnamese={first.translationVi} />
        </Panel>
      )}
      <Panel id={`ex-${group.groupId}`} icon="sparkles" label="Giải thích chi tiết" open={open.explain} onToggle={toggle('explain')}>
        {revealed.map((q) => {
          const feedback = answers[q.questionId].feedback
          return (
            <div key={q.questionId} className="study-explain">
              {multi && <p className="group-label">Câu {numbers.get(q.questionId)}</p>}
              <ExplanationCard text={feedback.explanation} />
              <OptionAnalysis text={feedback.optionExplanations} options={q.options} selectedOptionId={answers[q.questionId].selected} correctOptionId={feedback.correctOptionId} />
              {!String(feedback.explanation ?? '').trim() && !String(feedback.optionExplanations ?? '').trim() && <p className="muted small">Câu này chưa có giải thích.</p>}
            </div>
          )
        })}
      </Panel>
      {vocab.length > 0 && (
        <Panel id={`vc-${group.groupId}`} icon="text" label={`Từ vựng nên học (${vocab.length})`} tone="warning" open={open.vocab} onToggle={toggle('vocab')}>
          <VocabCards vocabularies={vocab} questionId={revealed[0].questionId} />
        </Panel>
      )}
    </div>
  )
}
