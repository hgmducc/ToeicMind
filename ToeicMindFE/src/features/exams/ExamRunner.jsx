import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Loading } from '../../components/ui/Feedback.jsx'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { PART_NAMES, formatClock } from '../../lib/format.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { readExamOptions, readPosition, writePosition } from './examOptions.js'
import { addDirectionTime, getAttempt, getExamDirections, getExamPart, getExamPartMedia, saveAnswer, submitAttempt } from './services/examApi.js'
import { AudioBar } from './workspace/AudioBar.jsx'
import { ContextPane } from './workspace/ContextPane.jsx'
import { QuestionCard } from './workspace/QuestionCard.jsx'
import { QuestionNavigator } from './workspace/QuestionNavigator.jsx'
import { StudyBottom, StudyLayout, StudySolo, StudySplit } from './workspace/StudyLayout.jsx'
import { buildGroupOrder, groupInstruction } from './workspace/studyModel.js'

const audioUrls = (list) => (list || []).filter((m) => m.mediaType === 'AUDIO').map((m) => m.url)
const IDLE = { phase: 'idle', current: 0, duration: 0 }

// Thanh âm thanh của Luyện thi: chỉ hiện tiến độ (không tua, không đổi tốc độ) như thi thật; trình duyệt chặn tự phát thì có nút phát.
function ExamAudio({ seed, audio }) {
  return <AudioBar seed={seed} controls={false} current={audio.current} duration={audio.duration} playing={audio.phase === 'playing'} blocked={audio.phase === 'blocked'} onToggle={audio.resume} />
}

// Nút đếm câu ở thanh dưới: mở bảng câu hỏi (chỉ xem tiến độ, Luyện thi không quay lại).
function Counter({ label, onOpen }) {
  return <button type="button" className="btn btn-secondary btn-sm study-counter" onClick={onOpen} aria-haspopup="dialog" aria-label={`Danh sách câu hỏi, ${label}`}><Icon name="grid" size={16} />{label}</button>
}

// Một bước của bài thi (hướng dẫn / nhóm câu / kết thúc). Component có `key` theo bước nên mọi state âm thanh tự reset khi đổi bước.
function ExamStep({ attemptId, step, index, steps, total, numbering, selected, answeredCount, busy, engine, options, partNos, media, counter, onOpenNav, onChoose, onNext, onSubmit }) {
  const [audio, setAudio] = useState(IDLE)
  const [note, setNote] = useState('')
  const listening = step.t === 'grp' && step.part <= 4
  const [showNext, setShowNext] = useState(step.t === 'dir' || (step.t === 'grp' && (!listening || !options.autoNext)))
  const timer = useRef(0)
  const hideText = step.t === 'grp' && step.part <= 2

  useEffect(() => {
    engine.save(index)
    document.querySelectorAll('.study-pane, .study-solo').forEach((pane) => { pane.scrollTop = 0 })
    let cancelled = false
    let directionStart = null
    const advanceLater = () => { timer.current = setTimeout(onNext, 700) }
    const progress = (pct, label, current, duration) => setAudio((value) => ({ ...value, phase: 'playing', current, duration }))

    if (step.t === 'dir') {
      engine.freezeClock()
      directionStart = Date.now()
      const urls = audioUrls(step.d.media)
      const run = () => engine.play(urls, {
        onProgress: progress,
        onEnd: () => { setAudio((value) => ({ ...value, phase: 'ended', current: value.duration })); if (options.autoNext) advanceLater() },
        onBlocked: (resume) => setAudio({ ...IDLE, phase: 'blocked', resume }),
        onFail: () => { setNote('Không phát được âm thanh hướng dẫn, hãy bấm Bỏ qua.'); setAudio((value) => ({ ...value, phase: 'failed' })) },
      })
      if (urls.length) { if (options.autoDirections) run(); else setAudio({ ...IDLE, phase: 'blocked', resume: run }) }
    } else if (step.t === 'grp' && listening) {
      ;(async () => {
        await engine.ensureMedia(step.part)
        if (cancelled) return
        const nextPart = partNos[partNos.indexOf(step.part) + 1]
        if (nextPart) engine.ensureMedia(nextPart)
        const urls = audioUrls(engine.mediaOf(step.g.groupId) || step.g.media)
        if (!urls.length) { setNote('Câu này không có âm thanh.'); setShowNext(true); return }
        setShowNext(!options.autoNext)
        let retried = false
        const run = (list) => engine.play(list, {
          onProgress: progress,
          onEnd: () => { setAudio((value) => ({ ...value, phase: 'ended', current: value.duration })); if (options.autoNext) advanceLater(); else setShowNext(true) },
          onBlocked: (resume) => { setAudio({ ...IDLE, phase: 'blocked', resume }); setShowNext(true) },
          onFail: async () => {
            if (!retried) {                                      // link ký hết hạn: lấy lại một lần
              retried = true
              await engine.ensureMedia(step.part, true)
              const fresh = audioUrls(engine.mediaOf(step.g.groupId))
              if (!cancelled && fresh.length) { run(fresh); return }
            }
            setNote('Không phát được âm thanh. Bấm “Câu tiếp” để tiếp tục.')
            setShowNext(true)
          },
        })
        run(urls)
      })()
    } else if (step.t === 'grp') {
      engine.ensureMedia(step.part)
    }

    return () => {
      cancelled = true
      clearTimeout(timer.current)
      engine.stop()
      if (directionStart) engine.thawClock(Math.round((Date.now() - directionStart) / 1000))
    }
    // Một bước = một lần mount (đã có key); hàm trong engine/onNext ổn định.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useHotkeys((event) => {
    if (document.querySelector('dialog[open]')) return
    if (event.key === 'Enter' && step.t === 'grp' && showNext) { event.preventDefault(); onNext(); return }
    if (step.t !== 'grp') return
    const key = event.key.toUpperCase()
    if (!/^[A-D1-4]$/.test(key)) return
    const question = step.g.questions.find((q) => !selected[q.questionId]) || step.g.questions[0]
    const option = question.options['ABCD1234'.indexOf(key) % 4]
    if (option) onChoose(question.questionId, option.optionId)
  })

  const bottom = (tools, action) => (
    <StudyBottom tools={tools}>
      <Counter label={counter} onOpen={onOpenNav} />
      {action}
    </StudyBottom>
  )

  if (step.t === 'dir') {
    const hasAudio = audioUrls(step.d.media).length > 0
    const waiting = hasAudio && audio.phase !== 'ended' && audio.phase !== 'failed'
    return (
      <>
        <div className="study-body">
          <StudySolo>
            <h2 className="study-solo-title">{step.label}</h2>
            {hasAudio && <ExamAudio seed={`dir-${index}`} audio={audio} />}
            {(step.d.media || []).filter((m) => m.mediaType !== 'AUDIO').map((m, i) => <img key={`${m.url}-${i}`} className="study-image" alt={m.altText || 'Hình minh họa'} src={m.url} />)}
            <p className="preserve-lines study-direction">{step.d.directionsEn}</p>
            {/* Hướng dẫn chỉ hiện tiếng Anh như đề thi thật; không hiện bản dịch tiếng Việt (directionsVi, exampleVi). */}
            {step.d.exampleEn && <p className="passage small preserve-lines"><b>Example</b><br />{step.d.exampleEn}</p>}
          </StudySolo>
        </div>
        {bottom(
          <span className="study-note muted small" role={note ? 'alert' : undefined}>{note || 'Thời gian xem hướng dẫn không tính vào giờ làm bài.'}</span>,
          <button type="button" className={`btn btn-sm ${waiting ? 'btn-outline' : 'btn-primary'}`} onClick={onNext}>{waiting ? 'Bỏ qua phần này' : 'Tiếp tục'}<Icon name="chevron-right" size={14} /></button>,
        )}
      </>
    )
  }

  if (step.t === 'end') {
    return (
      <>
        <div className="study-body">
          <StudySolo>
            <div className="study-end">
              <span className="study-end-icon" aria-hidden="true"><Icon name="circle-check" size={32} /></span>
              <h2 className="study-solo-title">Bạn đã hoàn thành phần thi</h2>
              <p>{total - answeredCount ? <>Còn <b>{total - answeredCount}</b> câu chưa trả lời (tính là sai).</> : 'Bạn đã trả lời tất cả các câu.'} Bấm Nộp bài để xem kết quả, bảng đáp án và giải thích.</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => onSubmit(true)} disabled={busy}>Nộp bài</button>
            </div>
          </StudySolo>
        </div>
        {bottom(<span className="study-note muted small">Đã trả lời {answeredCount}/{total} câu.</span>, null)}
      </>
    )
  }

  const numbers = step.g.questions.map((q) => numbering.get(q.questionId))
  const first = Math.min(...numbers), last = Math.max(...numbers)
  const groupMedia = media[step.g.groupId] || step.g.media
  return (
    <>
      <div className="study-body">
        <StudySplit
          left={<ContextPane instruction={groupInstruction(step.part, first, last)} audio={listening && audioUrls(groupMedia).length > 0 && <ExamAudio seed={step.g.groupId} audio={audio} />}
            shortcuts={[['1–4', 'Chọn đáp án'], ['Enter', 'Câu tiếp']]} media={groupMedia} passageHtml={step.g.passageHtml} passageKey={`${attemptId}_${step.g.groupId}`} />}
          right={<>
            <div className="study-q-toolbar">
              <h2 className="study-group-label">{first === last ? `Câu ${first}` : <>Câu {first}–{last} <span className="muted">({numbers.length} câu hỏi)</span></>}</h2>
              <Pill tone="muted">Part {step.part} · {PART_NAMES[step.part] || ''}</Pill>
            </div>
            {step.g.questions.map((question) => (
              <QuestionCard key={question.questionId} exam question={question} number={numbering.get(question.questionId)} hideText={hideText}
                answer={{ selected: selected[question.questionId] }} onPick={onChoose} />
            ))}
          </>}
        />
      </div>
      {bottom(
        <span className={`study-note muted small${note.startsWith('Không') ? ' bad-text' : ''}`} role={note ? 'alert' : undefined}>{note || (listening ? 'Âm thanh tự phát; hết audio sẽ tự chuyển câu.' : 'Đã qua câu nào là không quay lại được.')}</span>,
        showNext && <button type="button" className="btn btn-primary btn-sm" onClick={onNext}>{steps[index + 1]?.t === 'end' ? 'Hoàn thành' : 'Câu tiếp'}<Icon name="chevron-right" size={14} /></button>,
      )}
    </>
  )
}

// Luyện thi liền mạch như thi thật: hướng dẫn (tự phát, không tính giờ) → từng nhóm câu, không quay lại, kết quả sau khi nộp.
export default function ExamRunner({ attempt: initial, title }) {
  const id = initial.attemptId
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const options = useMemo(() => readExamOptions(), [])
  const partNos = useMemo(() => [...initial.partNos].sort((a, b) => a - b), [initial])
  const numbering = useMemo(() => new Map([...initial.questions].sort((a, b) => a.partNo - b.partNo || a.questionNo - b.questionNo).map((q, i) => [q.questionId, i + 1])), [initial])
  const total = initial.questions.length

  const [steps, setSteps] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [media, setMedia] = useState({})
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(() => Object.fromEntries(initial.questions.map((q) => [q.questionId, q.selectedOptionId || null])))
  const [clock, setClock] = useState(initial.remainingSeconds)
  const [busy, setBusy] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const navGroups = useMemo(() => buildGroupOrder(initial.questions).groups, [initial])

  const audioRef = useRef(null)
  const token = useRef(0)
  const deadline = useRef(0)
  const frozen = useRef(null)
  const pending = useRef(new Set())
  const mediaRef = useRef({})
  const mediaLoaded = useRef(new Set())
  const alive = useRef(true)
  const stepCount = useRef(0)

  const answeredCount = Object.values(selected).filter(Boolean).length

  const expired = useCallback(() => {
    if (!alive.current) return
    alive.current = false
    toast('Đã hết giờ, bài được tự nộp.')
    writePosition(id, null)
    navigate(paths.result(id), { replace: true })
  }, [id, navigate, toast])

  // ---------- Nạp hướng dẫn và chữ của các Part ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [directions, ...loaded] = await Promise.all([
          getExamDirections(initial.examId).catch(() => []),
          ...partNos.map((p) => getExamPart(initial.examId, p)),
        ])
        if (cancelled) return
        const wanted = new Set(initial.questions.map((q) => q.questionId))
        const dirOf = (kind, key) => directions.find((d) => d.directionKind === kind && (kind === 'SECTION' ? d.skill === key : d.partNo === key))
        const list = []
        const seen = new Set()
        partNos.forEach((p, i) => {
          const skill = p <= 4 ? 'LISTENING' : 'READING'
          if (!seen.has(skill)) { seen.add(skill); const d = dirOf('SECTION', skill); if (d) list.push({ t: 'dir', d, part: p, label: skill === 'LISTENING' ? 'Listening Test' : 'Reading Test' }) }
          const partDirection = dirOf('PART', p)
          if (partDirection) list.push({ t: 'dir', d: partDirection, part: p, label: `Part ${p}` })
          for (const g of loaded[i].groups || []) {
            const questions = g.questions.filter((q) => wanted.has(q.questionId))
            if (questions.length) list.push({ t: 'grp', g: { ...g, questions }, part: p })
          }
        })
        list.push({ t: 'end', part: partNos[partNos.length - 1] })
        const saved = readPosition(id)
        let start = 0
        if (saved > 0 && saved < list.length) start = saved
        else if (initial.answeredCount > 0) start = Math.max(0, list.findIndex((s) => s.t === 'grp' && s.g.questions.some((q) => !initial.questions.find((x) => x.questionId === q.questionId)?.selectedOptionId)))
        stepCount.current = list.length
        setSteps(list)
        setIndex(start)
      } catch (error) { if (!cancelled) setLoadError(error) }
    })()
    return () => { cancelled = true }
  }, [id, initial, partNos])

  // ---------- Đồng hồ: hướng dẫn không tính giờ (đồng hồ đứng, rồi cộng bù từ máy chủ) ----------
  useEffect(() => {
    if (initial.remainingSeconds == null) return undefined
    deadline.current = Date.now() + initial.remainingSeconds * 1000
    let ticks = 0
    const timer = setInterval(async () => {
      const left = frozen.current ?? Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setClock(left)
      if (frozen.current !== null) return
      if (++ticks % 30 === 0 || left === 0) {
        try {
          const fresh = await getAttempt(id)
          if (fresh.status !== 'IN_PROGRESS') { expired(); return }
          deadline.current = Date.now() + fresh.remainingSeconds * 1000
        } catch { /* Thử lại ở nhịp sau. */ }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [id, initial.remainingSeconds, expired])

  useEffect(() => {
    const guard = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])

  // ---------- Bộ máy âm thanh và đồng hồ cho các bước ----------
  const engine = useMemo(() => {
    const stop = () => {
      token.current++
      const element = audioRef.current
      if (!element) return
      element.onended = element.onerror = element.ontimeupdate = null
      try { element.pause() } catch { /* Bỏ qua. */ }
    }
    return {
      stop,
      save: (position) => writePosition(id, position),
      mediaOf: (groupId) => mediaRef.current[groupId],
      async ensureMedia(part, force = false) {
        if (!force && mediaLoaded.current.has(part)) return
        try {
          const result = await getExamPartMedia(initial.examId, part)
          for (const g of result.groups || []) mediaRef.current[g.groupId] = g.media || []
          mediaLoaded.current.add(part)
          if (alive.current) setMedia({ ...mediaRef.current })
        } catch { /* Xử lý khi phát lỗi. */ }
      },
      // Phát lần lượt các audio; onBlocked khi trình duyệt chặn tự phát (trả hàm để người học bấm phát).
      play(urls, callbacks) {
        audioRef.current ||= new Audio()
        const element = audioRef.current
        const mine = ++token.current
        let k = 0
        const go = () => {
          element.src = urls[k]
          element.currentTime = 0
          const promise = element.play()
          if (promise?.catch) promise.catch((error) => { if (mine === token.current) { if (error?.name === 'NotAllowedError') callbacks.onBlocked(go); else callbacks.onFail() } })
        }
        element.onended = () => { if (mine === token.current) { if (++k < urls.length) go(); else callbacks.onEnd() } }
        element.onerror = () => { if (mine === token.current) callbacks.onFail() }
        element.ontimeupdate = () => {
          if (mine !== token.current || !element.duration) return
          callbacks.onProgress(Math.min(100, (element.currentTime * 100) / element.duration), `${formatClock(Math.floor(element.currentTime))} / ${formatClock(Math.floor(element.duration))}`, element.currentTime, element.duration)
        }
        go()
      },
      freezeClock() {
        frozen.current = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
        setClock(frozen.current)
      },
      // Rời màn hướng dẫn: cộng bù thời gian xem để đồng hồ thi không bị trừ.
      thawClock(seconds) {
        if (seconds < 1) { frozen.current = null; return }
        addDirectionTime(id, Math.min(3600, seconds))
          .then((result) => { if (result?.remainingSeconds != null) deadline.current = Date.now() + result.remainingSeconds * 1000 })
          .catch((error) => { if (error.code === 'ATTEMPT_EXPIRED') expired() })
          .finally(() => { frozen.current = null })
      },
    }
  }, [id, initial.examId, expired])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; engine.stop() }
  }, [engine])

  const next = useCallback(() => setIndex((value) => Math.min(value + 1, stepCount.current - 1)), [])

  // ---------- Chọn đáp án (bấm lại đáp án đang chọn = bỏ chọn) ----------
  async function choose(questionId, optionId) {
    if (pending.current.has(questionId)) return
    const before = selected[questionId]
    const target = before === optionId ? null : optionId
    pending.current.add(questionId)
    setSelected((current) => ({ ...current, [questionId]: target }))
    try { await saveAnswer(id, questionId, target) }
    catch (error) {
      setSelected((current) => ({ ...current, [questionId]: before }))
      if (error.code === 'ATTEMPT_EXPIRED') { expired(); return }
      toast(error.message, 'error')
    } finally { pending.current.delete(questionId) }
  }

  async function submit(skipConfirm = false) {
    const left = total - answeredCount
    if (!skipConfirm && !(await confirm({
      title: 'Nộp bài', okLabel: 'Nộp bài',
      message: left ? <>Bạn còn <b>{left}</b> câu chưa trả lời (tính là sai). Nộp bài ngay?</> : 'Bạn đã trả lời tất cả các câu. Nộp bài?',
    }))) return
    setBusy(true)
    engine.stop()
    try {
      await submitAttempt(id)
      alive.current = false
      writePosition(id, null)
      navigate(paths.result(id), { replace: true })
    } catch (error) {
      setBusy(false)
      if (error.code === 'ATTEMPT_EXPIRED') { expired(); return }
      toast(error.message, 'error')
    }
  }

  async function leave() {
    const ok = await confirm({ title: 'Thoát bài thi', okLabel: 'Thoát', message: 'Đồng hồ vẫn chạy. Bạn có thể vào lại từ trang chủ nhưng không xem lại được các câu đã qua.' })
    if (ok) { alive.current = false; engine.stop(); navigate('/') }
  }

  if (loadError) return <div className="card state-box"><p className="bad-text" role="alert">{loadError.message}</p><button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Về trang chủ</button></div>
  if (!steps) return <Loading label="Đang chuẩn bị đề thi…" />

  const step = steps[index]
  const numbers = step.t === 'grp' ? step.g.questions.map((q) => numbering.get(q.questionId)) : []
  const doneGroups = steps.slice(0, index).filter((s) => s.t === 'grp').length
  const allGroups = steps.filter((s) => s.t === 'grp').length
  const counter = step.t === 'grp' ? `${Math.min(...numbers)}/${total}` : `${answeredCount}/${total}`

  return (
    <StudyLayout
      mode="exam"
      title={title}
      onExit={leave}
      badge={<><Pill>Luyện thi</Pill><span className="study-stats">{step.t === 'dir' ? `Hướng dẫn · ${step.label}` : step.t === 'end' ? 'Hoàn thành' : step.part <= 4 ? 'Phần Nghe' : 'Phần Đọc'} · Đã chọn {answeredCount}/{total}</span></>}
      actions={<>
        {clock != null && <span className="exam-clock" role="timer" aria-live="off" aria-label={`Thời gian còn lại ${formatClock(clock)}`} data-low={clock < 300}><Icon name="clock" size={16} />{formatClock(clock)}</span>}
        <button type="button" className="study-top-btn study-top-btn--primary" onClick={() => submit()} disabled={busy}>Nộp bài</button>
      </>}
    >
      <div className="study-progress" role="progressbar" aria-label="Tiến độ bài thi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={allGroups ? Math.round((doneGroups * 100) / allGroups) : 0}><i style={{ width: `${allGroups ? Math.min(100, Math.round((doneGroups * 100) / allGroups)) : 0}%` }} /></div>
      <ExamStep
        key={index} attemptId={id} step={step} index={index} steps={steps} total={total} numbering={numbering} selected={selected} answeredCount={answeredCount} busy={busy}
        engine={engine} options={options} partNos={partNos} media={media} counter={counter} onOpenNav={() => setNavOpen(true)} onChoose={choose} onNext={next} onSubmit={submit}
      />
      {navOpen && (
        <QuestionNavigator exam groups={navGroups} numbers={numbering} answers={Object.fromEntries(Object.entries(selected).map(([qid, value]) => [qid, { selected: value }]))}
          currentGroupId={step.t === 'grp' ? step.g.groupId : null} onJump={null} onClose={() => setNavOpen(false)} />
      )}
    </StudyLayout>
  )
}
