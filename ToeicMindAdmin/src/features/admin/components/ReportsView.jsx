import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePagedList } from '../../exams/hooks/usePagedList.js'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import { getAdminReports, updateAdminReport } from '../services/adminApi.js'
import { FormDialog } from './FormDialog.jsx'
import { Pagination } from './Pagination.jsx'

const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { hour12: false }) : '—')
const STATUS = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý', REJECTED: 'Từ chối' }
const ERROR_TYPE = {
  WRONG_ANSWER: 'Sai đáp án',
  WRONG_EXPLANATION: 'Sai giải thích / nội dung',
  MEDIA_ERROR: 'Lỗi media',
  TYPO: 'Lỗi chính tả',
  OTHER: 'Khác',
}
const PAGE_SIZE = 10
const TARGET = { QUESTION: 'Câu hỏi', VOCABULARY: 'Từ vựng', GRAMMAR_ARTICLE: 'Bài ngữ pháp', LISTENING_ITEM: 'Bộ clip nghe' }
const targetId = (r) => r.questionId ?? r.vocabId ?? r.articleId ?? r.listeningItemId
// Đường dẫn tới màn sửa nội dung bị báo (UC-26 bước 3). Từ vựng chưa có màn quản trị riêng (UC-23).
function targetPath(r) {
  if (r.targetDeleted) return null
  if (r.targetType === 'QUESTION' && r.examId) return `/exams/${r.examId}/edit`
  if (r.targetType === 'GRAMMAR_ARTICLE') return `/grammar?article=${r.articleId}`
  if (r.targetType === 'LISTENING_ITEM') return r.examId ? `/exams/${r.examId}/edit` : `/listening?item=${r.listeningItemId}`
  return null
}
function TargetCell({ report, onOpen }) {
  const path = targetPath(report)
  return (
    <>
      <div className="muted">{TARGET[report.targetType] || report.targetType}</div>
      <b>{report.targetTitle || `#${targetId(report)}`}</b>
      {report.targetDeleted && <div><span className="status-badge" data-status="LOCKED">Nội dung đã xóa</span></div>}
      {path && <div><button type="button" className="btn btn-sm btn-outline" onClick={() => onOpen(path)}>Mở nội dung</button></div>}
    </>
  )
}

export function ReportsView({ session }) {
  const navigate = useNavigate()
  const token = session.accessToken,
    lock = useRef(false)
  const [query, setQuery] = useState({ status: 'NEW', page: 1, pageSize: PAGE_SIZE })
  const [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null),
    [editing, setEditing] = useState(null),
    [dialogError, setDialogError] = useState('')
  const reports = usePagedList(getAdminReports, token, query, reload)

  async function save(values) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setDialogError('')
    try {
      await updateAdminReport(token, editing.reportId, {
        status: values.status,
        adminNote: values.adminNote?.trim() || null,
      })
      setEditing(null)
      setNotice({ kind: 'success', text: 'Đã cập nhật báo lỗi.' })
      setReload((n) => n + 1)
    } catch (error) {
      setDialogError(error.message)
      setNotice(null)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">BÁO LỖI</p>
          <h2>Báo lỗi từ học viên</h2>
          <p className="muted">Xem lỗi nội dung học viên gửi, đổi trạng thái và ghi chú xử lý.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setReload((n) => n + 1)}>
          Tải lại
        </button>
      </div>
      <ApiNotice notice={notice || (reports.error && errorNotice(reports.error))} />
      <section className="admin-card">
        <div className="admin-actions">
          <label>
            Trạng thái
            <select value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))}>
              <option value="">Tất cả</option>
              {Object.entries(STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Đối tượng</th>
                <th>Loại lỗi</th>
                <th>Mô tả</th>
                <th>Người báo</th>
                <th>Trạng thái</th>
                <th>Ghi chú xử lý</th>
                <th>Gửi lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.loading ? (
                <tr>
                  <td colSpan={8}>Đang tải báo lỗi…</td>
                </tr>
              ) : !reports.items.length ? (
                <tr>
                  <td colSpan={8}>{reports.error ? 'Chưa tải được dữ liệu.' : 'Không có báo lỗi phù hợp.'}</td>
                </tr>
              ) : (
                reports.items.map((r) => (
                  <tr key={r.reportId}>
                    <td><TargetCell report={r} onOpen={navigate} /></td>
                    <td>{ERROR_TYPE[r.errorType] || r.errorType}</td>
                    <td>{r.description || '—'}</td>
                    <td>{r.reporterEmail || '—'}</td>
                    <td>
                      <span className="status-badge" data-status={r.status}>
                        {STATUS[r.status] || r.status}
                      </span>
                    </td>
                    <td>{r.adminNote || '—'}</td>
                    <td>{fmt(r.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setDialogError('')
                          setEditing(r)
                        }}
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={query.page}
          total={reports.totalCount}
          pageSize={PAGE_SIZE}
          loading={reports.loading}
          onChange={(page) => setQuery((q) => ({ ...q, page }))}
        />
      </section>
      {editing && (
        <FormDialog
          title={`Xử lý báo lỗi #${editing.reportId}`}
          submitLabel="Cập nhật"
          busy={busy}
          error={dialogError}
          initial={{ status: editing.status === 'NEW' ? 'IN_PROGRESS' : editing.status, adminNote: editing.adminNote || '' }}
          fields={[
            {
              key: 'status',
              label: 'Trạng thái',
              type: 'select',
              options: [
                ['IN_PROGRESS', 'Đang xử lý'],
                ['RESOLVED', 'Đã xử lý'],
                ['REJECTED', 'Từ chối'],
              ],
            },
            { key: 'adminNote', label: 'Ghi chú xử lý', type: 'textarea', maxLength: 1000 },
          ]}
          onClose={() => setEditing(null)}
          onSubmit={save}
        >
          <p className="muted">{TARGET[editing.targetType]}: <b>{editing.targetTitle || `#${targetId(editing)}`}</b></p>
          <p className="muted">{editing.description || 'Học viên không nhập mô tả.'}</p>
          {editing.targetDeleted && <p className="admin-notice" data-kind="info">Nội dung đã bị xóa: đóng báo cáo (Đã xử lý hoặc Từ chối) kèm ghi chú.</p>}
        </FormDialog>
      )}
    </div>
  )
}
