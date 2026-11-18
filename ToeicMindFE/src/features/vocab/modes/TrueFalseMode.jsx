import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useHotkeys } from '../../../hooks/useHotkeys.js'
import { clozeOf, maskWord, pickDistractors } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

// Mức 1: từ = nghĩa · 2: nghĩa gây nhiễu cùng từ loại · 3: từ = định nghĩa tiếng Anh · 4: từ có hợp với câu ví dụ không.
function buildStatement(item, level, env) {
  const word = item.word
  const cloze = level >= 3 ? clozeOf(item) : null
  let kind = 'meaning'
  let other = null
  if (cloze) {
    other = pickDistractors(env, item, 'lemma', 1, level)[0]
    if (other) kind = 'cloze'
  }
  if (kind === 'meaning' && level >= 2 && word.definitionEn) {
    other = pickDistractors(env, item, 'definitionEn', 1, level)[0]
    if (other) kind = 'definition'
  }
  if (kind === 'meaning') other = pickDistractors(env, item, 'meaningVi', 1, level)[0]
  const truth = other ? Math.random() < 0.5 : true
  return { kind, other, truth, cloze }
}

export default function TrueFalseMode({ item, level, env, onAnswer }) {
  const word = item.word
  const [statement] = useState(() => buildStatement(item, level, env))
  const [answer, setAnswer] = useState(null)
  const elapsed = useElapsed()
  const { kind, other, truth, cloze } = statement

  let body
  let reveal
  if (kind === 'cloze') {
    body = (
      <>
        <p className="vq-sub">Từ in đậm có điền đúng vào câu không?</p>
        <p className="vq-statement vq-sentence">{cloze.before}<b>{truth ? cloze.form : other.lemma}</b>{cloze.after}</p>
        {cloze.vi && <p className="muted small">{cloze.vi}</p>}
      </>
    )
    reveal = <>Từ đúng của câu là <b>{cloze.form}</b>.</>
  } else if (kind === 'definition') {
    body = (
      <>
        <p className="vq-sub">Định nghĩa này đúng với từ nào?</p>
        <p className="vq-statement"><b>{word.lemma}</b> = “{maskWord(truth ? word.definitionEn : other.definitionEn, word.lemma)}”</p>
      </>
    )
    reveal = <><b>{word.lemma}</b> = “{word.definitionEn}”</>
  } else {
    body = (
      <>
        <p className="vq-sub">Nhận định này đúng hay sai?</p>
        <p className="vq-statement"><b>{word.lemma}</b> <span className="muted small">({word.posCode})</span> có nghĩa là <b>{truth ? word.meaningVi : other.meaningVi}</b></p>
      </>
    )
    reveal = <><b>{word.lemma}</b> có nghĩa là <b>{word.meaningVi}</b>.</>
  }

  function choose(value) {
    if (answer !== null) return
    setAnswer(value)
    const ok = (value === 1) === truth
    onAnswer({ ok, ms: elapsed(), note: ok ? null : <>Nhận định này {truth ? 'đúng' : 'sai'}. {reveal}</> })
  }
  useHotkeys((event) => {
    const key = event.key.toLowerCase()
    if (key === 't' || key === '1' || key === 'arrowleft') choose(1)
    else if (key === 'f' || key === '2' || key === 'arrowright') choose(0)
  })

  const stateOf = (value) => {
    if (answer === null) return undefined
    if ((value === 1) === truth) return 'correct'
    return answer === value ? 'wrong' : undefined
  }

  return (
    <>
      <div className="vq-prompt">{body}<SpeakButton text={word.lemma} /></div>
      <div className="vq-tf">
        {[[1, 'T', 'Đúng'], [0, 'F', 'Sai']].map(([value, letter, label]) => (
          <button key={value} type="button" className="vq-opt" data-state={stateOf(value)} disabled={answer !== null} onClick={() => choose(value)}>
            <b>{letter}</b><span>{label}</span>
            {stateOf(value) === 'correct' && <Icon name="check" size={16} className="vq-opt-mark" />}
            {stateOf(value) === 'wrong' && <Icon name="x" size={16} className="vq-opt-mark" />}
          </button>
        ))}
      </div>
    </>
  )
}
