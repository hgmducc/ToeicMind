import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Pill, VipPill } from '../../../components/ui/Badges.jsx'
import { ChipLink, Pagination } from '../../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../../components/ui/Feedback.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useAsync } from '../../../hooks/useAsync.js'
import { saveListContext } from '../dictationNav.js'
import { itemTitle } from '../dictationText.js'
import { getDictationItems } from '../services/dictationApi.js'

const STATUS = { NEW: ['Chưa luyện', 'muted'], NEEDS_PRACTICE: ['Cần luyện', 'warning'], DONE: ['Đã đạt', 'success'], IN_PROGRESS: ['Đang luyện', undefined] }
const FILTERS = [['', 'Tất cả'], ['NEW', 'Chưa luyện'], ['NEEDS_PRACTICE', 'Cần luyện'], ['DONE', 'Đã đạt']]
const PAGE_SIZE = 18
const PASS_KEYS = ['examSetId', 'examId', 'partNo', 'categoryId', 'levelNo', 'specialTagId', 'status', 'source', 'view']

export const StatusPill = ({ status }) => {
  const [label, tone] = STATUS[status] || STATUS.NEW
  return <Pill tone={tone}>{label}</Pill>
}

const durationText = (seconds) => {
  const total = Math.round(seconds)
  return total >= 60 ? `${Math.floor(total / 60)} phút${total % 60 ? ` ${total % 60} giây` : ''}` : `${total} giây`
}

function ItemCard({ item, showExam }) {
  const title = itemTitle(item)
  const source = item.sourceKind === 'STANDALONE' ? 'Clip sưu tầm' : item.examTitle
  return (
    <article className="dcard">
      <div className="dcard-top"><Pill>Part {item.partNo}</Pill><StatusPill status={item.status} /><VipPill locked={item.isLocked} /></div>
      <div>
        <b className="dcard-title">{title}</b>
        <p className="muted small">{showExam && source ? `${source}${item.categoryName ? ' · ' : ''}` : ''}{item.categoryName}</p>
      </div>
      <div className="tag-row">
        <Pill tone="muted"><Icon name="headphones" size={12} />{item.clipCount} clip</Pill>
        {item.durationSeconds ? <Pill tone="muted"><Icon name="clock" size={12} />{durationText(item.durationSeconds)}</Pill> : null}
        {item.levelName && <Pill>{item.levelName}</Pill>}
      </div>
      <div className="dcard-foot">
        <span>{item.practiceCount ? <>Đã luyện {item.practiceCount} lần · gần nhất <b>{Math.round(item.lastAccuracy ?? 0)}%</b></> : 'Chưa bắt đầu'}</span>
        <Link className="btn btn-primary btn-sm" to={`/dictation/item/${item.itemId}`}>Luyện tập<Icon name="chevron-right" size={13} /></Link>
      </div>
    </article>
  )
}

// Danh sách bộ clip có lọc (trạng thái, Part) và phân trang; ghi nhớ bộ lọc để trình luyện chuyển bộ đúng danh sách này.
export function ItemList({ fixed = {}, hideStatus = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const filters = { ...Object.fromEntries(PASS_KEYS.filter((key) => params.get(key)).map((key) => [key, params.get(key)])), ...fixed }
  const page = Number(params.get('page')) || 1
  const { data, error, loading, reload } = useAsync(() => getDictationItems({ ...filters, page, pageSize: PAGE_SIZE }), [JSON.stringify(filters), page])

  useEffect(() => {
    const query = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== 'view'))
    saveListContext({ query, back: `${location.pathname}${location.search}` })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), location.pathname, location.search])

  const link = (extra) => {
    const next = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([key]) => !(key in fixed))))
    if (fixed.view !== undefined || params.get('view')) next.set('view', params.get('view') || fixed.view)
    for (const [name, value] of Object.entries(extra)) { if (value) next.set(name, value); else next.delete(name) }
    const text = next.toString()
    return `${location.pathname}${text ? `?${text}` : ''}`
  }

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const firstNew = data.items.find((item) => !item.practiceCount) || data.items[0]
  return (
    <>
      <div className="toolbar">
        {!hideStatus && (
          <nav className="chip-row" aria-label="Lọc theo trạng thái">
            {FILTERS.map(([value, label]) => <ChipLink key={value || 'all'} to={link({ status: value, page: '' })} active={(filters.status || '') === value}>{label}</ChipLink>)}
          </nav>
        )}
        <span className="spacer" />
        {firstNew && <Link className="btn btn-primary" to={`/dictation/item/${firstNew.itemId}`}><Icon name="play" size={14} />Luyện lần lượt</Link>}
        <select className="select" aria-label="Lọc theo Part" value={filters.partNo || ''} onChange={(event) => navigate(link({ partNo: event.target.value, page: '' }))}>
          <option value="">Mọi Part</option>{[1, 2, 3, 4].map((part) => <option key={part} value={part}>Part {part}</option>)}
        </select>
      </div>
      {data.items.length
        ? <div className="grid-cards">{data.items.map((item) => <ItemCard key={item.itemId} item={item} showExam={!filters.examId} />)}</div>
        : <div className="card"><EmptyState>Không có bộ clip nào phù hợp bộ lọc.</EmptyState></div>}
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.totalCount} unit="bộ clip" linkFor={(target) => link({ page: String(target) })} />
    </>
  )
}
