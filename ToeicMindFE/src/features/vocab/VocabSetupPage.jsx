import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Chip } from '../../components/ui/Controls.jsx'
import { ErrorState } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useStoredState } from '../../hooks/useStoredState.js'
import { VocabTabs } from './components/VocabTabs.jsx'
import { MODES, MODE_IDS, isModeId } from './engine/modeCatalog.js'
import { CEFR_LEVELS, DIFFICULTIES, SOURCES, WORD_COUNTS, configToQuery, parseConfig } from './services/sessionLoader.js'
import { getStudySession } from './services/vocabApi.js'

const STEPS = [
  ['2–3 dạng ngẫu nhiên', 'Mỗi từ được hỏi bằng 2–3 dạng câu hỏi khác nhau, chọn ngẫu nhiên trong các dạng bạn bật.'],
  ['Cách nhau một vòng', 'Hai câu của cùng một từ không đứng liền nhau nên đo được độ nhớ thật, không phải nhớ ngắn hạn.'],
  ['Độ quen thuộc', 'Đúng + nhanh ở mọi câu là “Rất quen”; sai một phần là “Mới quen”; sai hết là “Chưa quen”. Kết quả quyết định lịch ôn.'],
]

export default function VocabSetupPage() {
  useDocumentTitle('Chọn cách học từ vựng')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromUrl = params.has('modes') || params.has('src') || params.has('n') || params.has('diff')
  const initial = parseConfig(params)
  const [storedModes, setStoredModes] = useStoredState('toeicmind_fe_vocab_modes', MODE_IDS)
  const [storedSrc, setStoredSrc] = useStoredState('toeicmind_fe_vocab_src', 'SMART')
  const [storedCount, setStoredCount] = useStoredState('toeicmind_fe_vocab_count', WORD_COUNTS[1])
  const [storedDiff, setStoredDiff] = useStoredState('toeicmind_fe_vocab_diff', 'auto')
  const [modeIds, setModeIds] = useState(fromUrl ? initial.modeIds : storedModes.filter(isModeId).length >= 2 ? storedModes.filter(isModeId) : MODE_IDS)
  const [src, setSrc] = useState(fromUrl ? initial.src : SOURCES.some((s) => s.id === storedSrc) ? storedSrc : 'SMART')
  const [count, setCount] = useState(fromUrl ? initial.count : storedCount)
  const [diff, setDiff] = useState(fromUrl ? initial.diff : (/^[0-3]$/.test(String(storedDiff)) ? Number(storedDiff) : 'auto'))
  const [cefr, setCefr] = useState(initial.cefr)
  const scope = initial.scope
  const probe = useAsync(() => getStudySession({ ...scope, cefrLevel: cefr, limit: 1 }), [params.toString(), cefr])
  const back = scope.examSetId ? `/vocab?set=${scope.examSetId}` : '/vocab'

  const allSelected = modeIds.length === MODE_IDS.length
  const toggle = (id) => setModeIds((current) => (current.includes(id) ? (current.length > 2 ? current.filter((x) => x !== id) : current) : MODE_IDS.filter((x) => x === id || current.includes(x))))

  function start() {
    setStoredModes(modeIds); setStoredSrc(src); setStoredCount(count); setStoredDiff(diff)
    navigate(`/vocab/play?${configToQuery({ scope, modeIds, src, count, diff, cefr })}`)
  }

  return (
    <div className="stack">
      <VocabTabs current="learn" />
      <div className="page-head">
        <Link className="btn btn-outline btn-sm" to={back}><Icon name="chevron-left" size={14} />Quay lại</Link>
        <div className="spacer"><h1 className="page-title">Chọn cách học từ vựng</h1></div>
      </div>
      {probe.error && <ErrorState error={probe.error} onRetry={probe.reload} backTo={back} />}
      {!probe.error && (
        <p className="page-lead">
          Phạm vi đã chọn: <b>{probe.loading ? '…' : probe.data.dueTotal}</b> từ đến hạn ôn · <b>{probe.loading ? '…' : probe.data.newTotal}</b> từ mới (theo lịch ôn của máy chủ).
        </p>
      )}

      <section className="card vq-howto" aria-label="Cách hệ thống đánh giá">
        <ol className="vq-steps">
          {STEPS.map(([title, text], i) => <li key={title}><span className="vq-step-no">{i + 1}</span><div><b>{title}</b><p className="muted small">{text}</p></div></li>)}
        </ol>
      </section>

      <section aria-labelledby="vq-types-title">
        <div className="row">
          <h2 className="section-title" id="vq-types-title" style={{ margin: 0 }}>Dạng câu hỏi {allSelected ? '' : <span className="pill">{modeIds.length} đã chọn</span>}</h2>
          <span className="spacer" />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setModeIds(MODE_IDS)} disabled={allSelected}>Chọn tất cả 7 dạng</button>
        </div>
        <p className="section-sub">Chọn ít nhất 2 dạng. Mỗi từ sẽ lấy ngẫu nhiên 2–3 dạng trong số này.</p>
        <div className="vm-grid">
          {MODE_IDS.map((id) => {
            const mode = MODES[id]
            const on = modeIds.includes(id)
            return (
              <button key={id} type="button" className="vm-card" aria-pressed={on} onClick={() => toggle(id)}>
                <span className="vm-tick" aria-hidden="true">{on && <Icon name="check" size={13} />}</span>
                <span className="vm-card-icon"><Icon name={mode.icon} size={20} /></span>
                <b>{mode.name}</b>
                <span className="muted small">{mode.vi}</span>
                <span className="small muted">{mode.desc}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card vm-options">
        <div><p className="group-label">Nguồn từ</p><div className="chip-row">{SOURCES.map((s) => <Chip key={s.id} active={src === s.id} title={s.hint} onClick={() => setSrc(s.id)}>{s.label}</Chip>)}</div><p className="muted small">{SOURCES.find((s) => s.id === src).hint}</p></div>
        <div><p className="group-label">Số từ mỗi lượt</p><div className="chip-row">{WORD_COUNTS.map((n) => <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n} từ</Chip>)}</div><p className="muted small">≈ {count * 2}–{count * 3} câu hỏi mỗi lượt.</p></div>
        <div><p className="group-label">Độ khó</p><div className="chip-row">{DIFFICULTIES.map(([value, label]) => <Chip key={value} active={String(diff === 'auto' ? 'auto' : diff + 1) === value} onClick={() => setDiff(value === 'auto' ? 'auto' : Number(value) - 1)}>{label}</Chip>)}</div><p className="muted small">Tự động: mỗi từ có độ khó riêng theo mức quen đã lưu, và tăng/giảm ngay trong lượt khi bạn trả lời nhanh hoặc sai.</p></div>
        <div><p className="group-label">Mức CEFR</p><div className="chip-row">{['', ...CEFR_LEVELS].map((level) => <Chip key={level || 'all'} active={cefr === level} onClick={() => setCefr(level)}>{level || 'Tất cả'}</Chip>)}</div></div>
      </section>

      <div className="vq-start">
        <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={modeIds.length < 2}><Icon name="play" size={16} />Bắt đầu học</button>
        <span className="muted small">{count} từ · {allSelected ? 'cả 7 dạng câu hỏi' : `${modeIds.length} dạng câu hỏi`} · {SOURCES.find((s) => s.id === src).label.toLowerCase()}</span>
      </div>
    </div>
  )
}
