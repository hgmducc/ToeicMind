import { Pill } from '../../../components/ui/Badges.jsx'
import { formatSeconds } from '../../../lib/format.js'
import { CLS_LABEL } from '../engine/scoring.js'
import { FamiliarityBadge, ResultChips, WordLine } from './WordParts.jsx'

const HEAD = { wrong: 'Chưa đúng', slow: 'Đúng, nhưng hơi chậm', good: 'Chính xác!', fast: 'Chính xác và nhanh!' }
const WORST = ['wrong', 'slow', 'good', 'fast']

function CompletedWord({ outcome, results }) {
  const { evaluation } = outcome
  return (
    <div className="vq-evaluation">
      <span>Hoàn tất từ này ({evaluation.total}/{evaluation.total} câu):</span>
      <FamiliarityBadge level={evaluation} />
      <span className="muted small">đúng {evaluation.correct}/{evaluation.total}</span>
      <ResultChips results={results} />
    </div>
  )
}

// Hộp phản hồi sau mỗi câu: đúng/sai, đáp án, câu ví dụ và (khi đủ 2–3 câu) độ quen thuộc của từ.
export function SessionFeedback({ feedback, resultsOf }) {
  const { outcomes, extra } = feedback
  const worst = outcomes.map((o) => o.record.cls).sort((a, b) => WORST.indexOf(a) - WORST.indexOf(b))[0]
  const tone = worst === 'wrong' ? 'wrong' : worst === 'slow' ? 'slow' : 'good'

  if (outcomes.length > 1) {
    return (
      <div className="vq-fb" data-tone={tone} role="status" aria-live="polite">
        <p className="vq-fb-head">Hoàn thành vòng ghép cặp <span className="muted small">· {extra}</span></p>
        {outcomes.map((outcome) => (
          <div key={outcome.id} className="vq-fb-row">
            <div className="vq-fb-line">
              <WordLine word={outcome.item.word} />
              <Pill tone={outcome.record.cls === 'wrong' ? 'danger' : outcome.record.cls === 'slow' ? 'warning' : 'success'}>{CLS_LABEL[outcome.record.cls]}</Pill>
            </div>
            <p className="muted small">Câu {outcome.position}/{outcome.total} của từ này</p>
            {outcome.complete && <CompletedWord outcome={outcome} results={resultsOf(outcome.id)} />}
          </div>
        ))}
      </div>
    )
  }

  const outcome = outcomes[0]
  const word = outcome.item.word
  const example = (outcome.item.contexts || []).find((context) => context.exampleEn)
  return (
    <div className="vq-fb" data-tone={tone} role="status" aria-live="polite">
      <p className="vq-fb-head">
        {HEAD[outcome.record.cls]}
        <span className="muted small"> · {formatSeconds(outcome.record.ms)} giây{outcome.record.hint ? ' · có dùng gợi ý' : ''}</span>
      </p>
      {outcome.note && <p className="vq-fb-note">{outcome.note}</p>}
      <div className="vq-fb-line"><WordLine word={word} /></div>
      {example && <p className="muted small vq-fb-example">{example.exampleEn}{example.exampleVi && <><br />{example.exampleVi}</>}</p>}
      {outcome.complete && <CompletedWord outcome={outcome} results={resultsOf(outcome.id)} />}
    </div>
  )
}
