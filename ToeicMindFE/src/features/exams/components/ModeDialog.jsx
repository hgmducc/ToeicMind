import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { VipPill } from '../../../components/ui/Badges.jsx'
import { Dialog } from '../../../components/ui/Dialog.jsx'
import { ErrorState, Loading } from '../../../components/ui/Feedback.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useAsync } from '../../../hooks/useAsync.js'
import { paths } from '../../../routes/learnerRoutes.js'
import { useToast } from '../../../providers/toastContext.js'
import { readExamOptions, readPracticeOptions, writeExamOptions, writePracticeOptions } from '../examOptions.js'
import { getExamModes, getVipStatus, startAttempt } from '../services/examApi.js'

const SKILLS = [['LISTENING', 'Listening'], ['READING', 'Reading']]

function PartPicks({ parts, selected, onToggle }) {
  return SKILLS.map(([skill, label]) => {
    const list = parts.filter((part) => part.skill === skill)
    if (!list.length) return null
    return (
      <div key={skill}>
        <p className="group-label">{label}</p>
        <div className="pick-grid">
          {list.map((part) => {
            const on = selected.has(part.partNo)
            return (
              <button key={part.partNo} type="button" className="pick" aria-pressed={on} onClick={() => onToggle(part.partNo)}>
                <span className="pick-dot">{on && <Icon name="check" size={12} />}</span>Part {part.partNo}<span className="pick-count">{part.questionCount} câu</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  })
}

function ModeBody({ dto, vip, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  const parts = useMemo(() => dto.parts.filter((part) => part.questionCount > 0), [dto])
  const minMin = Math.max(1, Math.ceil(dto.minTimeLimitSeconds / 60))
  const maxMin = Math.floor(dto.maxTimeLimitSeconds / 60)
  const clampMin = (value) => Math.min(maxMin, Math.max(minMin, Math.round(value)))
  const suggested = (list) => clampMin(list.reduce((sum, part) => sum + part.suggestedSeconds, 0) / 60)
  const optionOf = (scope) => dto.examOptions.find((option) => option.scope === scope)

  const [tab, setTab] = useState('EXAM')
  const [chosen, setChosen] = useState({ EXAM: new Set(), PRACTICE: new Set() })
  const [minutes, setMinutes] = useState(() => Object.fromEntries(['FULL', 'LISTENING', 'READING'].map((scope) => {
    const option = optionOf(scope)
    return [scope, option ? Math.round((option.timeLimitSeconds || 0) / 60) || suggested(parts.filter((part) => option.partNos.includes(part.partNo))) : 0]
  })))
  const [customMin, setCustomMin] = useState(null)
  const [options, setOptions] = useState(readExamOptions)
  const [practice, setPractice] = useState(readPracticeOptions)
  const [busy, setBusy] = useState(false)

  const selected = chosen[tab]
  const customSuggested = chosen.EXAM.size ? suggested(parts.filter((part) => chosen.EXAM.has(part.partNo))) : 0
  const customValue = customMin ?? customSuggested

  function toggle(partNo) {
    setChosen((current) => {
      const next = new Set(current[tab])
      if (next.has(partNo)) next.delete(partNo); else next.add(partNo)
      return { ...current, [tab]: next }
    })
    if (tab === 'EXAM') setCustomMin(null)
  }

  function setOption(name, value) {
    const next = { ...options, [name]: value }
    setOptions(next)
    writeExamOptions(next)
  }

  async function start(body, minutesValue) {
    if (busy) return
    if (minutesValue !== undefined && !(minutesValue >= minMin && minutesValue <= maxMin)) { toast(`Thời gian phải từ ${minMin} đến ${maxMin} phút.`, 'error'); return }
    setBusy(true)
    try {
      const attempt = await startAttempt({ examId: dto.examId, ...body })
      onClose()
      navigate(paths.attempt(attempt.attemptId))
    } catch (error) {
      setBusy(false)
      if (error.code !== 'VIP_REQUIRED') toast(error.message, 'error', 5000)
    }
  }

  const startExam = (scope) => start({ mode: 'EXAM', scope, timeLimitSeconds: minutes[scope] * 60 }, minutes[scope])
  const startCustom = () => {
    const numbers = [...chosen.EXAM].sort((a, b) => a - b)
    start(numbers.length === 7 ? { mode: 'EXAM', scope: 'FULL', timeLimitSeconds: customValue * 60 } : { mode: 'EXAM', scope: 'PART', partNos: numbers, timeLimitSeconds: customValue * 60 }, customValue)
  }
  const startPractice = () => {
    const numbers = [...chosen.PRACTICE].sort((a, b) => a - b)
    start(numbers.length === parts.length && parts.length === 7 ? { mode: 'PRACTICE', scope: 'FULL' } : { mode: 'PRACTICE', scope: 'PART', partNos: numbers })
  }

  const card = (scope, icon, name, text) => {
    const option = optionOf(scope)
    if (!option) return null
    return (
      <div className="mode-card" key={scope}>
        <span className="mode-icon"><Icon name={icon} size={20} /></span>
        <h3>{name}</h3>
        <p className="muted small">{text}</p>
        <div className="row small">
          <label className="pill"><Icon name="clock" size={12} />
            <input className="input time-input" type="number" min={minMin} max={maxMin} value={minutes[scope]} aria-label={`Số phút ${name}`} onChange={(event) => setMinutes({ ...minutes, [scope]: Number(event.target.value) })} /> phút
          </label>
          <span className="pill" data-tone="muted"><Icon name="file" size={12} />{option.questionCount} câu</span>
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => startExam(scope)}><Icon name="play" size={14} />Bắt đầu</button>
      </div>
    )
  }

  const tabs = (
    <div className="seg-tabs seg-tabs--fill" role="tablist">
      <button type="button" role="tab" className="seg-tab" aria-selected={tab === 'EXAM'} data-active={tab === 'EXAM'} onClick={() => setTab('EXAM')}><Icon name="file" size={15} /> Luyện thi</button>
      <button type="button" role="tab" className="seg-tab" aria-selected={tab === 'PRACTICE'} data-active={tab === 'PRACTICE'} onClick={() => setTab('PRACTICE')}><Icon name="target" size={15} /> Luyện tập</button>
    </div>
  )

  return (
    <div className="stack">
      {dto.access === 'VIP' && vip && !vip.isVip && !vip.isAdmin && (
        <p className="callout"><VipPill /> Đề này dành cho tài khoản VIP. <Link className="text-link" to="/vip" onClick={onClose}>Nâng cấp VIP</Link> để làm bài.</p>
      )}
      {tabs}
      {tab === 'EXAM' ? (
        <>
          <div className="mode-grid">
            {card('FULL', 'file', 'Full Test', 'Làm như thi thật')}
            {card('LISTENING', 'headphones', 'Thi Listening', 'Thi riêng phần nghe')}
            {card('READING', 'book', 'Thi Reading', 'Thi riêng phần đọc')}
          </div>
          <div className="mode-card">
            <div className="row">
              <span className="mode-icon"><Icon name="target" size={20} /></span>
              <div className="spacer"><h3>Thi theo Part</h3><p className="muted small">Chọn một hoặc nhiều Part, tự đặt thời gian</p></div>
              <label className="small row">Thời gian
                <input className="input time-input" type="number" min={minMin} max={maxMin} value={selected.size ? customValue : ''} disabled={!selected.size} aria-label="Số phút thi theo Part" onChange={(event) => setCustomMin(Number(event.target.value))} /> phút
              </label>
              <button type="button" className="btn btn-primary" disabled={!selected.size || busy} onClick={startCustom}><Icon name="play" size={14} />Bắt đầu</button>
            </div>
            <PartPicks parts={parts} selected={selected} onToggle={toggle} />
          </div>
          <div className="mode-card">
            <strong>Tùy chọn khi thi</strong>
            <label className="check-row"><input type="checkbox" checked={options.autoDirections} onChange={(event) => setOption('autoDirections', event.target.checked)} />Tự phát âm thanh hướng dẫn khi vào bài</label>
            <label className="check-row"><input type="checkbox" checked={options.autoNext} onChange={(event) => setOption('autoNext', event.target.checked)} />Tự chuyển câu khi hết audio (phần Nghe)</label>
          </div>
          <p className="muted small">Luyện thi chạy liền mạch như thi thật: hướng dẫn (có nút bỏ qua, không tính giờ) → từng câu, không quay lại. Part 1–2 chỉ hiện A/B/C/D. Sau khi nộp bài hoặc hết giờ: xem điểm, bảng đáp án và đáp án chi tiết kèm giải thích.</p>
        </>
      ) : (
        <>
          <p className="callout callout--info"><b>Chế độ Luyện tập:</b> không giới hạn giờ, xem đáp án và giải thích từng câu; kết thúc bài để xem bảng đáp án và đáp án chi tiết.</p>
          <div className="mode-card">
            <strong>Tùy chọn khi luyện tập</strong>
            <label className="check-row">
              <input type="checkbox" checked={practice.instantAnswer} onChange={(event) => { const next = { instantAnswer: event.target.checked }; setPractice(next); writePracticeOptions(next) }} />
              Hiện đáp án và giải thích ngay sau khi chọn (không cần nộp bài)
            </label>
            <p className="muted small">Tắt: chọn đáp án chưa hiện đúng/sai, đổi được lựa chọn; bấm “Xem đáp án” ở từng câu khi muốn, hoặc xem tất cả sau khi kết thúc. Đổi được ngay trong lúc làm bài.</p>
          </div>
          <div className="mode-card">
            <div className="row">
              <span className="mode-icon"><Icon name="check" size={20} /></span>
              <h3 className="spacer">Chọn Part để luyện tập</h3>
              <button type="button" className="btn btn-primary" disabled={!selected.size || busy} onClick={startPractice}><Icon name="play" size={14} />Bắt đầu</button>
            </div>
            <div className="pick-grid">
              <button type="button" className="pick pick--all" aria-pressed={selected.size === parts.length && parts.length > 0}
                onClick={() => setChosen((current) => ({ ...current, PRACTICE: current.PRACTICE.size === parts.length ? new Set() : new Set(parts.map((part) => part.partNo)) }))}>
                <span className="pick-dot">{selected.size === parts.length && parts.length > 0 && <Icon name="check" size={12} />}</span>Chọn tất cả {parts.length} Part<span className="pick-count">{dto.totalQuestions} câu</span>
              </button>
            </div>
            <PartPicks parts={parts} selected={selected} onToggle={toggle} />
          </div>
        </>
      )}
    </div>
  )
}

// Hộp "Chọn chế độ" của một đề: Luyện thi (full, Nghe, Đọc, theo Part) hoặc Luyện tập.
export function ModeDialog({ examId, title, onClose }) {
  const { data, error, loading, reload } = useAsync(async () => {
    const dto = await getExamModes(examId)
    let vip = null
    if (dto.access === 'VIP') { try { vip = await getVipStatus() } catch { /* Máy chủ vẫn là nơi quyết định quyền. */ } }
    return { dto, vip }
  }, [examId])

  return (
    <Dialog title="Chọn chế độ" description={title} size="lg" onClose={onClose}>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : <ModeBody dto={data.dto} vip={data.vip} onClose={onClose} />}
    </Dialog>
  )
}
