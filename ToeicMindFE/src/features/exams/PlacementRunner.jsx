import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { PART_NAMES, formatClock } from '../../lib/format.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { GroupMedia, Passage } from './components/QuestionParts.jsx'
import { abandonAttempt, getAttempt, saveAnswer, submitAttempt } from './services/examApi.js'

const mediaMap = (groups) => Object.fromEntries((groups || []).map((group) => [group.groupId, group.media || []]))

// Kiểm tra đầu vào (EXAM, Scope PLACEMENT): nội dung gửi kèm lượt, đồng hồ theo máy chủ, không báo đúng/sai, đổi đáp án tới khi nộp.
// Part 1–2 chỉ hiện A/B/C như thi thật. Số câu đánh lại 1..N theo thứ tự Admin sắp.
export default function PlacementRunner({ attempt: initial, title }) {
  const id = initial.attemptId
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const groups = useMemo(() => initial.content || [], [initial])
  const partNos = useMemo(() => [...new Set(groups.map((g) => g.partNo))].sort((a, b) => a - b), [groups])
  const [media, setMedia] = useState(() => mediaMap(groups))
  const [selected, setSelected] = useState(() => Object.fromEntries(initial.questions.map((q) => [q.questionId, q.selectedOptionId || null])))
  const [current, setCurrent] = useState(partNos[0])
  const [clock, setClock] = useState(initial.remainingSeconds)
  const [busy, setBusy] = useState(false)
  const deadline = useRef(0)
  const done = useRef(false)
  const refreshing = useRef(false)

  const numbers = useMemo(() => {
    const map = new Map()
    let n = 0
    partNos.forEach((p) => groups.filter((g) => g.partNo === p).forEach((g) => g.questions.forEach((q) => map.set(q.questionId, ++n))))
    return map
  }, [groups, partNos])
  const partOf = useMemo(() => new Map(groups.flatMap((g) => g.questions.map((q) => [q.questionId, g.partNo]))), [groups])
  const total = numbers.size
  const answered = Object.values(selected).filter(Boolean).length

  const finish = useCallback((message) => {
    if (done.current) return
    done.current = true
    if (message) toast(message)
    navigate(paths.result(id), { replace: true })
  }, [id, navigate, toast])

  // Đồng hồ hiển thị theo hạn chót của máy chủ; đồng bộ lại mỗi 30 giây. Hết giờ: máy chủ tự nộp ở lần truy cập này.
  useEffect(() => {
    deadline.current = Date.now() + (initial.remainingSeconds ?? 0) * 1000
    let ticks = 0
    const timer = setInterval(async () => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setClock(left)
      if (++ticks % 30 === 0 || left === 0) {
        try {
          const fresh = await getAttempt(id)
          if (fresh.status !== 'IN_PROGRESS') finish('Đã hết giờ, bài được tự nộp.')
          else if (fresh.remainingSeconds != null) deadline.current = Date.now() + fresh.remainingSeconds * 1000
        } catch { /* Thử lại ở nhịp sau. */ }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [id, finish, initial.remainingSeconds])

  useEffect(() => {
    const guard = (event) => { if (!done.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])

  const refreshMedia = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    try { const fresh = await getAttempt(id); setMedia((prev) => ({ ...prev, ...mediaMap(fresh.content) })) } catch { /* Bỏ qua. */ }
    finally { setTimeout(() => { refreshing.current = false }, 3000) }
  }, [id])

  async function pick(questionId, optionId) {
    const previous = selected[questionId]
    const next = previous === optionId ? null : optionId
    setSelected((prev) => ({ ...prev, [questionId]: next }))
    try {
      await saveAnswer(id, questionId, next)
    } catch (error) {
      setSelected((prev) => ({ ...prev, [questionId]: previous }))
      if (error.code === 'ATTEMPT_EXPIRED' || error.code === 'ATTEMPT_NOT_IN_PROGRESS') finish('Đã hết giờ, bài được tự nộp.')
      else toast(error.message, 'error')
    }
  }

  async function submit() {
    const left = total - answered
    const ok = await confirm({
      title: 'Nộp bài kiểm tra', okLabel: 'Nộp bài',
      message: left ? <>Bạn còn <b>{left}</b> câu chưa trả lời (tính là sai). Nộp bài ngay?</> : 'Bạn đã trả lời tất cả các câu. Nộp bài?',
    })
    if (!ok) return
    setBusy(true)
    try { await submitAttempt(id); finish() } catch (error) { setBusy(false); toast(error.message, 'error') }
  }

  async function abandon() {
    if (!(await confirm({ title: 'Bỏ dở bài kiểm tra?', message: 'Bài sẽ không được chấm. Bạn có thể làm lại từ đầu sau.', danger: true, okLabel: 'Bỏ dở' }))) return
    try { await abandonAttempt(id); done.current = true; toast('Đã bỏ dở bài kiểm tra.'); navigate('/placement', { replace: true }) } catch (error) { toast(error.message, 'error') }
  }

  function jump(questionId) {
    const part = partOf.get(questionId)
    if (part !== current) setCurrent(part)
    setTimeout(() => document.getElementById(`q${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), part !== current ? 60 : 0)
  }

  return (
    <div className="run">
      <header className="run-top">
        <span className="run-title">{title}</span>
        <Pill tone="accent">Kiểm tra đầu vào</Pill>
        <span className="spacer" />
        <span className="muted small" aria-live="polite">Đã làm <b>{answered}/{total}</b></span>
        {clock != null && <span className="exam-clock" role="timer" aria-label="Thời gian còn lại" data-low={clock < 300}>{formatClock(clock)}</span>}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { done.current = true; navigate('/placement') }}><Icon name="pause" size={14} />Tạm dừng</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>Nộp bài</button>
      </header>

      <div className="run-layout">
        <div className="run-main">
          {partNos.length > 1 && (
            <div className="part-tabs" role="tablist" aria-label="Chọn Part">
              {partNos.map((p) => (
                <button key={p} type="button" role="tab" aria-selected={p === current} className="part-tab" data-active={p === current} onClick={() => setCurrent(p)}>
                  Part {p}<small>{groups.filter((g) => g.partNo === p).reduce((sum, g) => sum + g.questions.length, 0)} câu</small>
                </button>
              ))}
            </div>
          )}
          {groups.filter((g) => g.partNo === current).map((group) => {
            const list = group.questions.map((q) => numbers.get(q.questionId))
            const first = Math.min(...list), last = Math.max(...list)
            return (
              <section key={group.groupId} className="group" data-hide-text={group.partNo <= 2}>
                <h2 className="group-title">Câu {first === last ? first : `${first}–${last}`}<Pill>Part {group.partNo} · {PART_NAMES[group.partNo] || ''}</Pill></h2>
                <GroupMedia media={media[group.groupId] ?? group.media} loadingAudio={group.partNo <= 4} onMediaError={refreshMedia} />
                <Passage html={group.passageHtml} />
                {group.questions.map((question) => (
                  <div key={question.questionId} className="q" id={`q${question.questionId}`} data-answered="false">
                    {group.questions.length > 1 && <div className="q-head"><b>Câu {numbers.get(question.questionId)}</b></div>}
                    {question.questionText && <p className="q-text">{question.questionText}</p>}
                    <div className="options" role="radiogroup" aria-label={`Đáp án câu ${numbers.get(question.questionId)}`}>
                      {question.options.map((option) => (
                        <button key={option.optionId} type="button" className="option" role="radio" aria-checked={selected[question.questionId] === option.optionId}
                          data-state={selected[question.questionId] === option.optionId ? 'selected' : undefined} onClick={() => pick(question.questionId, option.optionId)}>
                          <b>{option.optionLabel}</b><span className="option-text">{option.optionText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>

        <aside className="run-nav" aria-label="Danh sách câu">
          {partNos.map((p) => (
            <div key={p}>
              <h3 className="group-label">Part {p}</h3>
              <div className="num-grid">
                {[...numbers.keys()].filter((qid) => partOf.get(qid) === p).map((qid) => (
                  <button key={qid} type="button" data-state={selected[qid] ? 'selected' : undefined} aria-label={`Câu ${numbers.get(qid)}${selected[qid] ? ', đã chọn' : ''}`} onClick={() => jump(qid)}>{numbers.get(qid)}</button>
                ))}
              </div>
            </div>
          ))}
          <p className="muted small run-legend"><span className="legend-swatch" data-state="selected" />đã chọn · bấm lại đáp án để bỏ chọn</p>
          <button type="button" className="text-link bad-text" onClick={abandon}>Bỏ dở bài này</button>
        </aside>
      </div>
    </div>
  )
}
