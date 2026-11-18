import { useRef, useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useHotkeys } from '../../../hooks/useHotkeys.js'
import { blankOf, idOf, norm, pickDistractors, shuffle } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

// Mức 1: chọn 3 đáp án · 2: chọn 4 đáp án cùng từ loại · 3: tự gõ có gợi ý chữ đầu · 4: tự gõ không gợi ý.
export default function FillMode({ item, level, env, onAnswer }) {
  const word = item.word
  const [blank] = useState(() => blankOf(item))
  const [options] = useState(() => (level < 2 ? shuffle([word, ...pickDistractors(env, item, 'lemma', level === 0 ? 2 : 3, level)]) : []))
  const typing = options.length < 2
  const [picked, setPicked] = useState(null)
  const [value, setValue] = useState('')
  const [revealed, setRevealed] = useState(typing && level === 2 ? 1 : 0)
  const [hinted, setHinted] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const inputRef = useRef(null)
  const elapsed = useElapsed()
  const gap = ' '.repeat(Math.max(6, blank.form.length))
  const blankState = outcome === null ? undefined : outcome ? 'correct' : 'wrong'

  const prompt = blank.kind === 'sent' ? (
    <>
      <p className="vq-sentence">{blank.before}<span className="vq-blank" data-state={blankState}>{outcome === null ? gap : blank.form}</span>{blank.after}</p>
      {blank.vi ? <p className="muted small">{blank.vi}</p> : (level < 3 && <p className="muted small">Nghĩa gợi ý: {word.meaningVi}</p>)}
    </>
  ) : (
    <>
      <p className="vq-sentence"><span className="vq-blank" data-state={blankState}>{outcome === null ? gap : blank.form}</span> — {blank.defText}</p>
      {level < 2 && <p className="muted small">Nghĩa gợi ý: {word.meaningVi}</p>}
    </>
  )

  function choose(index) {
    if (picked !== null || !options[index]) return
    const ok = idOf(options[index]) === idOf(word)
    setPicked(index)
    setOutcome(ok)
    onAnswer({ ok, ms: elapsed() })
  }
  useHotkeys((event) => { if (!typing && /^[1-9]$/.test(event.key)) choose(Number(event.key) - 1) }, !typing)

  function check(giveUp) {
    if (outcome !== null) return
    const typed = norm(value)
    if (!giveUp && !typed) return
    const ok = !giveUp && (typed === norm(blank.form) || typed === norm(word.lemma))
    setOutcome(ok)
    onAnswer({ ok, ms: elapsed(), hint: hinted, note: ok ? null : <>Đáp án: <b>{blank.form}</b></> })
  }

  if (!typing) {
    return (
      <>
        <div className="vq-prompt"><p className="vq-sub">Chọn từ điền vào chỗ trống</p>{prompt}</div>
        <div className="vq-opts">
          {options.map((option, index) => {
            const state = picked === null ? undefined : idOf(option) === idOf(word) ? 'correct' : index === picked ? 'wrong' : undefined
            return (
              <button key={idOf(option)} type="button" className="vq-opt" data-state={state} disabled={picked !== null} onClick={() => choose(index)}>
                <b>{index + 1}</b><span>{option.lemma}</span>
                {state === 'correct' && <Icon name="check" size={16} className="vq-opt-mark" />}
                {state === 'wrong' && <Icon name="x" size={16} className="vq-opt-mark" />}
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const letters = revealed ? word.lemma.split('').map((ch, i) => (i < revealed || !/[a-z]/i.test(ch) ? ch : '_')).join(' ') : ''
  return (
    <>
      <div className="vq-prompt">
        <p className="vq-sub">Gõ từ điền vào chỗ trống</p>
        {prompt}
        <p className="vq-hint" aria-live="polite">{letters}</p>
        <SpeakButton text={word.lemma} />
      </div>
      <div className="vq-row">
        <input ref={inputRef} className="input vq-input" type="text" value={value} disabled={outcome !== null} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="Từ cần điền" autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); check(false) } }} />
        <button type="button" className="btn btn-primary" disabled={outcome !== null} onClick={() => check(false)}>Kiểm tra</button>
      </div>
      <div className="vq-row">
        <button type="button" className="btn btn-outline btn-sm" disabled={outcome !== null} onClick={() => { setHinted(true); setRevealed((n) => Math.min(word.lemma.length, n + 1)); inputRef.current?.focus() }}>Gợi ý</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={outcome !== null} onClick={() => check(true)}>Bỏ qua</button>
      </div>
    </>
  )
}
