import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Loading } from '../../components/ui/Feedback.jsx'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { useStoredState } from '../../hooks/useStoredState.js'
import { PART_NAMES } from '../../lib/format.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { DirectionsDialog, ReportDialog } from './components/QuestionParts.jsx'
import { readPosition, readPracticeOptions, writePosition, writePracticeOptions } from './examOptions.js'
import { abandonAttempt, getAttempt, getExamPart, getExamPartMedia, saveAnswer, submitAttempt } from './services/examApi.js'
import { AudioBar } from './workspace/AudioBar.jsx'
import { ContextPane } from './workspace/ContextPane.jsx'
import { QuestionCard, RevealPanels } from './workspace/QuestionCard.jsx'
import { QuestionNavigator } from './workspace/QuestionNavigator.jsx'
import { StudyBottom, StudyLayout, StudySplit, Switch } from './workspace/StudyLayout.jsx'
import { buildGroupOrder, groupInstruction, isRevealed } from './workspace/studyModel.js'
import { useAudioPlayer } from './workspace/useAudioPlayer.js'
import { useStudyPanels } from './workspace/useStudyPanels.js'

const mediaMap = (groups) => Object.fromEntries((groups || []).map((group) => [group.groupId, group.media || []]))
const audioUrls = (list) => (list || []).filter((m) => m.mediaType === 'AUDIO').map((m) => m.url)

// Luyện tập (đề hoặc ngân hàng câu hỏi) dạng không gian học: mỗi lần một nhóm câu, khung trái là âm thanh/hình/đoạn văn,
// khung phải là câu hỏi và các khối Bản dịch / Giải thích chi tiết / Từ vựng. Không đồng hồ.
// "Hiện đáp án ngay" bật: chọn là chấm ngay. Tắt: chỉ lưu lựa chọn (đổi được), xem đáp án từng câu hoặc tất cả; câu chưa xem được chấm khi kết thúc.
export default function PracticeRunner({ attempt: initial, title }) {
  const id = initial.attemptId
  const isBank = initial.scope === 'BANK'
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const panels = useStudyPanels()

  const { groups: order, numbers } = useMemo(
    () => buildGroupOrder(initial.questions, isBank ? (initial.content || []).map((g) => g.groupId) : null), [initial, isBank])
  const total = initial.questions.length
  const [content, setContent] = useState(() => (isBank ? Object.fromEntries((initial.content || []).map((g) => [g.groupId, g])) : {}))
  const [loadError, setLoadError] = useState(null)
  const [media, setMedia] = useState(() => (isBank ? mediaMap(initial.content) : {}))
  const [answers, setAnswers] = useState(() => Object.fromEntries(initial.questions.map((q) => [q.questionId, { selected: q.selectedOptionId, correct: q.isCorrect, feedback: null }])))
  const [index, setIndex] = useState(() => {
    const saved = readPosition(id)
    if (saved > 0 && saved < order.length) return saved
    const firstOpen = order.findIndex((g) => g.questionIds.some((qid) => !initial.questions.find((q) => q.questionId === qid)?.selectedOptionId))
    return Math.max(0, firstOpen)
  })
  const [showText, setShowText] = useState(false)
  const [instant, setInstant] = useState(() => readPracticeOptions().instantAnswer)
  const [marksList, setMarksList] = useStoredState(`toeicmind_fe_marks_${id}`, [])
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [revealingAll, setRevealingAll] = useState(false)
  const refreshing = useRef(false)
  const queues = useRef({})
  const panes = useRef(null)

  const marks = useMemo(() => new Set(marksList), [marksList])
  const group = order[index]
  const groupContent = group ? content[group.groupId] : null
  const listening = group?.partNo <= 4
  const hasListeningText = order.some((g) => g.partNo <= 2)

  // Nạp chữ của mọi Part trong lượt (song song), rồi tới link audio/hình.
  useEffect(() => {
    if (isBank) return undefined
    let alive = true
    const partNos = [...new Set(order.map((g) => g.partNo))]
    Promise.all(partNos.map((p) => getExamPart(initial.examId, p)))
      .then((results) => {
        if (!alive) return
        setContent(Object.fromEntries(results.flatMap((r) => r.groups || []).map((g) => [g.groupId, g])))
        return Promise.all(partNos.map((p) => getExamPartMedia(initial.examId, p).then((r) => { if (alive) setMedia((prev) => ({ ...prev, ...mediaMap(r.groups) })) }).catch(() => {})))
      })
      .catch((error) => { if (alive) setLoadError(error) })
    return () => { alive = false }
  }, [initial, isBank, order])

  useEffect(() => {
    writePosition(id, index)
    panes.current?.querySelectorAll('.study-pane').forEach((pane) => { pane.scrollTop = 0 })
  }, [id, index])

  const refreshMedia = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    try {
      if (isBank) { const fresh = await getAttempt(id); setMedia((prev) => ({ ...prev, ...mediaMap(fresh.content) })) }
      else if (group) { const result = await getExamPartMedia(initial.examId, group.partNo); setMedia((prev) => ({ ...prev, ...mediaMap(result.groups) })) }
    } catch { /* Người học có thể bấm phát lại. */ } finally { setTimeout(() => { refreshing.current = false }, 3000) }
  }, [id, initial.examId, isBank, group])

  const groupMedia = group ? media[group.groupId] ?? groupContent?.media : []
  const player = useAudioPlayer(listening ? audioUrls(groupMedia) : [], { autoPlay: true, onError: refreshMedia })

  // Các request của cùng một câu chạy nối tiếp để lựa chọn cuối cùng là lựa chọn được lưu.
  function enqueue(questionId, task) {
    const run = (queues.current[questionId] || Promise.resolve()).then(task)
    queues.current[questionId] = run.catch(() => {})
    return run
  }
  function markPending(questionId, on) {
    setPendingIds((prev) => { const next = new Set(prev); if (on) next.add(questionId); else next.delete(questionId); return next })
  }

  // Chấm và hiện đáp án + giải thích của một câu (khóa câu).
  async function reveal(questionId, optionId = answers[questionId]?.selected) {
    if (!optionId || pendingIds.has(questionId) || isRevealed(answers[questionId])) return
    markPending(questionId, true)
    try {
      const result = await enqueue(questionId, () => saveAnswer(id, questionId, optionId))
      setAnswers((prev) => ({ ...prev, [questionId]: { selected: result.selectedOptionId, correct: result.feedback?.isCorrect ?? null, feedback: result.feedback || null } }))
    } catch (error) { toast(error.message, 'error') } finally { markPending(questionId, false) }
  }

  async function pick(questionId, optionId) {
    const current = answers[questionId]
    if (isRevealed(current)) return
    if (instant) { await reveal(questionId, optionId); return }
    if (current?.selected === optionId) return
    const previous = current?.selected ?? null
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selected: optionId, correct: null, feedback: null } }))
    try { await enqueue(questionId, () => saveAnswer(id, questionId, optionId, false)) } catch (error) {
      setAnswers((prev) => (prev[questionId]?.selected === optionId ? { ...prev, [questionId]: { ...prev[questionId], selected: previous } } : prev))
      toast(error.message, 'error')
    }
  }

  const waiting = useMemo(() => Object.entries(answers).filter(([, a]) => a.selected && !isRevealed(a)).map(([qid]) => Number(qid)), [answers])
  const stats = useMemo(() => {
    const list = Object.values(answers)
    return { done: list.filter((a) => a.selected).length, ok: list.filter((a) => a.correct === true).length, bad: list.filter((a) => a.correct === false).length }
  }, [answers])

  async function revealAll() {
    setRevealingAll(true)
    for (let i = 0; i < waiting.length; i += 4) await Promise.all(waiting.slice(i, i + 4).map((qid) => reveal(qid)))
    setRevealingAll(false)
  }

  function setInstantMode(next) {
    setInstant(next)
    writePracticeOptions({ instantAnswer: next })
    toast(next ? 'Đã bật: chọn đáp án là xem ngay đáp án và giải thích.' : 'Đã tắt: chọn đáp án chưa hiện kết quả, bấm "Xem đáp án" khi muốn xem.')
  }

  const toggleMark = (questionId) => setMarksList((list) => (list.includes(questionId) ? list.filter((x) => x !== questionId) : [...list, questionId]))
  const go = useCallback((target) => setIndex(Math.max(0, Math.min(order.length - 1, target))), [order.length])

  async function finish() {
    const left = total - stats.done
    const ok = await confirm({
      title: 'Kết thúc bài luyện', okLabel: 'Kết thúc',
      message: left ? <>Bạn còn <b>{left}</b> câu chưa trả lời (tính là sai). Kết thúc ngay?</> : 'Bạn đã trả lời tất cả các câu. Kết thúc bài luyện?',
    })
    if (!ok) return
    setBusy(true)
    try { await submitAttempt(id); writePosition(id, null); navigate(paths.result(id), { replace: true }) } catch (error) { setBusy(false); toast(error.message, 'error') }
  }

  async function abandon() {
    if (!(await confirm({ title: 'Bỏ dở bài này?', message: 'Bài sẽ không được chấm.', danger: true, okLabel: 'Bỏ dở' }))) return
    try { await abandonAttempt(id); writePosition(id, null); toast('Đã bỏ dở bài.'); navigate('/history', { replace: true }) } catch (error) { toast(error.message, 'error') }
  }

  const questions = groupContent ? groupContent.questions.filter((q) => group.questionIds.includes(q.questionId)) : []
  const passageTranslation = groupContent?.passageHtml
    ? questions.map((q) => answers[q.questionId]?.feedback?.translationVi).find((text) => text?.trim())
    : undefined

  // Phím tắt: 1–4 hoặc A–D chọn đáp án câu đầu chưa làm; ←/→ đổi nhóm câu; P phát/dừng, J tua lại 3s, R nghe lại.
  useHotkeys((event) => {
    if (dialog || document.querySelector('dialog[open]')) return
    if (event.target instanceof Element && event.target.closest('[role="slider"], [role="separator"]')) return
    const key = event.key.toUpperCase()
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); return }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); return }
    if (player.hasAudio && key === 'P') { event.preventDefault(); player.toggle(); return }
    if (player.hasAudio && key === 'J') { event.preventDefault(); player.back(3); return }
    if (player.hasAudio && key === 'R') { event.preventDefault(); player.replay(); return }
    if (!/^[A-D1-4]$/.test(key) || !questions.length) return
    const target = questions.find((q) => !isRevealed(answers[q.questionId]) && !answers[q.questionId]?.selected) || questions.find((q) => !isRevealed(answers[q.questionId]))
    const option = target?.options['ABCD1234'.indexOf(key) % 4]
    if (option) { event.preventDefault(); pick(target.questionId, option.optionId) }
  })

  const groupNumbers = group ? group.questionIds.map((qid) => numbers.get(qid)) : []
  const first = Math.min(...groupNumbers), last = Math.max(...groupNumbers)
  const hideText = group?.partNo <= 2 && !showText
  const audioBar = listening && (
    <AudioBar seed={group.groupId} current={player.current} duration={player.duration} playing={player.playing} rate={player.rate} blocked={player.blocked}
      loading={!player.hasAudio} onToggle={player.toggle} onSeek={player.seek} onBack={player.back} onReplay={player.replay} onRate={player.setRate} />
  )
  const shortcuts = [...(listening ? [['P', 'Phát/Dừng'], ['J', 'Tua lại 3s'], ['R', 'Nghe lại']] : []), ['1–4', 'Chọn đáp án'], ['← →', 'Đổi câu']]

  return (
    <StudyLayout
      mode="practice"
      title={title}
      onExit={() => navigate('/')}
      badge={<><Pill tone="success">{isBank ? 'Luyện tập · ngân hàng' : 'Luyện tập'}</Pill><span className="study-stats" aria-live="polite">Đã làm <b>{stats.done}/{total}</b> · <span className="ok-text">✓ {stats.ok}</span> <span className="bad-text">✗ {stats.bad}</span></span></>}
      actions={<>
        {hasListeningText && <button type="button" className="study-top-btn" aria-pressed={showText} onClick={() => setShowText((v) => !v)}><Icon name="book" size={16} /><span className="study-top-label">{showText ? 'Ẩn chữ Part 1–2' : 'Hiện chữ Part 1–2'}</span></button>}
        {initial.examId && <button type="button" className="study-top-btn" onClick={() => setDialog({ type: 'directions' })}><Icon name="info" size={16} /><span className="study-top-label">Hướng dẫn</span></button>}
        <button type="button" className="study-top-btn study-top-btn--primary" onClick={finish} disabled={busy}>Kết thúc</button>
      </>}
    >
      <div className="study-body" ref={panes}>
        {loadError ? <p className="form-notice study-error" data-kind="error" role="alert">{loadError.message}</p>
          : !groupContent ? <Loading label="Đang tải câu hỏi…" />
            : (
              <StudySplit
                left={<ContextPane instruction={groupInstruction(group.partNo, first, last)} audio={audioBar} shortcuts={shortcuts}
                  media={groupMedia} passageHtml={hideText ? null : groupContent.passageHtml} passageTranslation={passageTranslation}
                  passageKey={`${id}_${group.groupId}`} panels={panels} onMediaError={refreshMedia} />}
                right={<>
                  <div className="study-q-toolbar">
                    <span className="study-group-label">{group.questionIds.length > 1 ? <>Nhóm câu {first}–{last} <span className="muted">({group.questionIds.length} câu hỏi)</span></> : `Câu ${first}`}</span>
                    <Pill tone="muted">Part {group.partNo} · {PART_NAMES[group.partNo] || ''}</Pill>
                    <span className="spacer" />
                    {!instant && waiting.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={revealAll} disabled={revealingAll}><Icon name="eye" size={14} />{revealingAll ? 'Đang chấm…' : `Xem đáp án các câu đã chọn (${waiting.length})`}</button>}
                    <Switch checked={instant} onChange={setInstantMode} label="Hiện đáp án ngay" />
                  </div>
                  {questions.map((question) => (
                    <QuestionCard key={question.questionId} question={question} number={numbers.get(question.questionId)} answer={answers[question.questionId]}
                      hideText={hideText} marked={marks.has(question.questionId)} busy={pendingIds.has(question.questionId)} showRevealButton={!instant}
                      grouped={group.questionIds.length > 1} panels={panels}
                      onPick={pick} onReveal={reveal} onMark={() => toggleMark(question.questionId)} onReport={() => setDialog({ type: 'report', questionId: question.questionId })} />
                  ))}
                  <RevealPanels questions={questions} answers={answers} hasPassage={Boolean(groupContent.passageHtml)} panels={panels} />
                </>}
              />
            )}
      </div>
      <StudyBottom tools={<>
        <button type="button" className="btn btn-outline btn-sm" disabled={!group} onClick={() => setDialog({ type: 'report', questionId: group.questionIds[0] })}><Icon name="flag" size={14} />Báo lỗi</button>
        <Link className="btn btn-outline btn-sm" to="/vocab/mine"><Icon name="text" size={14} />Từ của tôi</Link>
      </>}>
        <button type="button" className="btn btn-outline btn-sm study-step" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Câu trước"><Icon name="chevron-left" size={16} /></button>
        <button type="button" className="btn btn-secondary btn-sm study-counter" onClick={() => setDialog({ type: 'nav' })} aria-haspopup="dialog" aria-label={`Danh sách câu hỏi, đang ở câu ${Number.isFinite(first) ? first : 1} trên ${total}`}>
          <Icon name="grid" size={16} />{Number.isFinite(first) ? first : 1}/{total}
        </button>
        {index < order.length - 1
          ? <button type="button" className="btn btn-primary btn-sm study-step" onClick={() => go(index + 1)} aria-label="Câu tiếp"><Icon name="chevron-right" size={16} /></button>
          : <button type="button" className="btn btn-primary btn-sm" onClick={finish} disabled={busy}>Kết thúc</button>}
      </StudyBottom>

      {dialog?.type === 'nav' && (
        <QuestionNavigator groups={order} numbers={numbers} answers={answers} marks={marks} currentGroupId={group?.groupId}
          onJump={(groupId) => go(order.findIndex((g) => g.groupId === groupId))} onClose={() => setDialog(null)}
          footer={<div className="nav-footer">
            {waiting.length > 0 && <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={revealAll} disabled={revealingAll}><Icon name="eye" size={14} />{revealingAll ? 'Đang chấm…' : `Xem đáp án các câu đã chọn (${waiting.length})`}</button>}
            <button type="button" className="text-link bad-text" onClick={() => { setDialog(null); abandon() }}>Bỏ dở bài này</button>
          </div>} />
      )}
      {dialog?.type === 'directions' && <DirectionsDialog examId={initial.examId} partNos={initial.partNos} onClose={() => setDialog(null)} />}
      {dialog?.type === 'report' && <ReportDialog questionId={dialog.questionId} onClose={() => setDialog(null)} />}
    </StudyLayout>
  )
}
