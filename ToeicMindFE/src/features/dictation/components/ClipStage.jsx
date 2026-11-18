import { useMemo, useRef, useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { flipAccuracy, normWord, pickHidden, sentenceAccuracy, wordsOf } from '../dictationText.js'

// Màn luyện một clip. Có `key` theo (clip, tab, tỉ lệ ẩn) nên state tự reset khi đổi clip/chế độ.
// onDone(accuracy) báo kết quả; chế độ lật từ chấm khi bấm tiếp (onNext nhận độ chính xác).
export function ClipStage({ clip, tab, percentHidden, last, onDone, onNext }) {
  const words = useMemo(() => wordsOf(clip.transcriptEn), [clip])
  const hidden = useMemo(() => pickHidden(words, clip.clipId, percentHidden), [words, clip.clipId, percentHidden])
  const [typed, setTyped] = useState({})
  const [sentence, setSentence] = useState('')
  const [flipped, setFlipped] = useState(() => new Set())
  const [outcome, setOutcome] = useState(null)
  const refs = useRef({})
  const order = [...hidden].sort((a, b) => a - b)
  const nextLabel = last ? <>Hoàn thành <Icon name="check" size={14} /></> : <>Câu tiếp theo <Icon name="chevron-right" size={14} /></>

  function finishWords() {
    if (outcome) return
    let right = 0
    for (const i of order) if (normWord(typed[i] || '') === normWord(words[i])) right++
    const accuracy = (right * 100) / hidden.size
    setOutcome({ kind: 'words', right, accuracy })
    onDone(accuracy)
  }

  function finishSentence(giveUp) {
    if (outcome) return
    const { hit, accuracy } = sentenceAccuracy(words, giveUp ? [] : wordsOf(sentence))
    setOutcome({ kind: 'sentence', hit, accuracy, text: giveUp ? '' : sentence.trim() })
    onDone(accuracy)
  }

  function flip(index) { setFlipped((current) => new Set(current).add(index)) }
  function revealNext(count) {
    setFlipped((current) => {
      const next = new Set(current)
      let added = 0
      for (const i of order) { if (added >= count) break; if (!next.has(i)) { next.add(i); added++ } }
      return next
    })
  }

  const report = outcome && (
    <p className="dict-score" data-ok={outcome.accuracy >= 80}>
      {outcome.kind === 'words' ? `Đúng ${outcome.right}/${hidden.size} từ · ${Math.round(outcome.accuracy)}%` : `Chính xác ${Math.round(outcome.accuracy)}%`}
    </p>
  )

  if (tab === 'CHECK') {
    return (
      <div>
        <p className="muted small">Nghe rồi nhớ lại các từ bị ẩn. Bấm vào ô để lật xem; số từ phải lật càng ít, độ chính xác càng cao.</p>
        <p className="dict-sentence" lang="en">
          {words.map((word, i) => (hidden.has(i) && !flipped.has(i)
            ? <button key={i} type="button" className="dict-word dict-word--hidden" aria-label="Từ bị ẩn, bấm để lật" onClick={() => flip(i)}>{word}</button>
            : <span key={i} className="dict-word">{word}</span>))}
        </p>
        <div className="row">
          <div className="chip-row" role="group" aria-label="Lật từ">
            {[[1, '1 từ'], [2, '2 từ'], [3, '3 từ'], [1e9, 'Tất cả']].map(([count, label]) => <button key={label} type="button" className="chip" data-active="false" onClick={() => revealNext(count)}>Lật {label}</button>)}
          </div>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={() => onNext(flipAccuracy(hidden.size, flipped.size))}>{nextLabel}</button>
        </div>
      </div>
    )
  }

  if (percentHidden >= 100) {
    return (
      <div>
        {!outcome ? (
          <>
            <label className="form-label" htmlFor="dict-answer">Nghe và gõ lại cả câu</label>
            <textarea id="dict-answer" className="textarea" rows={3} value={sentence} spellCheck={false} autoCapitalize="none" placeholder="Gõ vào đây…" autoFocus onChange={(event) => setSentence(event.target.value)} />
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => finishSentence(false)}>Kiểm tra</button>
              <button type="button" className="btn btn-outline" onClick={() => finishSentence(true)}>Xem đáp án</button>
            </div>
          </>
        ) : (
          <>
            <p className="dict-sentence" lang="en">{words.map((word, i) => <span key={i} className={`dict-word dict-word--${outcome.hit[i] ? 'ok' : 'bad'}`}>{word}</span>)}</p>
            <p className="muted small">Bạn gõ: {outcome.text || '(để trống)'}</p>
            {report}
            <div className="row"><span className="spacer" /><button type="button" className="btn btn-primary" onClick={() => onNext()}>{nextLabel}</button></div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="dict-sentence" lang="en">
        {words.map((word, i) => {
          if (!hidden.has(i)) return <span key={i} className="dict-word">{word}</span>
          const state = outcome ? (normWord(typed[i] || '') === normWord(word) ? 'ok' : 'bad') : undefined
          return (
            <span key={i} className="dict-slot">
              <input ref={(el) => { refs.current[i] = el }} className="dict-input" data-state={state} type="text" value={typed[i] || ''} disabled={!!outcome} aria-label={`Từ thứ ${i + 1}`}
                autoComplete="off" spellCheck={false} style={{ width: `${Math.max(5, word.length + 2)}ch` }} autoFocus={i === order[0]}
                onChange={(event) => setTyped({ ...typed, [i]: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  const following = order[order.indexOf(i) + 1]
                  if (following !== undefined) refs.current[following]?.focus(); else if (event.key === 'Enter') finishWords()
                }} />
              {state === 'bad' && <span className="dict-word dict-word--ok">{word}</span>}
            </span>
          )
        })}
      </p>
      {report}
      <div className="row">
        {!outcome ? (
          <><button type="button" className="btn btn-primary" onClick={finishWords}>Kiểm tra</button><button type="button" className="btn btn-outline" onClick={finishWords}>Xem đáp án</button></>
        ) : <><span className="spacer" /><button type="button" className="btn btn-primary" onClick={() => onNext()}>{nextLabel}</button></>}
      </div>
    </div>
  )
}
