import { useEffect, useState } from 'react'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useHotkeys } from '../../../hooks/useHotkeys.js'
import { idOf, maskWord, pickDistractors, pronunciationOf, shuffle } from '../engine/text.js'
import { SpeakButton } from './SpeakButton.jsx'
import { useElapsed } from './useElapsed.js'

// Mức 1: từ → nghĩa (3 đáp án) · 2: 4 đáp án cùng từ loại · 3: nghĩa → từ · 4: 5 đáp án chữ viết gần giống.
const OPTION_COUNT = [3, 4, 4, 5]

export default function QuizMode({ item, level, env, onAnswer, onSkip }) {
  const word = item.word
  const reverse = level >= 2
  const key = reverse ? 'lemma' : 'meaningVi'
  const [options] = useState(() => shuffle([word, ...pickDistractors(env, item, key, OPTION_COUNT[level] - 1, level)]))
  const [picked, setPicked] = useState(null)
  const elapsed = useElapsed()

  useEffect(() => { if (options.length < 2) onSkip() }, [options.length, onSkip])

  function choose(index) {
    if (picked !== null || !options[index]) return
    setPicked(index)
    onAnswer({ ok: idOf(options[index]) === idOf(word), ms: elapsed() })
  }
  useHotkeys((event) => { if (/^[1-9]$/.test(event.key)) choose(Number(event.key) - 1) })

  const stateOf = (option, index) => {
    if (picked === null) return undefined
    if (idOf(option) === idOf(word)) return 'correct'
    return index === picked ? 'wrong' : undefined
  }

  return (
    <>
      <div className="vq-prompt">
        {reverse ? (
          <>
            <p className="vq-sub">Chọn từ tiếng Anh đúng</p>
            <p className="vq-big vq-big--sm">{word.meaningVi}</p>
            <p className="muted small">{word.posCode}{word.definitionEn ? ` · ${maskWord(word.definitionEn, word.lemma)}` : ''}</p>
          </>
        ) : (
          <>
            <p className="vq-sub">Chọn nghĩa đúng</p>
            <p className="vq-big">{word.lemma}</p>
            <p className="muted small">{word.posCode}{pronunciationOf(word)}</p>
            <SpeakButton text={word.lemma} />
          </>
        )}
      </div>
      <div className="vq-opts">
        {options.map((option, index) => {
          const state = stateOf(option, index)
          return (
            <button key={idOf(option)} type="button" className="vq-opt" data-state={state} disabled={picked !== null} onClick={() => choose(index)}>
              <b>{index + 1}</b><span>{option[key]}</span>
              {state === 'correct' && <Icon name="check" size={16} className="vq-opt-mark" />}
              {state === 'wrong' && <Icon name="x" size={16} className="vq-opt-mark" />}
            </button>
          )
        })}
      </div>
    </>
  )
}
