import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChipLink, Pagination } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { AttemptTable } from './components/AttemptTable.jsx'
import { deleteAttempt, getAttempts } from './services/examApi.js'

const PAGE_SIZE = 15
const MODES = [['', 'Tất cả'], ['EXAM', 'Luyện thi'], ['PRACTICE', 'Luyện tập']]

export default function HistoryPage() {
  useDocumentTitle('Lịch sử làm bài')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [params] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const mode = params.get('mode') || ''
  const status = params.get('status') || ''
  const { data, error, loading, reload } = useAsync(() => getAttempts({ page, pageSize: PAGE_SIZE, mode, status }), [page, mode, status])

  const link = (extra) => {
    const next = new URLSearchParams({ ...(mode && { mode }), ...(status && { status }) })
    for (const [name, value] of Object.entries(extra)) { if (value) next.set(name, value); else next.delete(name) }
    const text = next.toString()
    return `/history${text ? `?${text}` : ''}`
  }

  async function remove(attempt) {
    if (!(await confirm({ title: 'Xóa lượt làm bài', message: 'Xóa lượt làm bài này khỏi lịch sử?', danger: true, okLabel: 'Xóa' }))) return
    try { await deleteAttempt(attempt.attemptId); toast('Đã xóa.', 'success'); reload() } catch (failure) { toast(failure.message, 'error') }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Lịch sử làm bài</h1>
      <div className="toolbar">
        <nav className="chip-row" aria-label="Lọc theo chế độ">
          {MODES.map(([value, label]) => <ChipLink key={value || 'all'} to={link({ mode: value, page: '' })} active={mode === value}>{label}</ChipLink>)}
        </nav>
        <span className="spacer" />
        <select className="select" aria-label="Trạng thái" value={status} onChange={(event) => navigate(link({ status: event.target.value, page: '' }))}>
          <option value="">Mọi trạng thái</option><option value="IN_PROGRESS">Đang làm</option><option value="SUBMITTED">Đã nộp</option><option value="ABANDONED">Bỏ dở</option>
        </select>
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {data.items.length ? <AttemptTable items={data.items} onDelete={remove} /> : <div className="card"><EmptyState>Chưa có bài làm nào.</EmptyState></div>}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.totalCount} unit="mục" linkFor={(target) => link({ page: String(target) })} />
        </>
      )}
    </div>
  )
}
