import { useSearchParams } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Pagination } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { formatDateTime } from '../../lib/format.js'
import { getMyReports } from './reportsApi.js'

const STATUS = { NEW: ['Mới gửi', 'muted'], IN_PROGRESS: ['Đang xử lý', 'warning'], RESOLVED: ['Đã xử lý', 'success'], REJECTED: ['Không chấp nhận', 'danger'] }
const TYPES = { WRONG_ANSWER: 'Đáp án sai', WRONG_EXPLANATION: 'Giải thích / nội dung sai', MEDIA_ERROR: 'Lỗi âm thanh/hình', TYPO: 'Lỗi chính tả', OTHER: 'Khác' }
const TARGET = { QUESTION: ['Câu hỏi', 'questionId'], VOCABULARY: ['Từ vựng', 'vocabId'], GRAMMAR_ARTICLE: ['Bài ngữ pháp', 'articleId'], LISTENING_ITEM: ['Bộ clip nghe chép', 'listeningItemId'] }
const targetText = (report) => {
  const [label, key] = TARGET[report.targetType] || [report.targetType, 'questionId']
  return `${label}: ${report.targetTitle || `#${report[key]}`}`
}
const PAGE_SIZE = 20

export default function ReportsPage() {
  useDocumentTitle('Báo lỗi của tôi')
  const [params] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const { data, error, loading, reload } = useAsync(() => getMyReports({ page, pageSize: PAGE_SIZE }), [page])
  return (
    <div className="stack">
      <h1 className="page-title">Báo lỗi của tôi</h1>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {data.items.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Loại lỗi</th><th>Mô tả</th><th>Trạng thái</th><th>Phản hồi</th><th>Ngày gửi</th></tr></thead>
                <tbody>
                  {data.items.map((report) => {
                    const [label, tone] = STATUS[report.status] || [report.status, 'muted']
                    return (
                      <tr key={report.reportId ?? `${report.targetType}-${report.createdAt}`}>
                        <td><b>{TYPES[report.errorType] || report.errorType}</b><div className="muted small">{targetText(report)}</div></td>
                        <td className="small">{report.description}</td>
                        <td><Pill tone={tone}>{label}</Pill></td>
                        <td className="small">{report.adminNote}</td>
                        <td className="muted small">{formatDateTime(report.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="card"><EmptyState>Bạn chưa gửi báo lỗi nào.</EmptyState></div>}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.totalCount} unit="mục" linkFor={(target) => `/reports?page=${target}`} />
        </>
      )}
    </div>
  )
}
