import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Dialog } from '../../components/ui/Dialog.jsx'
import { ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { ClipStage } from './components/ClipStage.jsx'
import { StatusPill } from './components/ItemList.jsx'
import { MODE_OF, itemTitle, seededRandom } from './dictationText.js'
import { backPath, readValue, writeValue } from './dictationNav.js'
import { getDictationItem, getDictationItems, saveDictationProgress } from './services/dictationApi.js'
import { ReportDialog } from '../reports/ReportDialog.jsx'
import { useClipPlayer } from './useClipPlayer.js'

const TABS = [['DICT', 'Nghe chép', 'Nghe rồi gõ lại các từ bị ẩn'], ['CHECK', 'Nghe check', 'Ẩn từ, bấm để lật như thẻ'], ['FULL', 'Nghe full', 'Nghe lần lượt toàn bộ clip']]
const RATES = [0.75, 1, 1.25, 1.5]
const urlOf = (clip) => clip?.audio?.[0]?.url

function Wave({ clipId, progress, onSeek }) {
  const bars = useMemo(() => { const random = seededRandom(clipId + 7); return Array.from({ length: 56 }, () => 18 + Math.round(random() * 82)) }, [clipId])
  const filled = Math.round(progress * bars.length)
  return (
    <div className="wave" role="slider" aria-label="Vị trí phát" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} tabIndex={0}
      onClick={(event) => { const box = event.currentTarget.getBoundingClientRect(); onSeek((event.clientX - box.left) / box.width) }}>
      {bars.map((height, i) => <i key={i} data-on={i < filled} style={{ height: `${height}%` }} />)}
    </div>
  )
}

// Nghe full: phát lần lượt toàn bộ clip của bộ, đánh dấu câu đang đọc.
function FullView({ clips, rate, showVi, groupVi, startAt, onFinish }) {
  const player = useClipPlayer(rate)
  const toast = useToast()
  const [position, setPosition] = useState(startAt ?? 0)
  const [running, setRunning] = useState(startAt !== null)
  const timer = useRef(0)

  useEffect(() => {
    if (!running) return undefined
    const clip = clips[position]
    if (!clip) return undefined
    const afterClip = () => {
      if (position + 1 >= clips.length) { setRunning(false); setPosition(clips.length); onFinish(); return }
      timer.current = setTimeout(() => setPosition(position + 1), 350)
    }
    if (!urlOf(clip)) { toast('Clip này chưa có âm thanh.', 'error'); timer.current = setTimeout(afterClip, 700) } else player.play(urlOf(clip), { onEnd: afterClip, onError: () => { toast('Không phát được âm thanh.', 'error'); setRunning(false) } })
    return () => { clearTimeout(timer.current); player.stop() }
    // Chạy lại khi đổi clip hoặc bật/tắt phát.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, position])

  return (
    <div>
      <div className="row dict-controls">
        <button type="button" className="btn btn-primary" onClick={() => { if (running) setRunning(false); else { if (position >= clips.length) setPosition(0); setRunning(true) } }}>
          <Icon name={running ? 'pause' : 'play'} size={16} />{running ? 'Tạm dừng' : position >= clips.length ? 'Nghe lại từ đầu' : 'Nghe toàn bộ'}
        </button>
      </div>
      <div className="dict-full">
        {clips.map((clip, i) => (
          <button key={clip.clipId} type="button" className="dict-full-row" data-current={running && i === position} data-past={i < position} onClick={() => { setPosition(i); setRunning(true) }}>
            <span className="dict-speaker">{clip.speaker || clip.role || ''}</span>
            <span className="dict-sentence-sm" lang="en">{clip.transcriptEn}</span>
            {showVi && clip.translationVi && <span className="muted small">{clip.translationVi}</span>}
          </button>
        ))}
      </div>
      {showVi && groupVi && <p className="muted small preserve-lines">{groupVi}</p>}
    </div>
  )
}

function ClipListDialog({ clips, index, results, onPick, onClose }) {
  return (
    <Dialog title="Danh sách câu" description={`${clips.length} clip`} onClose={onClose}>
      <div className="dict-list">
        {clips.map((clip, i) => (
          <button key={clip.clipId} type="button" className="dict-list-row" data-current={i === index} onClick={() => { onPick(i); onClose() }}>
            <b>{i + 1}</b><span>{clip.transcriptEn}</span>
            {results[i] != null && <Pill tone={results[i] >= 80 ? 'success' : 'warning'}>{Math.round(results[i])}%</Pill>}
          </button>
        ))}
      </div>
    </Dialog>
  )
}

function Trainer({ itemId, initial }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [detail, setDetail] = useState(initial)
  const [reporting, setReporting] = useState(false)
  const { item, clips } = detail
  const [tab, setTab] = useState(() => (TABS.some(([key]) => key === readValue('tab')) ? readValue('tab') : 'DICT'))
  const [pct, setPct] = useState(() => readValue('pct', 50))
  const [rate, setRate] = useState(() => (RATES.includes(readValue('rate')) ? readValue('rate') : 1))
  const [loop, setLoop] = useState(() => readValue('loop', false) === true)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState([])
  const [plays, setPlays] = useState(0)
  const [showVi, setShowVi] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [fullStart, setFullStart] = useState(null)
  const [finished, setFinished] = useState(null)
  const [runKey, setRunKey] = useState(0)
  const [queue, setQueue] = useState(() => readValue('ids', []))
  const player = useClipPlayer(rate)
  const loopTimer = useRef(0)
  const clip = clips[index]
  const viOf = (c) => c?.translationVi || detail.groupTranslationVi || ''
  const position = queue.indexOf(itemId)

  // Hàng đợi bộ clip: lấy theo bộ lọc người học vừa chọn; mở thẳng từ liên kết thì lấy các bộ cùng đề và Part.
  useEffect(() => {
    if (queue.includes(itemId)) return undefined
    let alive = true
    ;(async () => {
      const fetchIds = async (query) => (await getDictationItems({ ...query, page: 1, pageSize: 100 })).items.map((entry) => entry.itemId)
      let ids = []
      try {
        const saved = readValue('query', null)
        ids = saved ? await fetchIds(saved) : []
        if (!ids.includes(itemId)) ids = await fetchIds(item.examId ? { examId: item.examId, partNo: item.partNo } : { source: 'STANDALONE', partNo: item.partNo })
      } catch { ids = [] }
      writeValue('ids', ids)
      if (alive) setQueue(ids)
    })()
    return () => { alive = false }
  }, [itemId, item, queue])

  const loopRef = useRef(loop)
  useEffect(() => { loopRef.current = loop })
  function playClip(i, fresh = false) {
    const target = clips[i]
    if (!urlOf(target)) { toast('Clip này chưa có âm thanh.', 'error'); return }
    if (!fresh) setPlays((n) => n + 1)
    player.play(urlOf(target), {
      onEnd: () => { if (loopRef.current && tab !== 'FULL') loopTimer.current = setTimeout(() => playClip(i, true), 900) },
      onError: async () => {
        if (fresh) { toast('Không phát được âm thanh.', 'error'); return }
        try { const next = await getDictationItem(itemId); setDetail(next); player.play(urlOf(next.clips[i]), {}) } catch (error) { toast(error.message, 'error') }
      },
    })
  }

  useEffect(() => () => clearTimeout(loopTimer.current), [])
  const resetClip = () => { clearTimeout(loopTimer.current); player.stop(); setPlays(0) }

  const choose = (name, value, setter) => { setter(value); writeValue(name, value) }
  const go = (target) => { if (target >= 0 && target < clips.length) { resetClip(); setIndex(target) } }

  async function finish(list) {
    resetClip()
    const graded = list.filter((value) => value != null)
    const accuracy = tab !== 'FULL' && graded.length ? Math.round((graded.reduce((sum, value) => sum + value, 0) / graded.length) * 10) / 10 : null
    setFinished({ saving: true, accuracy })
    try {
      const saved = await saveDictationProgress(itemId, { mode: MODE_OF[tab](pct), accuracyPercent: accuracy })
      setFinished({ saving: false, accuracy, saved })
    } catch (error) { toast(error.message, 'error'); setFinished({ saving: false, accuracy, saved: null }) }
  }

  function next(accuracy) {
    const given = typeof accuracy === 'number'
    const updated = given ? Object.assign([...results], { [index]: accuracy }) : results
    if (given) setResults(updated)
    if (index + 1 >= clips.length) finish(updated); else go(index + 1)
  }
  const record = (accuracy) => setResults((current) => Object.assign([...current], { [index]: accuracy }))

  async function leave() {
    if (!finished && results.some((value) => value != null) && !(await confirm({ title: 'Thoát khỏi bài luyện?', message: 'Kết quả chưa lưu sẽ mất.', danger: true, okLabel: 'Thoát' }))) return
    navigate(backPath())
  }
  async function gotoItem(target) {
    if (!finished && results.some((value) => value != null) && !(await confirm({ title: 'Chuyển sang bộ khác?', message: 'Kết quả chưa lưu của bộ này sẽ mất.', danger: true, okLabel: 'Chuyển' }))) return
    navigate(`/dictation/item/${target}`)
  }
  function changeTab(key) { resetClip(); choose('tab', key, setTab); setIndex(0); setFullStart(null); setRunKey((n) => n + 1) }

  const nextItem = position >= 0 ? queue[position + 1] : null
  if (finished) {
    const { accuracy, saved, saving } = finished
    return (
      <section className="card dict-done">
        <span className="vq-summary-icon" aria-hidden="true"><Icon name="check" size={30} /></span>
        <h1 className="page-title">Hoàn thành bộ clip!</h1>
        {queue.length > 1 && position >= 0 && <p className="muted small">Bộ {position + 1}/{queue.length} trong danh sách</p>}
        {saving ? <p className="muted" role="status">Đang lưu kết quả…</p> : accuracy != null
          ? <><p className="score-big">{Math.round(accuracy)}%</p><p className="muted">Độ chính xác lần này{saved?.bestAccuracy != null ? ` · tốt nhất ${Math.round(saved.bestAccuracy)}%` : ''}</p></>
          : <p className="muted">Bạn đã nghe xong toàn bộ bộ clip. Chế độ này không chấm điểm.</p>}
        {saved && <p><StatusPill status={saved.status} />{saved.status === 'NEEDS_PRACTICE' && <span className="muted small"> Nên luyện lại bộ này.</span>}</p>}
        <div className="row dict-done-actions">
          <button type="button" className="btn btn-outline" onClick={async () => { try { setDetail(await getDictationItem(itemId)) } catch { /* Dùng dữ liệu cũ. */ } setFinished(null); setResults([]); setIndex(0); setRunKey((n) => n + 1) }}><Icon name="refresh" size={15} />Luyện lại</button>
          {nextItem && <Link className="btn btn-primary" to={`/dictation/item/${nextItem}`}>Bộ tiếp theo<Icon name="chevron-right" size={14} /></Link>}
          <Link className={`btn ${nextItem ? 'btn-outline' : 'btn-primary'}`} to={backPath()}>Về danh sách</Link>
        </div>
      </section>
    )
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-outline btn-sm" onClick={leave}><Icon name="chevron-left" size={14} />Thoát</button>
        <div className="spacer"><b>{item.examTitle || itemTitle(item)}</b> <Pill>Part {item.partNo}</Pill> <span className="muted small">{item.categoryName || ''}{item.firstQuestionNo ? ` · từ câu ${item.firstQuestionNo}` : ''}</span></div>
        {queue.length > 1 && position >= 0 && (
          <div className="row" role="group" aria-label="Chuyển bộ clip">
            <button type="button" className="btn btn-outline btn-sm" aria-label="Bộ trước" disabled={position <= 0} onClick={() => gotoItem(queue[position - 1])}><Icon name="chevron-left" size={14} /></button>
            <span className="muted small">Bộ {position + 1}/{queue.length}</span>
            <button type="button" className="btn btn-outline btn-sm" aria-label="Bộ sau" disabled={position >= queue.length - 1} onClick={() => gotoItem(queue[position + 1])}><Icon name="chevron-right" size={14} /></button>
          </div>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setListOpen(true)}><Icon name="list" size={14} />Danh sách câu</button>
        <button type="button" className="icon-btn" title="Báo lỗi bộ clip" aria-label="Báo lỗi bộ clip này" onClick={() => setReporting(true)}><Icon name="flag" size={16} /></button>
      </div>

      <div className="seg-tabs seg-tabs--fill" role="tablist">
        {TABS.map(([key, label, hint]) => <button key={key} type="button" role="tab" className="seg-tab" aria-selected={key === tab} data-active={key === tab} title={hint} onClick={() => changeTab(key)}>{label}</button>)}
      </div>

      <section className="card dict-box">
        {tab === 'FULL' ? (
          <>
            <div className="row">
              <button type="button" className="btn btn-outline" title="Tốc độ" onClick={() => choose('rate', RATES[(RATES.indexOf(rate) + 1) % RATES.length], setRate)}>{rate}x</button>
              <button type="button" className="chip" data-active={showVi} aria-pressed={showVi} onClick={() => setShowVi((v) => !v)}>Dịch nghĩa</button>
            </div>
            <FullView key={`${runKey}-${fullStart}`} clips={clips} rate={rate} showVi={showVi} groupVi={detail.groupTranslationVi} startAt={fullStart} onFinish={() => finish([])} />
          </>
        ) : (
          <>
            <div className="between"><span className="dict-speaker">{clip.speaker || clip.role || 'Clip'}</span><span className="muted small">Câu {index + 1}/{clips.length}</span></div>
            <Wave clipId={clip.clipId} progress={player.progress} onSeek={player.seek} />
            <div className="row dict-controls">
              <button type="button" className="btn btn-outline" onClick={() => playClip(index)}><Icon name="refresh" size={15} />Phát lại <span className="pill" data-tone="muted">{plays}</span></button>
              <button type="button" className="btn btn-outline" aria-label="Câu trước" disabled={!index} onClick={() => go(index - 1)}><Icon name="chevron-left" size={16} /></button>
              <button type="button" className="btn btn-primary dict-play" aria-label={player.playing ? 'Tạm dừng' : 'Phát'} onClick={() => { if (!player.toggle()) playClip(index) }}><Icon name={player.playing ? 'pause' : 'play'} size={18} /></button>
              <button type="button" className="btn btn-outline" aria-label="Câu sau" onClick={() => (index + 1 >= clips.length ? finish(results) : go(index + 1))}><Icon name="chevron-right" size={16} /></button>
              <button type="button" className="btn btn-outline" title="Tốc độ" onClick={() => choose('rate', RATES[(RATES.indexOf(rate) + 1) % RATES.length], setRate)}>{rate}x</button>
              <button type="button" className={`btn ${loop ? 'btn-primary' : 'btn-outline'}`} aria-pressed={loop} onClick={() => choose('loop', !loop, setLoop)}>Tự lặp</button>
            </div>
            <div className="row small">
              <span className="muted strong">ẨN</span>
              {[30, 50, 70, 100].map((value) => <button key={value} type="button" className="chip" data-active={pct === value} aria-pressed={pct === value} onClick={() => choose('pct', value, setPct)}>{value}%</button>)}
              {viOf(clip) && <button type="button" className="chip dict-vi-toggle" data-active={showVi} aria-pressed={showVi} onClick={() => setShowVi((v) => !v)}>Dịch nghĩa</button>}
            </div>
            <ClipStage key={`${runKey}-${index}-${tab}-${pct}`} clip={clip} tab={tab} percentHidden={pct} last={index + 1 >= clips.length} onDone={record} onNext={next} />
            {showVi && viOf(clip) && <p className="muted preserve-lines">{viOf(clip)}</p>}
          </>
        )}
      </section>
      {reporting && <ReportDialog targetType="LISTENING_ITEM" targetId={item.itemId} subtitle={`${item.examTitle || itemTitle(item)} · Part ${item.partNo}`} onClose={() => setReporting(false)} />}
      {listOpen && <ClipListDialog clips={clips} index={index} results={results} onClose={() => setListOpen(false)} onPick={(i) => { if (tab === 'FULL') { setFullStart(i); setRunKey((n) => n + 1) } else go(i) }} />}
    </div>
  )
}

export default function DictationTrainerPage() {
  const { itemId } = useParams()
  const { data, error, loading, reload } = useAsync(() => getDictationItem(itemId), [itemId])
  useDocumentTitle('Luyện nghe chép')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} backTo={backPath()} />
  return <Trainer key={itemId} itemId={Number(itemId)} initial={data} />
}
