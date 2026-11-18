import { useRef, useState } from 'react'
import { useHotkeys } from '../../../hooks/useHotkeys.js'
import { speak } from '../../../lib/speech.js'
import { pronunciationOf } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

const GRADES = [['Quên', 0, 'wrong'], ['Khó', 1, 'slow'], ['Nhớ', 2, 'good'], ['Dễ', 3, 'fast']]

// Thẻ lật tự chấm. Mức 1–2: từ → nghĩa · mức 3–4: nghĩa → từ (nhớ chủ động).
export default function FlashMode({ item, level, onAnswer }) {
  const word = item.word
  const reverse = level >= 2
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const thinkMs = useRef(0)
  const elapsed = useElapsed()
  const examples = (item.contexts || []).filter((c) => c.exampleEn).slice(0, 2)

  function flip() {
    if (flipped) return
    thinkMs.current = elapsed()
    setFlipped(true)
    if (!reverse) speak(word.lemma)
  }
  function grade(index) {
    if (done || !flipped) return
    setDone(true)
    onAnswer({ cls: GRADES[index][2], ok: index > 0, ms: thinkMs.current })
  }
  useHotkeys((event) => {
    if (event.code === 'Space') { event.preventDefault(); flip() } else if (flipped && /^[1-4]$/.test(event.key)) grade(Number(event.key) - 1)
  })

  return (
    <>
      <button type="button" className="vq-flip" data-flipped={flipped} onClick={flip}>
        {flipped ? (
          <span className="vq-face vq-face--back">
            {reverse && <><span className="vq-big">{word.lemma}</span><span className="muted">{word.posCode}{pronunciationOf(word)}</span></>}
            <span className="vq-flip-meaning">{word.meaningVi}</span>
            {word.definitionEn && <span className="muted small">{word.definitionEn}</span>}
            {examples.map((context, i) => <span key={i} className="vq-example">{context.exampleEn}{context.exampleVi && <span className="muted">{context.exampleVi}</span>}</span>)}
          </span>
        ) : (
          <span className="vq-face">
            {reverse ? (
              <>
                <span className="vq-sub">Nghĩa tiếng Việt — nhớ từ tiếng Anh</span>
                <span className="vq-big vq-big--sm">{word.meaningVi}</span>
                <span className="muted">{word.posCode}</span>
              </>
            ) : (
              <>
                <span className="vq-sub">Từ tiếng Anh — nhớ nghĩa</span>
                <span className="vq-big">{word.lemma}</span>
                <span className="muted">{word.posCode}{pronunciationOf(word)}{word.cefrLevel ? ` · ${word.cefrLevel}` : ''}</span>
              </>
            )}
          </span>
        )}
      </button>
      {!reverse && !flipped && <div className="vq-row"><SpeakButton text={word.lemma} /></div>}
      {flipped ? (
        <div className="vq-grades" role="group" aria-label="Tự đánh giá">
          {GRADES.map(([label, index], position) => (
            <button key={label} type="button" className="vq-grade" data-grade={index} disabled={done} onClick={() => grade(position)}>{label}<small>phím {index + 1}</small></button>
          ))}
        </div>
      ) : (
        <div className="vq-row"><button type="button" className="btn btn-primary" onClick={flip}>Lật thẻ (Space)</button></div>
      )}
    </>
  )
}
