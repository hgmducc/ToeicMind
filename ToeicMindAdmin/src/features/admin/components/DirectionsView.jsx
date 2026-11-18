import { useEffect, useRef, useState } from 'react'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import {
  deleteMedia,
  getAdminDirections,
  saveDirection,
  seedDefaultDirections,
  uploadDirectionMedia,
} from '../../exams/services/examService.js'
import { FormDialog } from './FormDialog.jsx'
import { MediaPreviewDialog } from './MediaPreviewDialog.jsx'
import { useAction } from './useAction.js'

const short = (s, n = 110) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '—')
const numberOrNull = (v) => (v === '' || v == null ? null : Number(v))

export function DirectionsView({ session }) {
  const token = session.accessToken,
    { busy, notice, setNotice, run } = useAction(),
    fileRef = useRef(null)
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0),
    [dialog, setDialog] = useState(null),
    [dialogError, setDialogError] = useState(''),
    [uploadFor, setUploadFor] = useState(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    getAdminDirections(token, { effective: false })
      .then((r) => active && setItems(r))
      .catch((e) => active && setNotice({ kind: 'error', text: e.message }))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [token, reload, setNotice])
  const refresh = () => setReload((n) => n + 1)

  const fields = (lock) => [
    {
      key: 'directionKind',
      label: 'Loại',
      type: 'select',
      disabled: lock,
      options: [
        ['SECTION', 'SECTION (cả phần Nghe/Đọc)'],
        ['PART', 'PART (từng Part)'],
      ],
    },
    {
      key: 'skill',
      label: 'Kỹ năng (chỉ SECTION)',
      type: 'select',
      disabled: lock,
      options: [
        ['', '—'],
        ['LISTENING', 'LISTENING'],
        ['READING', 'READING'],
      ],
    },
    { key: 'partNo', label: 'Part 1–7 (chỉ PART)', type: 'number', min: 1, max: 7, disabled: lock },
    { key: 'directionsEn', label: 'Hướng dẫn (EN) *', type: 'textarea', required: true },
    { key: 'directionsVi', label: 'Hướng dẫn (VI)', type: 'textarea' },
    { key: 'exampleEn', label: 'Ví dụ (EN)', type: 'textarea' },
    { key: 'exampleVi', label: 'Ví dụ (VI)', type: 'textarea' },
  ]
  const body = (v, base) => ({
    examId: null,
    directionKind: base ? base.directionKind : v.directionKind,
    skill: (base ? base.directionKind : v.directionKind) === 'SECTION' ? (base ? base.skill : v.skill) || null : null,
    partNo: (base ? base.directionKind : v.directionKind) === 'PART' ? (base ? base.partNo : numberOrNull(v.partNo)) : null,
    directionsEn: v.directionsEn,
    directionsVi: v.directionsVi || null,
    exampleEn: v.exampleEn || null,
    exampleVi: v.exampleVi || null,
  })
  async function submit(values) {
    setDialogError('')
    const editing = dialog.item
    const out = await run(() => saveDirection(token, editing?.directionId, body(values, editing)), editing ? 'Đã lưu hướng dẫn.' : 'Đã tạo hướng dẫn.')
    if (out) {
      setDialog(null)
      refresh()
    } else setDialogError('Không lưu được. Xem thông báo phía trên danh sách.')
  }
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">HƯỚNG DẪN</p>
          <h2>Hướng dẫn trước phần thi và Part</h2>
          <p className="muted">Bộ 9 hướng dẫn dùng chung cho mọi đề thi. Part 1 hỗ trợ cả ảnh minh họa và audio.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={async () => {
              const out = await run(() => seedDefaultDirections(token))
              if (out) {
                setNotice({ kind: 'success', text: `Đã nạp ${out.result.inserted} mục mới (tổng ${out.result.total} hướng dẫn mặc định).` })
                refresh()
              }
            }}
          >
            Nạp 9 hướng dẫn mặc định
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setDialog({ item: null })}>
            Thêm hướng dẫn
          </button>
        </div>
      </div>
      <ApiNotice notice={notice} />
      <section className="admin-card">
        <input
          ref={fileRef}
          type="file"
          accept={uploadFor?.type === 'IMAGE' ? '.png,.jpg,.jpeg,.webp' : '.mp3,.wav'}
          aria-label={uploadFor?.type === 'IMAGE' ? 'Chọn ảnh hướng dẫn Part 1' : 'Chọn audio hướng dẫn'}
          hidden
          onChange={async (e) => {
            const f = e.target.files[0]
            e.target.value = ''
            if (!f || !uploadFor) return
            const image = uploadFor.type === 'IMAGE'
            if (!(image ? /\.(png|jpe?g|webp)$/i : /\.(mp3|wav)$/i).test(f.name)) {
              setNotice({ kind: 'error', text: image ? 'Vui lòng chọn ảnh PNG, JPEG hoặc WebP.' : 'Vui lòng chọn audio MP3 hoặc WAV.' })
              return
            }
            const out = await run(() => uploadDirectionMedia(token, uploadFor.id, f), image ? 'Đã tải ảnh hướng dẫn Part 1.' : 'Đã tải audio cho hướng dẫn.')
            if (out) refresh()
          }}
        />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Phạm vi</th>
                <th>Mục</th>
                <th>Nội dung (EN)</th>
                <th>Media</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Đang tải hướng dẫn…</td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={5}>Chưa có hướng dẫn. Bấm “Nạp 9 hướng dẫn mặc định”.</td>
                </tr>
              ) : (
                items.map((d) => (
                  <tr key={d.directionId}>
                    <td><span className="status-badge" data-status="LEARNER">Mọi đề thi</span></td>
                    <td>
                      {d.directionKind}
                      <div className="muted">
                        {d.skill || ''}
                        {d.partNo ? ` Part ${d.partNo}` : ''}
                      </div>
                    </td>
                    <td>{short(d.directionsEn)}</td>
                    <td>
                      <div className="admin-actions">
                        {(d.media || []).map((m) => (
                          <span key={m.mediaId} className="admin-actions">
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setDialog({ preview: m })}>
                              {m.mediaType === 'AUDIO' ? 'Nghe' : 'Xem'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busy}
                              onClick={async () => {
                                if (!window.confirm('Xóa tệp media này?')) return
                                if (await run(() => deleteMedia(token, m.mediaId), 'Đã xóa media.')) refresh()
                              }}
                            >
                              Xóa {m.mediaType === 'AUDIO' ? 'audio' : 'hình'}
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={busy}
                          onClick={() => {
                            setUploadFor({ id: d.directionId, type: 'AUDIO' })
                            setTimeout(() => fileRef.current?.click())
                          }}
                        >
                          Tải audio
                        </button>
                        {d.directionKind === 'PART' && d.partNo === 1 && (
                          <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => {
                            setUploadFor({ id: d.directionId, type: 'IMAGE' })
                            setTimeout(() => fileRef.current?.click())
                          }}>Tải ảnh Part 1</button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => setDialog({ item: d })}>
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {dialog && !dialog.preview && (
        <FormDialog
          title={dialog.item ? `Sửa hướng dẫn #${dialog.item.directionId}` : 'Thêm hướng dẫn'}
          busy={busy}
          error={dialogError}
          initial={dialog.item || { directionKind: 'PART' }}
          fields={fields(!!dialog.item)}
          wide
          onClose={() => setDialog(null)}
          onSubmit={submit}
        >
          <p className="muted">Áp dụng cho mọi đề thi. Loại, kỹ năng và Part không đổi được sau khi tạo. Tải audio và ảnh sau khi lưu hướng dẫn.</p>
        </FormDialog>
      )}
      {dialog?.preview && <MediaPreviewDialog token={token} media={dialog.preview} onClose={() => setDialog(null)} />}
    </div>
  )
}
