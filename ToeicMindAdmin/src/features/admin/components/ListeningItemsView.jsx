import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { usePagedList } from '../../exams/hooks/usePagedList.js'
import { deleteMedia, getExamCatalog } from '../../exams/services/examService.js'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import {
  deleteListeningClip,
  deleteListeningItem,
  getListeningItem,
  getListeningItems,
  restoreListeningItem,
  saveListeningClip,
  saveListeningItem,
  setListeningItemPublished,
  uploadListeningClipAudio,
} from '../services/adminApi.js'
import { FormDialog } from './FormDialog.jsx'
import { MediaPreviewDialog } from './MediaPreviewDialog.jsx'
import { Pagination } from './Pagination.jsx'
import { useAction } from './useAction.js'

const PAGE_SIZE = 10
// Vai trò clip theo Part (UC-28 E1, CK_ListeningClip_RolePart).
const ROLES = {
  1: [['OPTION_A', '(A)'], ['OPTION_B', '(B)'], ['OPTION_C', '(C)'], ['OPTION_D', '(D)']],
  2: [['QUESTION', 'Câu hỏi'], ['OPTION_A', '(A)'], ['OPTION_B', '(B)'], ['OPTION_C', '(C)']],
  3: [['SENTENCE', 'Câu hội thoại']],
  4: [['SENTENCE', 'Câu bài nói']],
}
const roleLabel = (part, role) => ROLES[part]?.find(([v]) => v === role)?.[1] || role
const short = (s, n = 90) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '—')
const numberOrNull = (v) => (v === '' || v == null ? null : Number(v))

// Chi tiết một bộ clip: phân loại (bắt buộc trước khi xuất bản), danh sách clip, audio từng clip.
function ItemDetail({ token, itemId, catalog, onChanged, onClose }) {
  const { busy, notice, setNotice, run } = useAction()
  const fileRef = useRef(null)
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [uploadFor, setUploadFor] = useState(null)
  useEffect(() => {
    let active = true
    getListeningItem(token, itemId).then((d) => active && setDetail(d)).catch((e) => active && setLoadError(e))
    return () => { active = false }
  }, [token, itemId])

  // Mọi thao tác trả về chi tiết mới của bộ clip.
  async function apply(action, success) {
    const out = await run(action, success)
    if (out?.result?.item) setDetail(out.result)
    if (out) onChanged()
    return out
  }

  if (loadError) return <section className="admin-card"><ApiNotice notice={errorNotice(loadError)} /><button type="button" className="btn btn-outline" onClick={onClose}>Đóng</button></section>
  if (!detail) return <section className="admin-card"><p role="status">Đang tải bộ clip…</p></section>
  const { item, clips } = detail
  const categories = (catalog?.categories || []).filter((c) => c.partNo === item.partNo && c.isLeaf)
  const roles = ROLES[item.partNo] || []
  const missingAudio = item.clipCount - item.audioCount

  return (
    <section className="admin-card listening-detail" aria-labelledby="listening-detail-title">
      <div className="admin-card-header">
        <div>
          <h3 id="listening-detail-title">Bộ clip #{item.itemId} · Part {item.partNo}</h3>
          <p className="muted">{item.sourceNote || 'Chưa có ghi chú nguồn'}</p>
        </div>
        <div className="admin-actions">
          <span className="status-badge" data-status={item.isDeleted ? 'LOCKED' : item.isPublished ? 'PUBLISHED' : 'DRAFT'}>{item.isDeleted ? 'Đã xóa' : item.isPublished ? 'Đã xuất bản' : 'Đang ẩn'}</span>
          {!item.isDeleted && (item.isPublished
            ? <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => apply(() => setListeningItemPublished(token, item.itemId, false), 'Đã ẩn bộ clip.')}>Ẩn</button>
            : <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => apply(() => setListeningItemPublished(token, item.itemId, true), 'Đã xuất bản bộ clip.')}>Xuất bản</button>)}
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Đóng</button>
        </div>
      </div>
      <ApiNotice notice={notice} />
      {!item.isDeleted && (
        <>
          <form className="admin-actions listening-meta" onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            apply(() => saveListeningItem(token, item.itemId, {
              partNo: Number(f.get('partNo')), categoryId: numberOrNull(f.get('categoryId')), levelNo: numberOrNull(f.get('levelNo')), sourceNote: f.get('sourceNote')?.trim() || null,
            }), 'Đã lưu thông tin bộ clip.')
          }}>
            <label>
              Part
              <select name="partNo" defaultValue={item.partNo} disabled={item.clipCount > 0} title={item.clipCount > 0 ? 'Chỉ đổi Part khi bộ clip chưa có clip' : undefined}>
                {[1, 2, 3, 4].map((p) => <option key={p} value={p}>Part {p}</option>)}
              </select>
              {item.clipCount > 0 && <input type="hidden" name="partNo" value={item.partNo} />}
            </label>
            <label>
              Loại bài *
              <select name="categoryId" defaultValue={item.categoryId ?? ''} key={`c${item.partNo}-${item.categoryId}`}>
                <option value="">— Chưa gán —</option>
                {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.nameVi}</option>)}
              </select>
            </label>
            <label>
              Level *
              <select name="levelNo" defaultValue={item.levelNo ?? ''} key={`l${item.levelNo}`}>
                <option value="">— Chưa gán —</option>
                {(catalog?.levels || []).map((l) => <option key={l.levelNo} value={l.levelNo}>{l.nameVi}</option>)}
              </select>
            </label>
            <label className="listening-note">
              Ghi chú nguồn
              <input name="sourceNote" defaultValue={item.sourceNote || ''} maxLength={200} key={`n${item.sourceNote}`} />
            </label>
            <button type="submit" className="btn btn-outline" disabled={busy}>Lưu thông tin</button>
          </form>
          {(item.categoryId == null || item.levelNo == null) && <p className="muted">Cần gán loại bài và Level trước khi xuất bản.</p>}
          {missingAudio > 0 && <p className="muted">{missingAudio} clip chưa có audio: người học sẽ thấy “Clip này chưa có âm thanh”.</p>}
        </>
      )}

      <input ref={fileRef} type="file" accept=".mp3,.wav" hidden aria-label="Chọn audio cho clip"
        onChange={async (e) => {
          const f = e.target.files[0]
          e.target.value = ''
          if (!f || !uploadFor) return
          if (!/\.(mp3|wav)$/i.test(f.name)) { setNotice({ kind: 'error', text: 'Vui lòng chọn audio MP3 hoặc WAV.' }); return }
          await apply(() => uploadListeningClipAudio(token, item.itemId, uploadFor, f), 'Đã tải audio cho clip.')
        }} />
      <div className="admin-card-header">
        <h3>Clip ({clips.length})</h3>
        {!item.isDeleted && <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => { setDialogError(''); setDialog({ clip: null }) }}>Thêm clip</button>}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>#</th><th>Vai trò</th><th>Script (EN)</th><th>Bản dịch (VI)</th><th>Audio</th><th>Thao tác</th></tr></thead>
          <tbody>
            {!clips.length ? (
              <tr><td colSpan={6}>{item.isDeleted ? 'Bộ clip đã xóa. Khôi phục để sửa.' : 'Chưa có clip. Bấm “Thêm clip”.'}</td></tr>
            ) : clips.map((c) => (
              <tr key={c.clipId}>
                <td>{c.seqNo}</td>
                <td>{roleLabel(item.partNo, c.clipRole)}{c.speaker && <div className="muted">{c.speaker}</div>}</td>
                <td>{short(c.transcriptEn)}</td>
                <td>{short(c.translationVi)}</td>
                <td>
                  <div className="admin-actions">
                    {c.mediaId ? (
                      <>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setDialog({ preview: { mediaId: c.mediaId, mediaType: 'AUDIO' } })}>Nghe</button>
                        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={async () => {
                          if (!window.confirm('Xóa audio của clip này?')) return
                          if (await run(() => deleteMedia(token, c.mediaId), 'Đã xóa audio.')) { setDetail(await getListeningItem(token, item.itemId)); onChanged() }
                        }}>Xóa audio</button>
                      </>
                    ) : <span className="muted">Chưa có</span>}
                    <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => { setUploadFor(c.clipId); setTimeout(() => fileRef.current?.click()) }}>{c.mediaId ? 'Thay audio' : 'Tải audio'}</button>
                  </div>
                </td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => { setDialogError(''); setDialog({ clip: c }) }}>Sửa</button>
                    <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={async () => {
                      if (!window.confirm(`Xóa clip ${c.seqNo}?`)) return
                      await apply(() => deleteListeningClip(token, item.itemId, c.clipId), 'Đã xóa clip.')
                    }}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog?.preview && <MediaPreviewDialog token={token} media={dialog.preview} onClose={() => setDialog(null)} />}
      {dialog && !dialog.preview && (
        <FormDialog
          title={dialog.clip ? `Sửa clip ${dialog.clip.seqNo}` : 'Thêm clip'}
          busy={busy}
          error={dialogError}
          initial={dialog.clip
            ? { seqNo: dialog.clip.seqNo, clipRole: dialog.clip.clipRole, speaker: dialog.clip.speaker || '', transcriptEn: dialog.clip.transcriptEn, translationVi: dialog.clip.translationVi || '' }
            : { seqNo: '', clipRole: roles.find(([v]) => v === 'SENTENCE' || !clips.some((c) => c.clipRole === v))?.[0] || roles[0]?.[0], speaker: '', transcriptEn: '', translationVi: '' }}
          fields={[
            { key: 'seqNo', label: 'Thứ tự (bỏ trống = cuối bộ)', type: 'number', min: 1, max: 32767 },
            { key: 'clipRole', label: 'Vai trò', type: 'select', options: roles },
            { key: 'speaker', label: 'Người nói', maxLength: 100 },
            { key: 'transcriptEn', label: 'Script tiếng Anh *', type: 'textarea', required: true, maxLength: 1000 },
            { key: 'translationVi', label: 'Bản dịch tiếng Việt', type: 'textarea', maxLength: 1000 },
          ]}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            if (!String(v.transcriptEn || '').trim()) { setDialogError('Cần nhập script tiếng Anh.'); return }
            setDialogError('')
            const out = await apply(() => saveListeningClip(token, item.itemId, dialog.clip?.clipId, {
              seqNo: numberOrNull(v.seqNo), clipRole: v.clipRole, speaker: v.speaker?.trim() || null, transcriptEn: v.transcriptEn.trim(), translationVi: v.translationVi?.trim() || null,
            }), dialog.clip ? 'Đã lưu clip.' : 'Đã thêm clip.')
            if (out) setDialog(null)
            else setDialogError('Không lưu được clip. Xem thông báo phía trên.')
          }}
        />
      )}
    </section>
  )
}

// UC-28 TH2: bộ clip nghe sưu tầm (không thuộc đề) cho Nghe chép. Bộ clip cắt từ đề (TH1) quản lý trong màn biên soạn đề và Media.
// Mở thẳng một bộ qua ?item={id} (liên kết từ màn Báo lỗi).
export function ListeningItemsView({ session }) {
  const token = session.accessToken
  const [params, setParams] = useSearchParams()
  const { busy, notice, setNotice, run } = useAction()
  const [catalog, setCatalog] = useState(null)
  const [query, setQuery] = useState({ page: 1, pageSize: PAGE_SIZE, partNo: '', isPublished: '', isDeleted: false, search: '' })
  const [searchText, setSearchText] = useState('')
  const [reload, setReload] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const list = usePagedList(getListeningItems, token, query, reload)
  const openId = Number(params.get('item')) || null
  const refresh = () => setReload((n) => n + 1)
  const open = (id) => setParams(id ? { item: String(id) } : {}, { replace: !id })

  useEffect(() => {
    let active = true
    getExamCatalog(token).then((c) => active && setCatalog(c)).catch((e) => active && setNotice(errorNotice(e)))
    return () => { active = false }
  }, [token, setNotice])

  const categoryName = (id) => catalog?.categories.find((c) => c.categoryId === id)?.nameVi
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">NGHE CHÉP</p>
          <h2>Bộ clip nghe sưu tầm</h2>
          <p className="muted">Clip không cắt từ đề thi. Gán loại bài và Level, thêm clip kèm audio rồi xuất bản để bộ clip hiện ở mục “Clip sưu tầm” và bộ lọc chủ đề của Nghe chép.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn-outline" onClick={refresh}>Tải lại</button>
          <button type="button" className="btn btn-primary" onClick={() => { setCreateError(''); setCreating(true) }}>Thêm bộ clip</button>
        </div>
      </div>
      <ApiNotice notice={notice || (list.error && errorNotice(list.error))} />
      {openId && <ItemDetail key={openId} token={token} itemId={openId} catalog={catalog} onChanged={refresh} onClose={() => open(null)} />}
      <section className="admin-card">
        <div className="admin-actions">
          <label>
            Part
            <select value={query.partNo} onChange={(e) => setQuery((q) => ({ ...q, partNo: e.target.value, page: 1 }))}>
              <option value="">Mọi Part</option>
              {[1, 2, 3, 4].map((p) => <option key={p} value={p}>Part {p}</option>)}
            </select>
          </label>
          <label>
            Hiển thị
            <select value={query.isDeleted ? 'deleted' : String(query.isPublished)} onChange={(e) => {
              const v = e.target.value
              setQuery((q) => ({ ...q, isDeleted: v === 'deleted', isPublished: v === 'deleted' ? '' : v, page: 1 }))
            }}>
              <option value="">Tất cả (chưa xóa)</option>
              <option value="true">Đã xuất bản</option>
              <option value="false">Đang ẩn</option>
              <option value="deleted">Thùng rác</option>
            </select>
          </label>
          <form className="admin-actions" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, search: searchText, page: 1 })) }}>
            <label>
              Tìm ghi chú nguồn
              <input type="search" value={searchText} maxLength={200} onChange={(e) => setSearchText(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-outline">Tìm</button>
          </form>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Bộ clip</th><th>Part</th><th>Loại bài · Level</th><th>Clip / audio</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {list.loading ? (
                <tr><td colSpan={6}>Đang tải bộ clip…</td></tr>
              ) : !list.items.length ? (
                <tr><td colSpan={6}>{list.error ? 'Chưa tải được dữ liệu.' : 'Không có bộ clip phù hợp.'}</td></tr>
              ) : list.items.map((i) => (
                <tr key={i.itemId} data-active={i.itemId === openId || undefined}>
                  <td><b>{i.sourceNote || `Bộ clip #${i.itemId}`}</b><div className="muted">#{i.itemId}</div></td>
                  <td>Part {i.partNo}</td>
                  <td>{i.categoryName || categoryName(i.categoryId) || <span className="muted">Chưa gán loại</span>}<div className="muted">{i.levelName || 'Chưa gán Level'}</div></td>
                  <td>{i.clipCount} clip · {i.audioCount} audio</td>
                  <td><span className="status-badge" data-status={i.isDeleted ? 'LOCKED' : i.isPublished ? 'PUBLISHED' : 'DRAFT'}>{i.isDeleted ? 'Đã xóa' : i.isPublished ? 'Đã xuất bản' : 'Đang ẩn'}</span></td>
                  <td>
                    <div className="admin-actions">
                      {!i.isDeleted && <button type="button" className="btn btn-sm btn-outline" onClick={() => open(i.itemId)}>Mở</button>}
                      {i.isDeleted ? (
                        <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={async () => { if (await run(() => restoreListeningItem(token, i.itemId), 'Đã khôi phục bộ clip (đang ẩn).')) refresh() }}>Khôi phục</button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={async () => {
                          if (!window.confirm(`Xóa bộ clip #${i.itemId}? Bộ clip bị ẩn khỏi người học; có thể khôi phục.`)) return
                          if (await run(() => deleteListeningItem(token, i.itemId), 'Đã xóa bộ clip.')) { if (openId === i.itemId) open(null); refresh() }
                        }}>Xóa</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={query.page} total={list.totalCount} pageSize={PAGE_SIZE} loading={list.loading} onChange={(page) => setQuery((q) => ({ ...q, page }))} />
      </section>
      {creating && (
        <FormDialog
          title="Thêm bộ clip sưu tầm"
          submitLabel="Tạo bộ clip"
          busy={busy}
          error={createError}
          initial={{ partNo: '3', sourceNote: '' }}
          fields={[
            { key: 'partNo', label: 'Part', type: 'select', options: [['1', 'Part 1 · Mô tả tranh'], ['2', 'Part 2 · Hỏi đáp'], ['3', 'Part 3 · Hội thoại'], ['4', 'Part 4 · Bài nói']] },
            { key: 'sourceNote', label: 'Ghi chú nguồn (hiện làm tên bộ clip)', maxLength: 200 },
          ]}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            const out = await run(() => saveListeningItem(token, null, { partNo: Number(v.partNo), sourceNote: v.sourceNote?.trim() || null }), 'Đã tạo bộ clip. Gán loại bài, Level và thêm clip rồi xuất bản.')
            if (!out) { setCreateError('Không tạo được bộ clip. Xem thông báo phía trên.'); return }
            setCreating(false)
            refresh()
            open(out.result.item.itemId)
          }}
        />
      )}
    </div>
  )
}
