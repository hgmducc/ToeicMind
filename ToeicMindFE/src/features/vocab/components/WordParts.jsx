import { Icon } from '../../../components/ui/Icon.jsx'
import { Pill } from '../../../components/ui/Badges.jsx'
import { CLS_LABEL } from '../engine/scoring.js'
import { MODES } from '../engine/modeCatalog.js'
import { SpeakButton } from '../modes/SpeakButton.jsx'

export function FamiliarityBadge({ level }) {
  if (!level) return null
  return <Pill tone={level.tone === 'default' ? undefined : level.tone}>{level.label}</Pill>
}

export function WordLine({ word }) {
  return (
    <span className="word-line">
      <b>{word.lemma}</b> <i className="muted small">{word.posCode}</i>
      {word.ipaUs && <span className="muted small"> /{word.ipaUs}/</span>}
      <span> — {word.meaningVi}</span>
      <SpeakButton text={word.lemma} compact />
    </span>
  )
}

const CLS_TONE = { wrong: 'danger', slow: 'warning', good: 'success', fast: 'success' }
const CLS_ICON = { wrong: 'x', slow: 'clock', good: 'check', fast: 'check' }

// Kết quả từng câu của một từ: "Trắc nghiệm ✓ · Điền từ ✗ · …".
export function ResultChips({ results }) {
  return (
    <span className="tag-row">
      {results.map((result, i) => (
        <Pill key={i} tone={CLS_TONE[result.cls]} title={CLS_LABEL[result.cls]}>
          <Icon name={CLS_ICON[result.cls]} size={12} />{MODES[result.mode]?.short || result.mode}
        </Pill>
      ))}
    </span>
  )
}
