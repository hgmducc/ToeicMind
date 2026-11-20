import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { parseOptionAnalysis } from '../answerDetails.js'
import { ExplanationCard, OptionAnalysis, TranscriptContent, VocabCards } from '../components/AnswerDetails.jsx'
import { StudyPanel } from './StudyLayout.jsx'
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

function matchOptionAnalysis(text, options) {
  const items = parseOptionAnalysis(text)
  if (!items || items.some((item) => !options.some((option) => option.optionLabel === item.label))) return null
  const byLabel = new Map(items.map((item) => [item.label, item]))
  return byLabel.size === items.length ? byLabel : null
}

function QuestionOption({ questionId, option, answer, exam, compact, disabled, analysis, onPick }) {
  const state = optionState(option, answer, exam)
  const selected = answer?.selected === option.optionId
  const analysisId = analysis ? `q${questionId}-option-${option.optionId}-analysis` : undefined
  const correctId = answer?.feedback?.correctOptionId
  const verdict = correctId != null ? (option.optionId === correctId ? 'correct' : 'wrong') : analysis?.verdict
  const optionText = option.optionText?.trim()
  const quote = analysis?.quote
  const showQuote = quote && optionText && quote.replace(/\.$/, '') !== optionText.replace(/\.$/, '')

  return (
    <div className="study-option-row" data-analyzed={analysis ? 'true' : undefined} data-state={analysis ? state : undefined}>
      <button type="button" className={`option study-option${compact ? ' option--letter' : ''}`} role="radio"
        aria-checked={selected} aria-label={compact ? `Đáp án ${option.optionLabel}` : undefined} aria-describedby={analysisId}
        data-state={state} disabled={disabled} onClick={() => onPick(questionId, option.optionId)}>
        {state === 'correct' && <Icon name="circle-check" size={18} className="option-mark" />}
        {state === 'wrong' && <Icon name="alert-circle" size={18} className="option-mark" />}
        <b>({option.optionLabel})</b>{!compact && <span className="option-text">{optionText || quote}</span>}
      </button>
      {analysis && (
        <div className="study-option-analysis" id={analysisId}>
          {verdict && <Pill tone={verdict === 'correct' ? 'success' : 'danger'}>{verdict === 'correct' ? 'Đúng' : 'Sai'}{selected && ' · Bạn chọn'}</Pill>}
          {(showQuote || analysis.reason) && (
            <div className="study-option-analysis-copy">
              {showQuote && <p><i>{quote}</i></p>}
              {analysis.reason && <p>{analysis.reason}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const REVIEW_STATUS = { correct: ['Đúng', 'success', 'circle-check'], wrong: ['Sai', 'danger', 'alert-circle'], skipped: ['Bỏ trống', 'muted', 'info'] }

// Một câu hỏi: số câu + nội dung, nút đánh dấu, các phương án "(A) …".
// hideText: Part 1–2 chỉ hiện (A)(B)(C)(D) khi chưa trả lời (Luyện tập có thể bật "Hiện chữ").
// status (trang Đáp án chi tiết): 'correct' | 'wrong' | 'skipped' → nhãn trạng thái ở đầu thẻ thay cho dòng "Chính xác!/Chưa đúng".
export function QuestionCard({ question, number, answer, exam = false, hideText = false, marked = false, busy = false, showRevealButton = false, status, grouped = false, panels, onPick, onReveal, onMark, onReport }) {
  const locked = !exam && isRevealed(answer)
  const compact = hideText && !(locked || answer?.feedback)
  const feedback = exam ? null : answer?.feedback
  const analysisText = String(feedback?.optionExplanations ?? '').trim()
  const inlineAnalysis = analysisText ? matchOptionAnalysis(analysisText, question.options) : null
  const explainKey = grouped ? `explain-${question.questionId}` : 'explain'
  return (
    <article className="q study-q" id={`q${question.questionId}`} data-answered={!!answer?.selected} data-marked={marked} data-review={status}>
      {status && <p className="study-q-status"><Pill tone={REVIEW_STATUS[status][1]}><Icon name={REVIEW_STATUS[status][2]} size={13} />{REVIEW_STATUS[status][0]}</Pill></p>}
      <header className="study-q-head">
        <p className="study-q-text"><b>{number}.</b>{!compact && question.questionText ? ` ${question.questionText}` : ''}</p>
        {onReport && <button type="button" className="icon-btn study-q-icon" aria-label={`Báo lỗi câu ${number}`} title="Báo lỗi câu này" onClick={onReport}><Icon name="flag" size={16} /></button>}
        {onMark && <button type="button" className="icon-btn study-q-icon study-mark" aria-pressed={marked} aria-label={marked ? `Bỏ đánh dấu câu ${number}` : `Đánh dấu câu ${number}`} title="Đánh dấu để xem lại" onClick={onMark}><Icon name="star" size={18} /></button>}
      </header>
      <div className={`options study-options${compact ? ' study-options--letters' : ''}`} role="radiogroup" aria-label={`Đáp án câu ${number}`}>
        {question.options.map((option) => (
          <QuestionOption key={option.optionId} questionId={question.questionId} option={option} answer={answer} exam={exam}
            compact={compact} disabled={locked || busy} analysis={inlineAnalysis?.get(option.optionLabel)} onPick={onPick} />
        ))}
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
      {analysisText && !inlineAnalysis && (
        <div className="study-option-analysis-fallback">
          <OptionAnalysis text={analysisText} options={question.options} selectedOptionId={answer.selected} correctOptionId={feedback.correctOptionId} />
        </div>
      )}
      {feedback && panels && (
        <StudyPanel icon="sparkles"
          label={<>Giải thích chi tiết{grouped && <span className="sr-only"> câu {number}</span>}</>}
          open={panels.open[explainKey] ?? panels.open.explain ?? true} onToggle={panels.toggle(explainKey)}>
          {String(feedback.explanation ?? '').trim()
            ? <ExplanationCard text={feedback.explanation} />
            : <p className="muted small">Câu này chưa có hướng dẫn giải.</p>}
        </StudyPanel>
      )}
    </article>
  )
}

// Script, bản dịch câu hỏi và từ vựng dùng chung cho nhóm. Bản dịch đoạn văn nằm trong khung ngữ cảnh.
export function RevealPanels({ questions, answers, hasPassage, panels: { open, toggle } }) {
  const revealed = questions.filter((q) => answers[q.questionId]?.feedback)
  if (!revealed.length) return null
  const first = answers[revealed[0].questionId].feedback
  const transcript = !hasPassage && first.transcriptEn
  const translation = !hasPassage && first.translationVi?.trim()
  const vocab = []
  const seen = new Set()
  for (const q of revealed) for (const v of answers[q.questionId].feedback.vocabularies || []) if (!seen.has(v.vocabId)) { seen.add(v.vocabId); vocab.push(v) }
  if (!transcript && !translation && !vocab.length) return null

  return (
    <div className="study-panels">
      {(transcript || translation) && (
        <StudyPanel icon="languages" label={transcript ? 'Script & bản dịch' : 'Bản dịch'} open={open.transcript} onToggle={toggle('transcript')}>
          {transcript ? <TranscriptContent english={transcript} vietnamese={translation} /> : <p className="preserve-lines" lang="vi">{translation}</p>}
        </StudyPanel>
      )}
      {vocab.length > 0 && (
        <StudyPanel icon="text" label={`Từ vựng nên học (${vocab.length})`} tone="warning" open={open.vocab} onToggle={toggle('vocab')}>
          <VocabCards vocabularies={vocab} questionId={revealed[0].questionId} />
        </StudyPanel>
      )}
    </div>
  )
}
