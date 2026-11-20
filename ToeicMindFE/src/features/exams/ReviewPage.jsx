import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { useStoredState } from '../../hooks/useStoredState.js'
import { PART_NAMES } from '../../lib/format.js'
import { paths } from '../../routes/learnerRoutes.js'
import { ReportDialog } from './components/QuestionParts.jsx'
import { groupMatches, nextGroupIndex, reviewCounts, reviewModel } from './resultModel.js'
import { getAttemptResult } from './services/examApi.js'
import { AudioBar } from './workspace/AudioBar.jsx'
import { ContextPane } from './workspace/ContextPane.jsx'
import { QuestionCard, RevealPanels } from './workspace/QuestionCard.jsx'
import { QuestionNavigator } from './workspace/QuestionNavigator.jsx'
import { StudyBottom, StudyLayout, StudySplit } from './workspace/StudyLayout.jsx'
import { groupInstruction } from './workspace/studyModel.js'
import { useAudioPlayer } from './workspace/useAudioPlayer.js'
import { useStudyPanels } from './workspace/useStudyPanels.js'

// [giá trị, nhãn, biểu tượng, tông] của bộ lọc ở thanh dưới.
const FILTERS = [['all', 'Tất cả', 'grid'], ['wrong', 'Sai', 'alert-circle', 'danger'], ['right', 'Đúng', 'circle-check', 'success'], ['skipped', 'Bỏ trống', 'info', 'muted'], ['marked', 'Đánh dấu', 'star', 'warning']]
const mediaMap = (groups) => Object.fromEntries((groups || []).map((group) => [group.groupId, group.media || []]))
const audioUrls = (list) => (list || []).filter((m) => m.mediaType === 'AUDIO').map((m) => m.url)
const noop = () => {}

// Đáp án chi tiết dạng không gian học (giống Luyện tập): mỗi lần một nhóm câu. Khung trái là câu dẫn, âm thanh (tua, tốc độ),
// hình, đoạn văn; khung phải là các câu với nhãn Đúng/Sai/Bỏ trống, đáp án tô màu và các khối Script/Giải thích/Từ vựng.
// Thanh dưới: báo lỗi, bộ lọc (Tất cả, Sai, Đúng, Bỏ trống, Đánh dấu), câu trước/sau và bảng chọn câu. Vị trí giữ trên URL (#q-{id}).
function ReviewWorkspace({ data, attemptId }) {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const panels = useStudyPanels()
  const { groups, numbers, answers } = useMemo(() => reviewModel(data), [data])
  const content = useMemo(() => Object.fromEntries((data.groups || []).map((group) => [group.groupId, group])), [data])
  const [media, setMedia] = useState(() => mediaMap(data.groups))
  const [marksList, setMarksList] = useStoredState(`toeicmind_fe_marks_${attemptId}`, [])
  const marks = useMemo(() => new Set(marksList), [marksList])
  const [filter, setFilter] = useState('all')
  const [dialog, setDialog] = useState(null)
  const [index, setIndex] = useState(() => {
    // Mở từ bảng đáp án ở trang kết quả (…#q-123): vào đúng nhóm chứa câu đó.
    const target = hash.startsWith('#q-') ? Number(hash.slice(3)) : null
    return Math.max(0, groups.findIndex((g) => g.questionIds.includes(target)))
  })
  const panes = useRef(null)
  const refreshing = useRef(false)
  const counts = useMemo(() => reviewCounts(answers, marks), [answers, marks])
  const matches = useCallback((group) => groupMatches(group, answers, filter, marks), [answers, filter, marks])
  const group = groups[index]
  const groupData = group ? content[group.groupId] : null
  const listening = group?.partNo <= 4
  const total = numbers.size

  // Đổi nhóm: giữ vị trí trên URL (tải lại vẫn đúng câu) và đưa hai khung về đầu.
  useEffect(() => {
    if (!group) return
    window.history.replaceState(window.history.state, '', `#q-${group.questionIds[0]}`)
    panes.current?.querySelectorAll('.study-pane').forEach((pane) => { pane.scrollTop = 0 })
  }, [group])

  // Link audio/hình đã ký có hạn: lỗi tải thì lấy lại kết quả để có link mới (tối đa mỗi 3 giây một lần).
  const refreshMedia = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    try { setMedia(mediaMap((await getAttemptResult(attemptId, true)).groups)) } catch { /* Người học có thể bấm phát lại. */ } finally { setTimeout(() => { refreshing.current = false }, 3000) }
  }, [attemptId])
  const groupMedia = group ? media[group.groupId] : []
  const player = useAudioPlayer(listening ? audioUrls(groupMedia) : [], { autoPlay: false, onError: refreshMedia })

  const prev = nextGroupIndex(groups, index, -1, matches)
  const next = nextGroupIndex(groups, index, 1, matches)
  function chooseFilter(value) {
    setFilter(value)
    // Nhóm đang xem không khớp bộ lọc mới: chuyển tới nhóm khớp gần nhất phía sau (hoặc phía trước).
    const fits = (g) => groupMatches(g, answers, value, marks)
    if (!group || fits(group)) return
    const target = nextGroupIndex(groups, index, 1, fits)
    const fallback = nextGroupIndex(groups, index, -1, fits)
    if (target >= 0 || fallback >= 0) setIndex(target >= 0 ? target : fallback)
  }
  const toggleMark = (questionId) => setMarksList((list) => (list.includes(questionId) ? list.filter((x) => x !== questionId) : [...list, questionId]))

  useHotkeys((event) => {
    if (dialog) return
    const key = event.key.toUpperCase()
    if (event.key === 'ArrowRight' && next >= 0) { event.preventDefault(); setIndex(next); return }
    if (event.key === 'ArrowLeft' && prev >= 0) { event.preventDefault(); setIndex(prev); return }
    if (player.hasAudio && key === 'P') { event.preventDefault(); player.toggle(); return }
    if (player.hasAudio && key === 'J') { event.preventDefault(); player.back(3); return }
    if (player.hasAudio && key === 'R') { event.preventDefault(); player.replay() }
  })

  const visible = matches(group)
  const groupNumbers = group ? group.questionIds.map((id) => numbers.get(id)) : []
  const first = Math.min(...groupNumbers), last = Math.max(...groupNumbers)
  const questions = groupData ? groupData.questions.filter((q) => group.questionIds.includes(q.questionId)) : []
  const audioBar = listening && (
    <AudioBar seed={group.groupId} current={player.current} duration={player.duration} playing={player.playing} rate={player.rate} blocked={player.blocked}
      loading={!player.hasAudio} onToggle={player.toggle} onSeek={player.seek} onBack={player.back} onReplay={player.replay} onRate={player.setRate} />
  )
  const shortcuts = [...(listening ? [['P', 'Phát/Dừng'], ['J', 'Tua lại 3s'], ['R', 'Nghe lại']] : []), ['← →', 'Câu trước/sau']]
  const position = first === last ? `Câu ${first}` : `Câu ${first}–${last}`

  return (
    <StudyLayout
      mode="review"
      title={`${data.examTitle || 'Ngân hàng câu hỏi'} · Xem lại kết quả`}
      exitLabel="Kết quả"
      onExit={() => navigate(paths.result(attemptId))}
      badge={<span className="study-stats" aria-live="polite">{position}/{total}</span>}
      actions={<div className="review-score" aria-label="Tổng kết">
        <span data-tone="success" title="Câu đúng" aria-label={`${counts.right} câu đúng`}><Icon name="circle-check" size={15} />{counts.right}</span>
        <span data-tone="danger" title="Câu sai" aria-label={`${counts.wrong} câu sai`}><Icon name="alert-circle" size={15} />{counts.wrong}</span>
        <span data-tone="muted" title="Câu bỏ trống" aria-label={`${counts.skipped} câu bỏ trống`}><Icon name="info" size={15} />{counts.skipped}</span>
      </div>}
    >
      <div className="study-body" ref={panes}>
        {!visible ? (
          <div className="study-solo"><div className="study-solo-card"><EmptyState title="Không có câu phù hợp">Không có câu nào ở mục “{FILTERS.find(([v]) => v === filter)[1]}”. Chọn “Tất cả” để xem mọi câu.</EmptyState></div></div>
        ) : (
          <StudySplit
            left={<ContextPane instruction={groupInstruction(group.partNo, first, last)} audio={audioBar} shortcuts={shortcuts}
              media={groupMedia} passageHtml={groupData.passageHtml} passageTranslation={groupData.translationVi}
              passageKey={`${attemptId}_${group.groupId}`} panels={panels} onMediaError={refreshMedia} />}
            right={<>
              <div className="study-q-toolbar">
                <span className="study-group-label">{group.questionIds.length > 1 ? <>Nhóm câu {first}–{last} <span className="muted">({group.questionIds.length} câu hỏi)</span></> : `Câu ${first}`}</span>
                <Pill tone="muted">Part {group.partNo} · {PART_NAMES[group.partNo] || ''}</Pill>
              </div>
              {questions.map((question) => (
                <QuestionCard key={question.questionId} question={question} number={numbers.get(question.questionId)} answer={answers[question.questionId]}
                  status={answers[question.questionId].review} marked={marks.has(question.questionId)} onPick={noop}
                  grouped={group.questionIds.length > 1} panels={panels}
                  onMark={() => toggleMark(question.questionId)} onReport={() => setDialog({ type: 'report', questionId: question.questionId })} />
              ))}
              <RevealPanels questions={questions} answers={answers} hasPassage={Boolean(groupData.passageHtml)} panels={panels} />
            </>}
          />
        )}
      </div>
      <StudyBottom tools={<>
        <button type="button" className="btn btn-outline btn-sm" disabled={!visible} onClick={() => setDialog({ type: 'report', questionId: group.questionIds[0] })}><Icon name="flag" size={14} /><span className="study-top-label">Báo lỗi</span></button>
        <Link className="btn btn-outline btn-sm" to="/vocab/mine"><Icon name="text" size={14} /><span className="study-top-label">Từ của tôi</span></Link>
        <div className="review-filters" role="group" aria-label="Lọc câu">
          {FILTERS.filter(([value]) => value !== 'marked' || counts.marked > 0 || filter === 'marked').map(([value, label, icon, tone]) => (
            <button key={value} type="button" className="review-filter" data-tone={tone} aria-pressed={filter === value} disabled={value !== 'all' && !counts[value]} onClick={() => chooseFilter(value)}>
              <Icon name={icon} size={13} />{label} <span className="review-filter-count">{counts[value]}</span>
            </button>
          ))}
        </div>
      </>}>
        <button type="button" className="btn btn-outline btn-sm study-step" onClick={() => setIndex(prev)} disabled={prev < 0} aria-label="Câu trước"><Icon name="chevron-left" size={16} /></button>
        <button type="button" className="btn btn-secondary btn-sm study-counter" onClick={() => setDialog({ type: 'nav' })} aria-haspopup="dialog" aria-label={`Danh sách câu hỏi, đang xem ${position.toLowerCase()} trên ${total}`}>
          <Icon name="grid" size={16} />{first}/{total}
        </button>
        <button type="button" className="btn btn-primary btn-sm study-step" onClick={() => setIndex(next)} disabled={next < 0} aria-label="Câu sau"><Icon name="chevron-right" size={16} /></button>
      </StudyBottom>
      {dialog?.type === 'nav' && (
        <QuestionNavigator groups={groups} numbers={numbers} answers={answers} marks={marks} currentGroupId={group?.groupId} review
          isDimmed={(groupId) => !matches(groups.find((g) => g.groupId === groupId))}
          onJump={(groupId) => setIndex(groups.findIndex((g) => g.groupId === groupId))} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'report' && <ReportDialog questionId={dialog.questionId} onClose={() => setDialog(null)} />}
    </StudyLayout>
  )
}

export default function ReviewPage() {
  useDocumentTitle('Đáp án chi tiết')
  const { attemptId } = useParams()
  const { data, error, loading, reload } = useAsync(() => getAttemptResult(attemptId, true), [attemptId])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} backTo={paths.result(attemptId)} />
  if (!data.groups?.length) {
    return <div className="card"><EmptyState title="Chưa có đáp án chi tiết" action={<Link className="btn btn-primary" to={paths.result(attemptId)}>Về trang kết quả</Link>}>Lượt làm này không có câu nào để xem lại.</EmptyState></div>
  }
  return <ReviewWorkspace key={attemptId} data={data} attemptId={attemptId} />
}
