import { useRef, useState } from 'react'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { getMediaSlots, uploadToSlot } from '../services/adminApi.js'
import { ExamPicker } from './ExamPicker.jsx'
import { useAction } from './useAction.js'

export function MediaSlotsView({ session }) {
  const token = session.accessToken,
    { busy, notice, setNotice, run } = useAction(),
    single = useRef(null),
    bulk = useRef(null)
  const [examId, setExamId] = useState(''),
    [slots, setSlots] = useState([]),
    [onlyMissing, setOnlyMissing] = useState(false),
    [target, setTarget] = useState(null),
    [progress, setProgress] = useState('')

  async function load(id = examId) {
    if (!id) return
    const out = await run(() => getMediaSlots(token, id))
    if (out) setSlots(out.result)
  }
  async function uploadOne(file) {
    if (!file || !target) return
    const out = await run(() => uploadToSlot(token, target, file), `Đã tải lên ${target.fileName}.`)
    if (out) load()
  }
  async function uploadMany(files) {
    let ok = 0,
      miss = 0,
      fail = 0
    for (const f of files) {
      const base = f.name.replace(/\.[^.]+$/, '').toLowerCase()
      const slot = slots.find((s) => s.fileName.toLowerCase() === base)
      if (!slot) {
        miss++
        continue
      }
      setProgress(`Đang tải ${ok + fail + 1}/${files.length}: ${f.name}`)
      const out = await run(() => uploadToSlot(token, slot, f))
      if (out) ok++
      else if (++fail >= 3) break
    }
    setProgress('')
    setNotice({
      kind: fail ? 'error' : 'success',
      text: `Tải nhiều tệp xong: ${ok} thành công, ${miss} không khớp tên, ${fail} lỗi.`,
    })
    load()
  }
  const rows = onlyMissing ? slots.filter((s) => !s.uploaded) : slots
  const done = slots.filter((s) => s.uploaded).length
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">MEDIA</p>
          <h2>Tải audio và hình theo vị trí</h2>
          <p className="muted">Tên tệp (không tính đuôi) phải trùng cột “Tên tệp”. Hỗ trợ MP3, WAV, PNG, JPEG, WebP.</p>
        </div>
      </div>
      <ApiNotice notice={notice} />
      <section className="admin-card">
        <div className="admin-actions">
          <ExamPicker
            token={token}
            value={examId}
            onChange={(id) => {
              setExamId(id)
              setSlots([])
              load(id)
            }}
          />
          <button type="button" className="btn btn-outline" disabled={busy || !examId} onClick={() => load()}>
            Tải lại vị trí
          </button>
          <label>
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Chỉ vị trí còn thiếu
          </label>
          <button type="button" className="btn btn-primary" disabled={busy || !slots.length} onClick={() => bulk.current?.click()}>
            Tải nhiều tệp (tự khớp tên)
          </button>
          {!!slots.length && (
            <span className="muted" role="status">
              {done}/{slots.length} vị trí đã có tệp
            </span>
          )}
        </div>
        {progress && <p role="status">{progress}</p>}
        <input ref={single} type="file" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; uploadOne(f) }} />
        <input ref={bulk} type="file" multiple hidden accept="audio/*,image/*" onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; uploadMany(f) }} />
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vị trí</th>
                <th>Part</th>
                <th>Nhóm</th>
                <th>Clip</th>
                <th>Tên tệp</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan={7}>{examId ? 'Không có vị trí nào.' : 'Chọn một đề để xem các vị trí cần tệp.'}</td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={`${s.slot}-${s.groupId}-${s.clipId ?? ''}`}>
                    <td>{s.slot}</td>
                    <td>{s.partNo}</td>
                    <td>{s.groupId}</td>
                    <td>{s.clipId ?? '—'}</td>
                    <td>
                      <code>{s.fileName}</code>
                    </td>
                    <td>
                      <span className="status-badge" data-status={s.uploaded ? 'ACTIVE' : 'NEW'}>
                        {s.uploaded ? 'Đã có' : 'Thiếu'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={busy}
                        onClick={() => {
                          setTarget(s)
                          if (single.current) {
                            single.current.accept = s.slot.includes('IMAGE') ? 'image/*' : 'audio/*'
                            setTimeout(() => single.current.click())
                          }
                        }}
                      >
                        {s.uploaded ? 'Tải lại' : 'Tải lên'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
