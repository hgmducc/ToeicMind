import { useState } from 'react'
import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { speak } from '../../../lib/speech.js'
import { useToast } from '../../../providers/toastContext.js'
import { saveMyVocab } from '../../vocab/services/vocabApi.js'
import { ReportDialog } from '../../reports/ReportDialog.jsx'
import { explanationSteps, pairTranscript, parseOptionAnalysis, splitSpeaker } from '../answerDetails.js'

// Khối đáp án chi tiết của một câu, tách thành 3 phần độc lập: Giải thích, Phân tích các đáp án, Từ vựng liên quan.
// Dùng ở trang Đáp án chi tiết (sau khi nộp) và khi Luyện tập hiện đáp án từng câu.

function DetailCard({ icon, title, kind, action, children }) {
  return (
    <section className="detail-card" data-kind={kind}>
      <header className="detail-card-head">
        <span className="detail-icon" aria-hidden="true"><Icon name={icon} size={15} /></span>
        <h4 className="detail-title">{title}</h4>
        {action}
      </header>
      {children}
    </section>
  )
}

export function ExplanationCard({ text }) {
  const { steps, tips } = explanationSteps(text)
  if (!steps.length && !tips.length) return null
  const numbered = steps.some((step) => step.label)
  return (
    <DetailCard icon="info" title="Giải thích" kind="explain">
      {numbered ? (
        <ol className="detail-steps">
          {steps.map((step, index) => (
            <li key={index}>{step.label && <span className="step-label">{step.label}</span>}<span>{step.text}</span></li>
          ))}
        </ol>
      ) : steps.map((step, index) => <p key={index} className="detail-text">{step.text}</p>)}
      {tips.map((tip, index) => (
        <p key={index} className="detail-tip"><Icon name="sparkles" size={14} /><span><b>{tip.label}:</b> {tip.text}</span></p>
      ))}
    </DetailCard>
  )
}

// options: phương án của câu (để lấy chữ và biết đáp án đúng khi văn bản không ghi Đúng/Sai).
export function OptionAnalysis({ text, options = [], selectedOptionId, correctOptionId }) {
  if (!String(text ?? '').trim()) return null
  const items = parseOptionAnalysis(text)
  return (
    <DetailCard icon="list" title="Phân tích các đáp án" kind="analysis">
      {items ? (
        <ul className="analysis-list">
          {items.map((item, index) => {
            const option = options.find((o) => o.optionLabel === item.label)
            const isCorrectOption = option ? (option.isCorrect ?? (correctOptionId != null ? option.optionId === correctOptionId : undefined)) : undefined
            const correct = item.verdict ? item.verdict === 'correct' : isCorrectOption
            const mine = option && option.optionId === selectedOptionId
            const quote = item.quote || option?.optionText
            return (
              <li key={`${item.label}-${index}`} data-verdict={correct === true ? 'correct' : correct === false ? 'wrong' : undefined}>
                <span className="analysis-label">{item.label}</span>
                <div className="analysis-body">
                  {quote && <p className="analysis-quote">{quote}{mine && <span className="analysis-mine"> · bạn chọn</span>}</p>}
                  <p className="analysis-reason">
                    {correct != null && <Pill tone={correct ? 'success' : 'danger'}>{correct ? 'Đúng' : 'Sai'}</Pill>}
                    {item.reason && <span>{item.reason}</span>}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : <p className="detail-text preserve-lines">{text}</p>}
    </DetailCard>
  )
}

function VocabCard({ vocab, saved, saving, onSave, onReport }) {
  const contextMeaning = vocab.termMeaningVi && vocab.termMeaningVi !== vocab.meaningBase ? vocab.termMeaningVi : null
  return (
    <article className="vocab-card" data-saved={saved}>
      <header className="vocab-card-head">
        <div className="vocab-card-word">
          <b className="vocab-term">{vocab.term}</b>
          <span className="vocab-meta">
            {vocab.pos && <i>{vocab.pos}</i>}
            {vocab.ipa && <span>/{vocab.ipa}/</span>}
          </span>
        </div>
        {vocab.cefr && <Pill tone="accent">{vocab.cefr}</Pill>}
        <button type="button" className="icon-btn" aria-label={`Phát âm ${vocab.term}`} title="Phát âm" onClick={() => speak(vocab.term)}><Icon name="volume" size={16} /></button>
        {onReport && <button type="button" className="icon-btn" aria-label={`Báo lỗi từ ${vocab.term}`} title="Báo lỗi từ này" onClick={() => onReport(vocab)}><Icon name="flag" size={15} /></button>}
      </header>
      <p className="vocab-meaning">{vocab.meaningBase}</p>
      {contextMeaning && <p className="vocab-context">Trong câu: <b>{contextMeaning}</b></p>}
      {vocab.base && vocab.base !== vocab.term && <p className="vocab-context">Từ gốc: <b>{vocab.base}</b></p>}
      {vocab.exampleEn && (
        <p className="vocab-example"><span>{vocab.exampleEn}</span>{vocab.exampleVi && <span className="vocab-example-vi">{vocab.exampleVi}</span>}</p>
      )}
      <button type="button" className={`btn btn-sm btn-block ${saved ? 'vocab-saved' : 'btn-secondary'}`} onClick={() => onSave(vocab)} disabled={saved || saving} aria-label={saved ? `Đã lưu vào bộ từ: ${vocab.term}` : `Lưu vào bộ từ: ${vocab.term}`}>
        <Icon name={saved ? 'check' : 'plus'} size={14} />{saved ? 'Đã lưu vào bộ từ' : saving ? 'Đang lưu…' : 'Lưu vào bộ từ'}
      </button>
    </article>
  )
}

export function VocabCards({ vocabularies = [], questionId }) {
  const toast = useToast()
  const [saved, setSaved] = useState(() => new Set())
  const [saving, setSaving] = useState(() => new Set())
  const [bulk, setBulk] = useState(false)
  const [reporting, setReporting] = useState(null)
  if (!vocabularies.length) return null

  const mark = (setter, vocabId, on) => setter((current) => { const next = new Set(current); if (on) next.add(vocabId); else next.delete(vocabId); return next })

  // Trả 'saved' | 'exists' | lỗi (đã báo toast khi lưu từng từ).
  async function persist(vocab) {
    mark(setSaving, vocab.vocabId, true)
    try {
      await saveMyVocab({ vocabId: vocab.vocabId, sourceQuestionId: questionId || null })
      mark(setSaved, vocab.vocabId, true)
      return 'saved'
    } catch (error) {
      if (error.code === 'VOCAB_EXISTS') { mark(setSaved, vocab.vocabId, true); return 'exists' }
      throw error
    } finally { mark(setSaving, vocab.vocabId, false) }
  }

  async function saveOne(vocab) {
    try {
      const outcome = await persist(vocab)
      toast(outcome === 'exists' ? `“${vocab.term}” đã có trong bộ từ.` : `Đã lưu “${vocab.term}” vào bộ từ của bạn.`, outcome === 'exists' ? 'info' : 'success')
    } catch (error) { toast(error.message, 'error') }
  }

  const unsaved = vocabularies.filter((vocab) => !saved.has(vocab.vocabId))
  async function saveAll() {
    setBulk(true)
    let count = 0
    for (const vocab of unsaved) {
      try { await persist(vocab); count += 1 } catch (error) { toast(error.message, 'error'); break }
    }
    setBulk(false)
    if (count) toast(`Đã lưu ${count} từ vào bộ từ của bạn.`, 'success')
  }

  return (
    <DetailCard
      icon="text" title={`Từ vựng liên quan (${vocabularies.length})`} kind="vocab"
      action={unsaved.length > 1 && <button type="button" className="btn btn-outline btn-sm detail-action" onClick={saveAll} disabled={bulk}><Icon name="plus" size={14} />{bulk ? 'Đang lưu…' : `Lưu tất cả (${unsaved.length})`}</button>}
    >
      <div className="vocab-cards">
        {vocabularies.map((vocab) => (
          <VocabCard key={vocab.vocabId} vocab={vocab} saved={saved.has(vocab.vocabId)} saving={saving.has(vocab.vocabId) || bulk} onSave={saveOne} onReport={setReporting} />
        ))}
      </div>
      {reporting && <ReportDialog targetType="VOCABULARY" targetId={reporting.vocabId} subtitle={`Từ: ${reporting.term}`} onClose={() => setReporting(null)} />}
    </DetailCard>
  )
}

export function AnswerDetails({ explanation, optionExplanations, options, selectedOptionId, correctOptionId, vocabularies, questionId }) {
  const hasAny = String(explanation ?? '').trim() || String(optionExplanations ?? '').trim() || (vocabularies || []).length
  if (!hasAny) return <p className="muted small">Câu này chưa có giải thích.</p>
  return (
    <div className="answer-details">
      <ExplanationCard text={explanation} />
      <OptionAnalysis text={optionExplanations} options={options} selectedOptionId={selectedOptionId} correctOptionId={correctOptionId} />
      <VocabCards vocabularies={vocabularies || []} questionId={questionId} />
    </div>
  )
}

function TranscriptLine({ text }) {
  const { speaker, text: rest } = splitSpeaker(text)
  return <>{speaker && <b className="transcript-speaker">{speaker}:</b>}{speaker ? ' ' : ''}{rest}</>
}

// Script nghe: ghép từng câu tiếng Anh với bản dịch ngay bên dưới; không ghép được thì hiện hai khối.
// Nội dung script (không có khung thu gọn): dùng trong khối bật/tắt của màn làm bài.
export function TranscriptContent({ english, vietnamese }) {
  const data = pairTranscript(english, vietnamese)
  if (!data) return null
  return (
    <div className="transcript-content">
    {data.pairs ? (
      <ol className="transcript-pairs">
        {data.pairs.map((pair, index) => (
          <li key={index}>
            {pair.label ? <span className="analysis-label">{pair.label}</span> : <span className="transcript-bullet" aria-hidden="true" />}
            <div>
              <p className="transcript-en"><TranscriptLine text={pair.en} /></p>
              {pair.vi && <p className="transcript-vi">{pair.vi}</p>}
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <div className="transcript-cols">
        <div><p className="transcript-col-label">English</p>{data.en.map((line, index) => <p key={index} className="transcript-en"><TranscriptLine text={line} /></p>)}</div>
        {data.vi.length > 0 && <div><p className="transcript-col-label">Tiếng Việt</p>{data.vi.map((line, index) => <p key={index} className="transcript-vi">{line}</p>)}</div>}
      </div>
    )}
    </div>
  )
}

export function Transcript({ english, vietnamese, defaultOpen = false }) {
  const data = pairTranscript(english, vietnamese)
  if (!data) return null
  return (
    <details className="transcript" open={defaultOpen || undefined}>
      <summary><Icon name="headphones" size={14} />Script{data.vi.length ? ' & bản dịch' : ''}</summary>
      <TranscriptContent english={english} vietnamese={vietnamese} />
    </details>
  )
}
