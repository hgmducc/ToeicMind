import { useRef, useState } from 'react'
import { useToast } from '../../../providers/toastContext.js'
import { lettersOf, maskWord, shuffle } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

// Tỉ lệ chữ bị ẩn: mức 1 30% (ưu tiên nguyên âm, giữ chữ đầu) · 45% · 60% · mức 4 75% và ẩn nghĩa.
const HIDE_RATIO = [0.3, 0.45, 0.6, 0.75]

function pickMissing(lemma, level) {
  const chars = lemma.split('')
  const letterIndexes = chars.map((ch, i) => (/[a-z]/i.test(ch) ? i : -1)).filter((i) => i >= 0)
  let pool = level <= 1 ? letterIndexes.slice(1) : letterIndexes.slice()
  pool = level === 0
    ? [...shuffle(pool.filter((i) => /[aeiou]/i.test(chars[i]))), ...shuffle(pool.filter((i) => !/[aeiou]/i.test(chars[i])))]
    : shuffle(pool)
  const count = Math.max(1, Math.min(pool.length, Math.round(letterIndexes.length * HIDE_RATIO[level])))
  return new Set(pool.slice(0, count))
}

export default function MissingMode({ item, level, onAnswer }) {
  const word = item.word
  const toast = useToast()
  const chars = word.lemma.split('')
  const [missing] = useState(() => pickMissing(word.lemma, level))
  const [values, setValues] = useState(() => Object.fromEntries([...missing].map((i) => [i, ''])))
  const [locked, setLocked] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [hintedAt, setHintedAt] = useState(() => new Set())
  const [showMeaning, setShowMeaning] = useState(level < 3)
  const refs = useRef({})
  const elapsed = useElapsed()
  const order = [...missing].sort((a, b) => a - b)
  const definition = word.definitionEn ? ` · ${maskWord(word.definitionEn, word.lemma)}` : ''

  // Chuyển ô theo hướng `step`, bỏ qua các ô đã được gợi ý (bị khóa).
  function focusFrom(position, step) {
    for (let p = position; p >= 0 && p < order.length; p += step) {
      if (!hintedAt.has(order[p])) { refs.current[order[p]]?.focus(); return }
    }
  }

  function change(index, raw) {
    const letter = raw.replace(/[^a-z]/gi, '').slice(-1).toLowerCase()
    setValues((current) => ({ ...current, [index]: letter }))
    if (letter) focusFrom(order.indexOf(index) + 1, 1)
  }

  function check() {
    if (locked) return
    if (order.some((i) => !values[i])) { toast('Hãy điền đủ các chữ cái còn thiếu.'); return }
    setLocked(true)
    const ok = order.every((i) => values[i] === chars[i].toLowerCase())
    onAnswer({ ok, ms: elapsed(), hint: hinted, note: ok ? null : <>Đáp án: <b>{word.lemma}</b></> })
  }

  function hint() {
    if (locked) return
    setHinted(true)
    if (!showMeaning) { setShowMeaning(true); return }
    const target = order.find((i) => !hintedAt.has(i) && values[i] !== chars[i].toLowerCase())
    if (target === undefined) return
    setValues((current) => ({ ...current, [target]: chars[target].toLowerCase() }))
    setHintedAt((current) => new Set(current).add(target))
    const next = order.find((i) => i > target && !hintedAt.has(i))
    if (next !== undefined) refs.current[next]?.focus()
  }

  function onKeyDown(event, index) {
    const position = order.indexOf(index)
    if (event.key === 'Enter') { event.preventDefault(); check() }
    else if (event.key === 'Backspace' && !values[index]) { event.preventDefault(); focusFrom(position - 1, -1) }
    else if (event.key === 'ArrowLeft') focusFrom(position - 1, -1)
    else if (event.key === 'ArrowRight') focusFrom(position + 1, 1)
  }

  return (
    <>
      <div className="vq-prompt">
        <p className="vq-sub">Điền các chữ cái còn thiếu</p>
        {showMeaning ? (
          <>
            <p className="vq-big vq-big--sm">{word.meaningVi}</p>
            <p className="muted small">{word.posCode}{definition}</p>
          </>
        ) : (
          <>
            <p className="muted">{word.posCode}{definition}</p>
            <p className="muted small">Nghe phát âm hoặc bấm “Gợi ý” để xem nghĩa tiếng Việt.</p>
          </>
        )}
        <SpeakButton text={word.lemma} />
      </div>
      <div className="vq-letters">
        {chars.map((ch, i) => {
          if (!missing.has(i)) return ch === ' ' ? <span key={i} className="vq-letter vq-letter--gap" /> : <span key={i} className="vq-letter">{ch}</span>
          const state = locked ? (values[i] === ch.toLowerCase() ? 'correct' : 'wrong') : hintedAt.has(i) ? 'hinted' : undefined
          return (
            <input key={i} ref={(el) => { refs.current[i] = el }} className="vq-missing" data-state={state} value={values[i]} maxLength={2} disabled={locked || hintedAt.has(i)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label={`Chữ cái thứ ${i + 1}`} autoFocus={i === order[0]}
              onChange={(event) => change(i, event.target.value)} onKeyDown={(event) => onKeyDown(event, i)} />
          )
        })}
      </div>
      <div className="vq-row">
        <button type="button" className="btn btn-primary" onClick={check} disabled={locked}>Kiểm tra</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={hint} disabled={locked}>Gợi ý</button>
      </div>
      <p className="sr-only">{lettersOf(word.lemma).length} chữ cái</p>
    </>
  )
}
