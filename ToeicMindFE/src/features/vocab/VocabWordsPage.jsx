import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { ChipLink, Pagination } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDate } from '../../lib/format.js'
import { useToast } from '../../providers/toastContext.js'
import { VocabTabs } from './components/VocabTabs.jsx'
import { CEFR_LEVELS } from './services/sessionLoader.js'
import { familiarityOfProgress } from './engine/scoring.js'
import { SpeakButton } from './modes/SpeakButton.jsx'
import { getVocabWords, saveMyVocab } from './services/vocabApi.js'
import { ReportDialog } from '../reports/ReportDialog.jsx'

const STATUSES = [['', 'Tất cả'], ['NEW', 'Mới'], ['DUE', 'Đến hạn'], ['LEARNING', 'Đang học'], ['MASTERED', 'Đã thuộc']]
const PAGE_SIZE = 30
const SCOPE_KEYS = ['examSetId', 'examId', 'partNo']

function WordCard({ word }) {
  const toast = useToast()
  const [reporting, setReporting] = useState(false)
  const familiarity = familiarityOfProgress(word)
  async function save() {
    try { await saveMyVocab({ vocabId: word.vocabId }); toast('Đã lưu từ vào bộ từ của bạn.', 'success') }
    catch (error) {
      if (error.code === 'VOCAB_EXISTS') toast('Từ này đã có trong bộ từ.')
      else toast(error.message, 'error')
    }
  }
  return (
    <li className="word-card">
      <div className="spacer">
        <p><b className="word-lemma">{word.lemma}</b> <i className="muted small">{word.posCode}</i>{word.ipaUs && <span className="muted small"> /{word.ipaUs}/</span>} <Pill>{word.cefrLevel}</Pill></p>
        <p>{word.meaningVi}</p>
        {word.definitionEn && <p className="muted small">{word.definitionEn}</p>}
      </div>
      <div className="word-card-state">
        <Pill tone={familiarity.tone === 'default' ? undefined : familiarity.tone}>{familiarity.label}</Pill>
        {word.isDue && <Pill tone="warning">Đến hạn ôn</Pill>}
        {word.status !== 'NEW' && !word.isDue && word.nextReviewAt && <span className="muted small">Ôn lại: {formatDate(word.nextReviewAt)}</span>}
        {word.lapses > 0 && <span className="muted small">quên {word.lapses} lần</span>}
      </div>
      <SpeakButton text={word.lemma} compact />
      <button type="button" className="icon-btn" aria-label={`Lưu ${word.lemma} vào Từ của tôi`} title="Lưu vào Từ của tôi" onClick={save}><Icon name="plus" size={16} /></button>
      <button type="button" className="icon-btn" aria-label={`Báo lỗi từ ${word.lemma}`} title="Báo lỗi từ này" onClick={() => setReporting(true)}><Icon name="flag" size={15} /></button>
      {reporting && <ReportDialog targetType="VOCABULARY" targetId={word.vocabId} subtitle={`Từ: ${word.lemma} (${word.posCode})`} onClose={() => setReporting(false)} />}
    </li>
  )
}

export default function VocabWordsPage() {
  useDocumentTitle('Danh sách từ vựng')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const status = params.get('status') || ''
  const cefr = params.get('cefr') || ''
  const search = params.get('search') || ''
  const scope = Object.fromEntries(SCOPE_KEYS.filter((key) => params.get(key)).map((key) => [key, params.get(key)]))
  const key = params.toString()
  const { data, error, loading, reload } = useAsync(() => getVocabWords({ ...scope, status, cefrLevel: cefr, search, page, pageSize: PAGE_SIZE }), [key])

  const link = (extra) => {
    const next = new URLSearchParams({ ...scope, ...(status && { status }), ...(cefr && { cefr }), ...(search && { search }) })
    for (const [name, value] of Object.entries(extra)) { if (value) next.set(name, value); else next.delete(name) }
    const text = next.toString()
    return `/vocab/words${text ? `?${text}` : ''}`
  }
  const back = scope.examSetId ? `/vocab?set=${scope.examSetId}` : '/vocab'
  const learn = `/vocab/learn${Object.keys(scope).length ? `?${new URLSearchParams(scope)}` : ''}`

  return (
    <div className="stack">
      <VocabTabs current="learn" />
      <div className="page-head">
        <Link className="btn btn-outline btn-sm" to={back}><Icon name="chevron-left" size={14} />Bộ đề</Link>
        <h1 className="page-title spacer">Danh sách từ vựng{scope.partNo ? ` · Part ${scope.partNo}` : ''}</h1>
        <Link className="btn btn-primary" to={learn}><Icon name="play" size={14} />Học phần này</Link>
      </div>
      <div className="toolbar">
        <nav className="chip-row" aria-label="Lọc theo trạng thái">
          {STATUSES.map(([value, label]) => <ChipLink key={value || 'all'} to={link({ status: value, page: '' })} active={status === value}>{label}</ChipLink>)}
        </nav>
        <span className="spacer" />
        <select className="select" aria-label="Mức CEFR" value={cefr} onChange={(event) => navigate(link({ cefr: event.target.value, page: '' }))}>
          <option value="">Mọi mức CEFR</option>
          {CEFR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
        <form onSubmit={(event) => { event.preventDefault(); navigate(link({ search: new FormData(event.currentTarget).get('search').trim(), page: '' })) }}>
          <input className="input" type="search" name="search" defaultValue={search} placeholder="Tìm từ hoặc nghĩa…" aria-label="Tìm từ" />
          <button type="submit" className="btn btn-outline">Tìm</button>
        </form>
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {data.items.length ? <ul className="word-list">{data.items.map((word) => <WordCard key={word.vocabId} word={word} />)}</ul> : <div className="card"><EmptyState>Không có từ nào phù hợp.</EmptyState></div>}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} unit="từ" linkFor={(target) => link({ page: String(target) })} />
        </>
      )}
    </div>
  )
}
