import { useEffect, useRef, useState } from 'react'
import { speak } from '../../../lib/speech.js'
import { idOf, norm, shuffle } from '../engine/text.js'
import { useElapsed } from './useElapsed.js'

// Nối từ với nghĩa. Mức 4 có thêm 2 nghĩa gây nhiễu. Kết quả từng từ tính theo số lần ghép sai.
export default function MatchMode({ items, level, env, onGroup }) {
  const ids = items.map((item) => idOf(item.word))
  const [board] = useState(() => {
    const inSet = new Set(ids)
    const seen = new Set(items.map((item) => norm(item.word.meaningVi)))
    const decoys = level >= 3 ? shuffle(env.words.filter((w) => !inSet.has(idOf(w)) && norm(w.meaningVi) && !seen.has(norm(w.meaningVi)))).slice(0, 2) : []
    return { left: shuffle(items.map((item) => item.word)), right: shuffle([...items.map((item) => item.word), ...decoys]), decoys: decoys.length }
  })
  const [selectedWord, setSelectedWord] = useState(null)
  const [selectedMeaning, setSelectedMeaning] = useState(null)
  const [matched, setMatched] = useState(() => new Set())
  const [mistakes, setMistakes] = useState(0)
  const [shaking, setShaking] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const errors = useRef(new Map(ids.map((id) => [id, 0])))
  const timer = useRef(0)
  const elapsed = useElapsed()

  useEffect(() => {
    const tick = setInterval(() => setSeconds(Math.round(elapsed() / 1000)), 500)
    return () => { clearInterval(tick); clearTimeout(timer.current) }
  }, [elapsed])

  function finish() {
    const total = elapsed()
    const each = total / items.length
    onGroup(items.map((item) => {
      const wrong = errors.current.get(idOf(item.word)) || 0
      return { item, ok: wrong < 2, cls: wrong === 0 ? undefined : wrong === 1 ? 'slow' : 'wrong', ms: each, note: wrong ? `${wrong} lần ghép sai` : '' }
    }), `${Math.round(total / 1000)} giây · ${mistakes} lần ghép sai`)
  }

  function choose(side, id) {
    if (matched.has(id) || shaking) return
    if (side === 'word') setSelectedWord(id)
    else setSelectedMeaning(id)
    const wordId = side === 'word' ? id : selectedWord
    const meaningId = side === 'meaning' ? id : selectedMeaning
    if (side === 'word') speak(board.left.find((w) => idOf(w) === id)?.lemma || '')
    if (wordId === null || meaningId === null) return
    if (wordId === meaningId) {
      const next = new Set(matched).add(wordId)
      setMatched(next)
      setSelectedWord(null)
      setSelectedMeaning(null)
      if (next.size === items.length) finish()
      return
    }
    errors.current.set(wordId, (errors.current.get(wordId) || 0) + 1)
    if (errors.current.has(meaningId)) errors.current.set(meaningId, errors.current.get(meaningId) + 1)
    setMistakes((count) => count + 1)
    setShaking([wordId, meaningId])
    timer.current = setTimeout(() => { setShaking(null); setSelectedWord(null); setSelectedMeaning(null) }, 380)
  }

  const stateOf = (side, id) => {
    if (matched.has(id)) return 'matched'
    if (shaking && (side === 'word' ? shaking[0] === id : shaking[1] === id)) return 'wrong'
    return (side === 'word' ? selectedWord : selectedMeaning) === id ? 'selected' : undefined
  }

  return (
    <>
      <div className="vq-prompt">
        <p className="vq-sub">Nối từ với nghĩa đúng{board.decoys ? ' (có nghĩa thừa)' : ''}</p>
        <div className="vq-row">
          <span className="pill" aria-live="off">{seconds} giây</span>
          <span className="pill" data-tone={mistakes ? 'warning' : 'muted'}>{mistakes} lần sai</span>
        </div>
      </div>
      <div className="vq-match">
        <div className="vq-match-col">
          {board.left.map((word) => (
            <button key={idOf(word)} type="button" className="vq-match-item" data-state={stateOf('word', idOf(word))} disabled={matched.has(idOf(word))} onClick={() => choose('word', idOf(word))}>{word.lemma}</button>
          ))}
        </div>
        <div className="vq-match-col">
          {board.right.map((word) => (
            <button key={idOf(word)} type="button" className="vq-match-item" data-state={stateOf('meaning', idOf(word))} disabled={matched.has(idOf(word))} onClick={() => choose('meaning', idOf(word))}>{word.meaningVi}</button>
          ))}
        </div>
      </div>
    </>
  )
}
