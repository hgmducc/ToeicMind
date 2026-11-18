import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pill, ProgressBar } from '../../components/ui/Badges.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { stopSpeaking } from '../../lib/speech.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { SessionFeedback } from './components/SessionFeedback.jsx'
import { SessionSummary } from './components/SessionSummary.jsx'
import { MODES } from './engine/modeCatalog.js'
import { adaptLevel, classify, evaluateWord, levelFromProgress } from './engine/scoring.js'
import { idOf } from './engine/text.js'
import { MODE_VIEWS } from './modes/index.js'
import { configToQuery } from './services/sessionLoader.js'
import { reviewVocab } from './services/vocabApi.js'

const KIND_LABEL = { NEW: ['Từ mới', 'accent'], REVIEW: ['Ôn lại', 'warning'] }

// Độ khó của một câu: theo tiến độ đã lưu của từ; ở chế độ tự động còn tăng khi từ đó vừa đúng nhanh, giảm khi vừa sai.
function levelForSlot(slot, results, diff) {
  const levels = slot.items.map((item) => {
    if (diff !== 'auto') return diff
    return adaptLevel(levelFromProgress(item.word), results[idOf(item.word)] || [])
  })
  return Math.round(levels.reduce((sum, value) => sum + value, 0) / levels.length)
}

const Dots = ({ level }) => (
  <span className="vq-dots" role="img" aria-label={`Độ khó ${level + 1}/4`}>
    {[0, 1, 2, 3].map((i) => <i key={i} data-on={i <= level ? 'true' : 'false'} />)}
  </span>
)

export default function VocabSession({ prepared, config, onRestart }) {
  const { slots, plans, env } = prepared
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('ask')
  const [feedback, setFeedback] = useState(null)
  const [results, setResults] = useState({})
  const [saved, setSaved] = useState({})
  const [startedAt] = useState(() => Date.now())
  const resultsRef = useRef({})
  const answeredRef = useRef(false)
  const nextRef = useRef(null)
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans])
  const totalQuestions = useMemo(() => slots.reduce((sum, slot) => sum + slot.items.length, 0), [slots])
  const learnLink = `/vocab/learn?${configToQuery(config)}`
  const wordsLink = `/vocab/words${Object.keys(config.scope).length ? `?${new URLSearchParams(config.scope)}` : ''}`

  const slot = slots[index]
  // Độ khó chốt một lần khi vào câu (không đổi khi vừa trả lời xong).
  const [level, setLevel] = useState(() => levelForSlot(slots[0], {}, config.diff))
  const enterSlot = (target) => {
    answeredRef.current = false
    setIndex(target)
    if (slots[target]) setLevel(levelForSlot(slots[target], resultsRef.current, config.diff))
  }

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => { if (phase === 'feedback') nextRef.current?.focus() }, [phase, index])

  const markSaved = (id, value) => setSaved((current) => ({ ...current, [id]: value }))

  // Mỗi từ được báo lên máy chủ đúng một lần, khi đã đủ 2–3 câu; chỉ từ mới hoặc đã đến hạn mới đổi lịch ôn.
  const saveWord = useCallback((id, item, evaluation) => {
    if (!(item.kind === 'NEW' || item.word.isDue)) { markSaved(id, { state: 'skipped', grade: evaluation.grade }); return }
    markSaved(id, { state: 'saving', grade: evaluation.grade })
    reviewVocab(item.word.vocabId, evaluation.grade).then(
      (result) => markSaved(id, { state: 'saved', grade: evaluation.grade, result }),
      (error) => markSaved(id, { state: 'failed', grade: evaluation.grade, error: error.message }),
    )
  }, [])

  function retrySave() {
    for (const [id, entry] of Object.entries(saved)) {
      if (entry.state !== 'failed') continue
      const plan = planById.get(Number(id)) || planById.get(id)
      if (plan) saveWord(plan.id, plan.item, evaluateWord(resultsRef.current[plan.id]))
    }
  }

  function advance() {
    setFeedback(null)
    if (index + 1 >= slots.length) { answeredRef.current = false; setPhase('done'); return }
    enterSlot(index + 1)
    setPhase('ask')
  }

  function submit(entries, extra) {
    if (answeredRef.current) return
    answeredRef.current = true
    const next = { ...resultsRef.current }
    const outcomes = entries.map((entry) => {
      const id = idOf(entry.item.word)
      const record = {
        mode: slot.mode, level, ms: Math.round(entry.ms || 0), hint: !!entry.hint,
        cls: classify({ ok: entry.ok, ms: entry.ms, hint: entry.hint, cls: entry.cls, mode: slot.mode, level, lemma: entry.item.word.lemma }),
      }
      next[id] = [...(next[id] || []), record]
      const total = planById.get(id).modes.length
      const complete = next[id].length >= total
      return { id, item: entry.item, record, note: entry.note, position: next[id].length, total, complete, evaluation: complete ? evaluateWord(next[id]) : null }
    })
    resultsRef.current = next
    setResults(next)
    outcomes.filter((o) => o.complete).forEach((o) => saveWord(o.id, o.item, o.evaluation))
    // Thẻ tự chấm không cần bảng phản hồi, trừ khi vừa hoàn tất một từ (để thấy độ quen thuộc).
    if (MODES[slot.mode].self && outcomes.every((o) => !o.complete)) { advance(); return }
    setFeedback({ slot, outcomes, extra })
    setPhase('feedback')
  }

  const next = () => { if (answeredRef.current) advance() }
  useHotkeys((event) => { if (event.key === 'Enter') { event.preventDefault(); next() } }, phase === 'feedback')

  // Câu không dựng được (thiếu đáp án gây nhiễu…): bỏ qua, không ghi kết quả.
  const skipRef = useRef(null)
  // useLayoutEffect: cập nhật trước khi effect của component con (dạng câu hỏi) gọi onSkip ở cùng lượt vẽ.
  useLayoutEffect(() => { skipRef.current = () => { toast('Không hiển thị được câu này, đã bỏ qua.', 'error'); advance() } })
  const skip = useCallback(() => skipRef.current?.(), [])

  async function leave() {
    const ok = await confirm({
      title: 'Thoát phiên học?', danger: true, okLabel: 'Thoát',
      message: 'Những từ đã đủ 2–3 câu đã được lưu vào lịch ôn. Từ đang làm dở sẽ không được tính.',
    })
    if (ok) navigate(learnLink)
  }

  if (phase === 'done' || !slot) {
    return (
      <SessionSummary
        plans={plans} results={results} saved={saved} startedAt={startedAt}
        onRestart={onRestart} onRetrySave={retrySave} learnLink={learnLink} wordsLink={wordsLink}
      />
    )
  }

  const View = MODE_VIEWS[slot.mode]
  const answered = Object.values(results).reduce((sum, list) => sum + list.length, 0)
  const wordsDone = plans.filter((plan) => (results[plan.id] || []).length >= plan.modes.length).length
  const single = slot.items.length === 1
  const word = slot.items[0]
  const wordResults = results[idOf(word.word)] || []
  const plan = planById.get(idOf(word.word))
  const [kindLabel, kindTone] = KIND_LABEL[word.kind] || KIND_LABEL.REVIEW

  return (
    <div className="vq-session">
      <div className="vq-top">
        <button type="button" className="btn btn-outline btn-sm" onClick={leave}><Icon name="chevron-left" size={14} />Thoát</button>
        <h1 className="vq-title">Học từ vựng</h1>
        <span className="muted small" aria-live="off">Từ {wordsDone}/{plans.length} · Câu {Math.min(answered + (phase === 'ask' ? 1 : 0), totalQuestions)}/{totalQuestions}</span>
      </div>
      <ProgressBar value={(answered * 100) / totalQuestions} label="Tiến độ phiên học" />
      <p className="muted small vq-intro">Mỗi từ được hỏi bằng 2–3 dạng câu hỏi ngẫu nhiên khác nhau để đánh giá độ quen thuộc.</p>

      <div className={`vq-card${single ? '' : ' vq-card--wide'}`}>
        <div className="vq-meta">
          <Pill><Icon name={MODES[slot.mode].icon} size={12} />{MODES[slot.mode].name}</Pill>
          {single && <Pill tone={kindTone}>{kindLabel}</Pill>}
          {single ? <Pill tone="muted">Câu {wordResults.length + 1}/{plan.modes.length} của từ này</Pill> : <Pill tone="muted">{slot.items.length} từ</Pill>}
          <span className="muted small">Độ khó <Dots level={level} /></span>
        </div>
        <div className="vq-body">
          <View key={slot.key} item={word} items={slot.items} level={level} env={env} onAnswer={(result) => submit([{ item: word, ...result }])} onGroup={(list, extra) => submit(list, extra)} onSkip={skip} />
        </div>
        {phase === 'feedback' && feedback && (
          <div className="vq-feedback">
            <SessionFeedback feedback={feedback} resultsOf={(id) => resultsRef.current[id] || []} />
            <div className="vq-row">
              <button ref={nextRef} type="button" className="btn btn-primary" onClick={next}>
                {index + 1 < slots.length ? 'Câu tiếp (Enter)' : 'Xem kết quả (Enter)'}<Icon name="arrow-right" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="muted small vq-foot"><Link className="text-link" to="/vocab">Về trang từ vựng</Link></p>
    </div>
  )
}
