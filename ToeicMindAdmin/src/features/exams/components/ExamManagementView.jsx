import { useRef, useState } from 'react'
import {
  checkPublishExam,
  createAdminExamSet,
  deleteAdminExam,
  deleteAdminExamSet,
  getAdminExams,
  getAdminExamSets,
  publishExam,
  restoreAdminExam,
  restoreAdminExamSet,
  unpublishExam,
  updateAdminExamSet,
} from '../services/examService.js'
import { usePagedList } from '../hooks/usePagedList.js'
import { AccessBadge, DEFAULT_SET_ACCESS, SetAccessBadges, SetAccessFields } from './AccessControls.jsx'
import { ApiNotice } from './ApiNotice.jsx'
import { errorNotice } from '../utils/apiErrors.js'
import { PublishCheckModal } from './PublishCheckModal.jsx'

function Pagination({ page, total, onChange, loading }) {
  const pages = Math.max(1, Math.ceil(total / 20))
  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={loading || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </button>
      <span>
        Trang {page}/{pages} · {total} kết quả
      </span>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={loading || page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </div>
  )
}

export function ExamManagementView({ session, onEditExamDirectly, onUploadNewExam }) {
  const token = session.accessToken,
    lock = useRef(false)
  const [setQuery, setSetQuery] = useState({ search: '', isDeleted: false, page: 1, pageSize: 20 })
  const [examQuery, setExamQuery] = useState({
    search: '',
    status: '',
    isDeleted: false,
    page: 1,
    pageSize: 20,
    examSetId: '',
  })
  const [editing, setEditing] = useState(null),
    [create, setCreate] = useState({ name: '', description: '', ...DEFAULT_SET_ACCESS })
  const [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null),
    [modal, setModal] = useState(null)
  const sets = usePagedList(getAdminExamSets, token, setQuery, reload),
    exams = usePagedList(getAdminExams, token, examQuery, reload)
  function filterSet(patch) {
    setSetQuery((q) => ({ ...q, ...patch, page: 1 }))
  }
  function filterExam(patch) {
    setExamQuery((q) => ({ ...q, ...patch, page: 1 }))
  }
  async function act(action, success) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setNotice(null)
    try {
      await action()
      if (success) setNotice({ kind: 'success', text: success })
      setReload((n) => n + 1)
    } catch (error) {
      setNotice(errorNotice(error))
      if (error.raw?.issues) setModal((m) => ({ ...m, isValid: false, issues: error.raw.issues }))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function check(exam) {
    return act(async () => {
      const result = await checkPublishExam(token, exam.examId)
      setModal({ ...result, exam })
    })
  }
  const listError = sets.error || exams.error
  return (
    <div className="exam-management-page">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">KHO ĐỀ</p>
          <h2>Bộ đề và đề thi</h2>
          <p className="muted">Tìm kiếm, biên soạn, kiểm tra và xuất bản.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onUploadNewExam}>
          Nhập đề mới
        </button>
      </div>
      <ApiNotice notice={notice || (listError && errorNotice(listError))} />
      {listError && (
        <button type="button" className="btn btn-outline" onClick={() => setReload((n) => n + 1)}>
          Thử tải lại
        </button>
      )}
      <section className="admin-card">
        <div className="admin-card-header">
          <h3>Bộ đề</h3>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              filterSet({ isDeleted: !setQuery.isDeleted })
              filterExam({ examSetId: '' })
            }}
          >
            {setQuery.isDeleted ? 'Bộ đề đang hoạt động' : 'Thùng rác bộ đề'}
          </button>
        </div>
        <label className="search-field">
          Tìm bộ đề
          <input
            type="search"
            value={setQuery.search}
            maxLength={100}
            onChange={(e) => filterSet({ search: e.target.value })}
          />
        </label>
        {!setQuery.isDeleted && (
          <form
            className="admin-actions"
            onSubmit={(e) => {
              e.preventDefault()
              act(async () => {
                await createAdminExamSet(token, create)
                setCreate({ name: '', description: '', ...DEFAULT_SET_ACCESS })
              }, 'Đã tạo bộ đề.')
            }}
          >
            <label>
              Tên bộ đề mới *
              <input
                required
                maxLength={200}
                value={create.name}
                onChange={(e) => setCreate({ ...create, name: e.target.value })}
              />
            </label>
            <label>
              Mô tả
              <input
                maxLength={1000}
                value={create.description}
                onChange={(e) => setCreate({ ...create, description: e.target.value })}
              />
            </label>
            <SetAccessFields value={create} onChange={(access) => setCreate({ ...create, ...access })} />
            <button type="submit" className="btn btn-primary" disabled={busy || !create.name.trim()}>
              Tạo bộ đề
            </button>
          </form>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bộ đề</th>
                <th>Mô tả</th>
                <th>Quyền truy cập</th>
                <th>Số đề / Xuất bản</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sets.loading ? (
                <tr>
                  <td colSpan={5}>Đang tải bộ đề…</td>
                </tr>
              ) : !sets.items.length ? (
                <tr>
                  <td colSpan={5}>{sets.error ? 'Chưa tải được dữ liệu.' : 'Chưa có bộ đề phù hợp.'}</td>
                </tr>
              ) : (
                sets.items.map((s) => (
                  <tr key={s.examSetId}>
                    <td>
                      <strong>{s.name}</strong>
                      <small className="muted"> #{s.examSetId}</small>
                    </td>
                    <td>{s.description || '—'}</td>
                    <td>
                      <SetAccessBadges set={s} />
                    </td>
                    <td>
                      {s.examCount} / {s.publishedExamCount}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {s.isDeleted ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={busy}
                            onClick={() =>
                              act(() => restoreAdminExamSet(token, s.examSetId), 'Đã khôi phục bộ đề.')
                            }
                          >
                            Khôi phục
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() =>
                                filterExam({
                                  examSetId: examQuery.examSetId === s.examSetId ? '' : s.examSetId,
                                })
                              }
                            >
                              {examQuery.examSetId === s.examSetId ? 'Bỏ lọc' : 'Lọc đề'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busy}
                              onClick={() => setEditing({ ...s })}
                            >
                              Sửa bộ đề
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(`Xóa mềm bộ đề “${s.name}”?`))
                                  act(() => deleteAdminExamSet(token, s.examSetId), 'Đã xóa bộ đề.')
                              }}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={setQuery.page}
          total={sets.totalCount}
          loading={sets.loading}
          onChange={(page) => setSetQuery((q) => ({ ...q, page }))}
        />
        {editing && (
          <form
            className="admin-card edit-set-form"
            onSubmit={(e) => {
              e.preventDefault()
              act(async () => {
                await updateAdminExamSet(token, editing.examSetId, editing)
                setEditing(null)
              }, 'Đã cập nhật bộ đề.')
            }}
          >
            <h4>Sửa bộ đề #{editing.examSetId}</h4>
            <div className="admin-form-grid">
              <label>
                Tên bộ đề *
                <input
                  required
                  maxLength={200}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label>
                Mô tả
                <input
                  maxLength={1000}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
              <SetAccessFields value={editing} onChange={(access) => setEditing({ ...editing, ...access })} />
            </div>
            <div className="admin-actions">
              <button className="btn btn-primary" disabled={busy || !editing.name.trim()}>
                Lưu bộ đề
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="admin-card">
        <div className="admin-card-header">
          <h3>Đề thi{examQuery.examSetId ? ` · Bộ #${examQuery.examSetId}` : ''}</h3>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => filterExam({ isDeleted: !examQuery.isDeleted })}
          >
            {examQuery.isDeleted ? 'Đề đang hoạt động' : 'Thùng rác đề thi'}
          </button>
        </div>
        <div className="admin-actions">
          <label>
            Tìm đề thi
            <input
              type="search"
              maxLength={100}
              value={examQuery.search}
              onChange={(e) => filterExam({ search: e.target.value })}
            />
          </label>
          <label>
            Trạng thái
            <select value={examQuery.status} onChange={(e) => filterExam({ status: e.target.value })}>
              <option value="">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
            </select>
          </label>
          {examQuery.examSetId && (
            <button type="button" className="btn btn-outline" onClick={() => filterExam({ examSetId: '' })}>
              Bỏ lọc bộ đề
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => setReload((n) => n + 1)}
          >
            Tải lại
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Đề thi</th>
                <th>Mã đề</th>
                <th>Bộ đề</th>
                <th>Quyền làm đề</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {exams.loading ? (
                <tr>
                  <td colSpan={6}>Đang tải đề thi…</td>
                </tr>
              ) : !exams.items.length ? (
                <tr>
                  <td colSpan={6}>{exams.error ? 'Chưa tải được dữ liệu.' : 'Không có đề phù hợp.'}</td>
                </tr>
              ) : (
                exams.items.map((e) => (
                  <tr key={e.examId}>
                    <td>
                      <strong>{e.title}</strong>
                      <small className="muted"> #{e.examId}</small>
                    </td>
                    <td>
                      <code>{e.examCode}</code>
                    </td>
                    <td>#{e.examSetId}</td>
                    <td>
                      <AccessBadge value={e.effectiveAccess} />
                      {e.accessLevel && <small className="muted"> (riêng đề)</small>}
                    </td>
                    <td>
                      <span className="status-badge" data-status={e.status}>
                        {e.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {e.isDeleted ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            disabled={busy}
                            onClick={() => act(() => restoreAdminExam(token, e.examId), 'Đã khôi phục đề.')}
                          >
                            Khôi phục
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busy}
                              onClick={() => onEditExamDirectly(e)}
                            >
                              {e.status === 'PUBLISHED' ? 'Xem nội dung' : 'Biên soạn'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busy}
                              onClick={() => check(e)}
                            >
                              Kiểm tra
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busy}
                              onClick={() =>
                                e.status === 'PUBLISHED'
                                  ? act(() => unpublishExam(token, e.examId), 'Đã chuyển đề về nháp.')
                                  : check(e)
                              }
                            >
                              {e.status === 'PUBLISHED' ? 'Đưa về nháp' : 'Xuất bản'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(`Xóa mềm đề “${e.title}”?`))
                                  act(() => deleteAdminExam(token, e.examId), 'Đã xóa đề.')
                              }}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={examQuery.page}
          total={exams.totalCount}
          loading={exams.loading}
          onChange={(page) => setExamQuery((q) => ({ ...q, page }))}
        />
      </section>
      <PublishCheckModal
        isOpen={!!modal}
        isValid={modal?.isValid}
        issues={modal?.issues || []}
        isPublishing={busy}
        onClose={() => {
          if (!busy) setModal(null)
        }}
        onConfirmPublish={() =>
          act(async () => {
            await publishExam(token, modal.exam.examId)
            setModal(null)
          }, 'Backend đã xác nhận xuất bản đề thi.')
        }
      />
    </div>
  )
}
