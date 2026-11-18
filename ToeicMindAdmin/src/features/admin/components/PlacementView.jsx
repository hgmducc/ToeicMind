import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { getAdminExams, getExamCatalog } from '../../exams/services/examService.js'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import {
  deletePlacementTest, generatePlacement, getPlacementCandidates, getPlacementTest, getPlacementTests, savePlacementTest,
} from '../services/adminApi.js'
import { insertByPart, moveWithinPart, partSummary, suggestedMinutes } from '../placementHelpers.js'
import { Pagination } from './Pagination.jsx'

const PARTS = [1, 2, 3, 4, 5, 6, 7]
const DEFAULT_QUOTAS = { 1: 3, 2: 6, 3: 6, 4: 6, 5: 10, 6: 4, 7: 8 }
const CANDIDATE_PAGE = 10
const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { hour12: false }) : '—')

function GroupLabel({ group }) {
  const range = group.firstQuestionNo === group.lastQuestionNo ? `Câu ${group.firstQuestionNo}` : `Câu ${group.firstQuestionNo}–${group.lastQuestionNo}`
  return (
    <>
      <strong>{group.examCode}</strong> · {range}
      <div className="muted placement-preview">{group.preview || '—'}</div>
    </>
  )
}

function Editor({ token, catalog, exams, initial, onCancel, onSaved }) {
  const lock = useRef(false)
  const [form, setForm] = useState(() => ({
    title: initial?.title || 'Kiểm tra đầu vào TOEIC',
    description: initial?.description || '',
    minutes: initial ? String(Math.round(initial.timeLimitSeconds / 60)) : '',
    isActive: initial ? initial.isActive : true,
  }))
  const [groups, setGroups] = useState(() => initial?.groups || [])
  const [quotas, setQuotas] = useState(DEFAULT_QUOTAS)
  const [filter, setFilter] = useState({ partNo: '5', levelNo: '', examId: '', categoryId: '', search: '', page: 1 })
  const [searchText, setSearchText] = useState('')
  const [candidates, setCandidates] = useState({ loading: true, items: [], totalCount: 0, error: null })
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const selectedIds = useMemo(() => new Set(groups.map((g) => g.groupId)), [groups])
  const unavailable = groups.filter((g) => g.isAvailable === false)
  const summary = partSummary(groups)
  const totalQuestions = summary.reduce((sum, p) => sum + p.questions, 0)
  const suggestion = groups.length ? suggestedMinutes(groups.filter((g) => g.isAvailable !== false)) : null
  const categories = (catalog?.categories || []).filter((c) => !filter.partNo || c.partNo === Number(filter.partNo))
  const levelName = (no) => catalog?.levels?.find((l) => l.levelNo === no)?.shortLabel || (no ? `Level ${no}` : '—')

  useEffect(() => {
    let active = true
    getPlacementCandidates(token, { ...filter, pageSize: CANDIDATE_PAGE }).then(
      (data) => { if (active) setCandidates({ loading: false, items: data.items, totalCount: data.totalCount, error: null }) },
      (error) => { if (active) setCandidates({ loading: false, items: [], totalCount: 0, error }) },
    )
    return () => { active = false }
  }, [token, filter])

  const setFilterValue = (key, value) => {
    setCandidates((c) => ({ ...c, loading: true }))
    setFilter((f) => ({ ...f, [key]: value, ...(key === 'partNo' ? { categoryId: '' } : {}), page: key === 'page' ? value : 1 }))
  }

  const move = (index, step) => setGroups((list) => moveWithinPart(list, index, step))

  async function generate(replace) {
    setBusy(true)
    setNotice(null)
    try {
      const parts = PARTS.map((partNo) => ({ partNo, questionCount: Math.max(0, Math.min(60, Number(quotas[partNo]) || 0)) }))
      const result = await generatePlacement(token, { parts, excludeGroupIds: replace ? [] : groups.map((g) => g.groupId) })
      const next = replace ? result.groups : result.groups.reduce(insertByPart, groups)
      setGroups(next)
      if (replace || !form.minutes) setForm((f) => ({ ...f, minutes: String(suggestedMinutes(next)) }))
      setNotice({ kind: 'success', text: `${replace ? 'Đã tạo' : 'Đã thêm'} ${result.groups.length} nhóm (${result.totalQuestions} câu), trải đều các Level. Xem lại rồi bấm “Lưu bài kiểm tra”.` })
    } catch (error) {
      setNotice(errorNotice(error))
    } finally {
      setBusy(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    if (lock.current) return
    const minutes = Number(form.minutes)
    const problems = []
    if (!form.title.trim()) problems.push('Cần nhập tên bài kiểm tra.')
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) problems.push('Thời gian làm bài là số phút nguyên từ 1 đến 240.')
    if (!groups.length) problems.push('Cần chọn ít nhất một nhóm câu hỏi.')
    if (unavailable.length) problems.push(`Có ${unavailable.length} nhóm không còn dùng được (đề/nhóm đã xóa). Bấm “Bỏ nhóm không còn dùng được”.`)
    if (problems.length) { setNotice({ kind: 'error', text: 'Chưa lưu được bài kiểm tra.', details: problems }); return }
    lock.current = true
    setBusy(true)
    setNotice(null)
    try {
      const saved = await savePlacementTest(token, initial?.placementTestId, {
        title: form.title.trim(), description: form.description.trim() || null, timeLimitSeconds: minutes * 60,
        isActive: form.isActive, groupIds: groups.map((g) => g.groupId),
      })
      onSaved(saved)
    } catch (error) {
      setNotice(errorNotice(error))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <ApiNotice notice={notice} />
      <section className="admin-card">
        <div className="admin-card-header"><h3>{initial ? `Sửa: ${initial.title}` : 'Tạo bài kiểm tra đầu vào'}</h3></div>
        <div className="admin-form-grid">
          <label>Tên bài kiểm tra *<input value={form.title} maxLength={150} required onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></label>
          <label>
            Thời gian làm bài (phút) *
            <input type="number" min={1} max={240} value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} />
            {suggestion && <button type="button" className="btn btn-sm btn-outline placement-inline" onClick={() => setForm((f) => ({ ...f, minutes: String(suggestion) }))}>Dùng thời gian đề xuất: {suggestion} phút</button>}
          </label>
        </div>
        <label>Mô tả cho người học<textarea maxLength={1000} value={form.description} placeholder="Ví dụ: 40 câu Nghe và Đọc, khoảng 30 phút, giúp xác định Level để gợi ý bài học." onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
        <label className="placement-check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Dùng bài này cho người học (bài đang dùng khác sẽ tự tắt)</label>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h3>Nhóm câu đã chọn · {totalQuestions} câu</h3>
          <div className="placement-chips">{summary.map((p) => <span key={p.partNo} className="status-badge" data-status="LEARNER">Part {p.partNo}: {p.questions} câu</span>)}</div>
        </div>
        <fieldset className="editor-fieldset" disabled={busy}>
          <p className="muted">Gợi ý tự động: nhập số câu mong muốn mỗi Part. Máy chủ lấy trọn nhóm (Part 3, 4: 3 câu/nhóm; Part 6: 4 câu; Part 7: 2–5 câu), luân phiên các Level và đa dạng chủ điểm, xếp từ dễ đến khó.</p>
          <div className="placement-quotas">
            {PARTS.map((partNo) => (
              <label key={partNo}>Part {partNo}<input type="number" min={0} max={60} value={quotas[partNo]} onChange={(e) => setQuotas((q) => ({ ...q, [partNo]: e.target.value }))} /></label>
            ))}
          </div>
          <div className="admin-actions">
            <button type="button" className="btn btn-secondary" onClick={() => generate(true)}>Gợi ý tự động (thay danh sách)</button>
            <button type="button" className="btn btn-outline" onClick={() => generate(false)} disabled={!groups.length}>Gợi ý thêm vào danh sách</button>
            {unavailable.length > 0 && <button type="button" className="btn btn-danger" onClick={() => setGroups((list) => list.filter((g) => g.isAvailable !== false))}>Bỏ {unavailable.length} nhóm không còn dùng được</button>}
            {groups.length > 0 && <button type="button" className="btn btn-outline" onClick={() => window.confirm('Bỏ toàn bộ nhóm đã chọn?') && setGroups([])}>Xóa danh sách</button>}
          </div>
        </fieldset>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Part</th><th>Đề · câu · nội dung</th><th>Level</th><th>Phân loại</th><th>Số câu</th><th>Thao tác</th></tr></thead>
            <tbody>
              {!groups.length ? <tr><td colSpan={7}>Chưa chọn nhóm nào. Dùng “Gợi ý tự động” hoặc thêm từ danh sách bên dưới.</td></tr> : groups.map((g, i) => (
                <tr key={g.groupId} data-unavailable={g.isAvailable === false}>
                  <td>{i + 1}</td>
                  <td className="placement-nowrap">Part {g.partNo}</td>
                  <td><GroupLabel group={g} />{g.isAvailable === false && <div className="placement-warning">Nhóm/đề đã bị xóa — người học sẽ không gặp nhóm này.</div>}</td>
                  <td>{levelName(g.levelNo)}</td>
                  <td>{g.categoryName || '—'}</td>
                  <td>{g.questionCount}</td>
                  <td>
                    <div className="admin-actions placement-row-actions">
                      <button type="button" className="btn btn-sm btn-outline" aria-label={`Đưa nhóm ${i + 1} lên`} disabled={busy || i === 0 || groups[i - 1].partNo !== g.partNo} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="btn btn-sm btn-outline" aria-label={`Đưa nhóm ${i + 1} xuống`} disabled={busy || i === groups.length - 1 || groups[i + 1].partNo !== g.partNo} onClick={() => move(i, 1)}>↓</button>
                      <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => setGroups((list) => list.filter((x) => x.groupId !== g.groupId))}>Bỏ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-header"><h3>Thêm nhóm câu từ đề đã xuất bản</h3></div>
        <div className="admin-actions">
          <label>Part<select value={filter.partNo} onChange={(e) => setFilterValue('partNo', e.target.value)}><option value="">Tất cả</option>{PARTS.map((p) => <option key={p} value={p}>Part {p}</option>)}</select></label>
          <label>Level<select value={filter.levelNo} onChange={(e) => setFilterValue('levelNo', e.target.value)}><option value="">Tất cả</option>{(catalog?.levels || []).map((l) => <option key={l.levelNo} value={l.levelNo}>{l.nameVi}</option>)}</select></label>
          <label>Đề<select value={filter.examId} onChange={(e) => setFilterValue('examId', e.target.value)}><option value="">Tất cả</option>{exams.map((x) => <option key={x.examId} value={x.examId}>{x.examCode} · {x.title}</option>)}</select></label>
          <label>Phân loại<select value={filter.categoryId} onChange={(e) => setFilterValue('categoryId', e.target.value)}><option value="">Tất cả</option>{categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.parentCategoryId ? '— ' : ''}{c.nameVi}</option>)}</select></label>
          <label className="search-field">Tìm theo mã đề, tên đề, nội dung câu
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFilterValue('search', searchText) } }} />
          </label>
          <button type="button" className="btn btn-outline" onClick={() => setFilterValue('search', searchText)}>Tìm</button>
        </div>
        {candidates.error && <ApiNotice notice={errorNotice(candidates.error)} />}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Part</th><th>Đề · câu · nội dung</th><th>Level</th><th>Phân loại</th><th>Số câu</th><th>Thao tác</th></tr></thead>
            <tbody>
              {candidates.loading ? <tr><td colSpan={6}>Đang tải nhóm câu…</td></tr>
                : !candidates.items.length ? <tr><td colSpan={6}>Không có nhóm câu phù hợp.</td></tr>
                  : candidates.items.map((g) => (
                    <tr key={g.groupId}>
                      <td className="placement-nowrap">Part {g.partNo}</td>
                      <td><GroupLabel group={g} /></td>
                      <td>{levelName(g.levelNo)}</td>
                      <td>{g.categoryName || '—'}</td>
                      <td>{g.questionCount}</td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline" disabled={busy || selectedIds.has(g.groupId)} onClick={() => setGroups((list) => insertByPart(list, g))}>
                          {selectedIds.has(g.groupId) ? 'Đã chọn' : 'Thêm'}
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={filter.page} total={candidates.totalCount} pageSize={CANDIDATE_PAGE} loading={candidates.loading} onChange={(page) => setFilterValue('page', page)} />
      </section>

      <div className="admin-actions placement-footer">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bài kiểm tra'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Hủy</button>
        <span className="muted">{groups.length} nhóm · {totalQuestions} câu{form.minutes ? ` · ${form.minutes} phút` : ''}</span>
      </div>
    </form>
  )
}

// Thiết lập bài kiểm tra đầu vào: danh sách bài, ghép bài từ nhóm câu của đề đã xuất bản, bật một bài cho người học.
export function PlacementView({ session }) {
  const token = session.accessToken
  const [tests, setTests] = useState({ loading: true, items: [], error: null })
  const [catalog, setCatalog] = useState(null)
  const [exams, setExams] = useState([])
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey((n) => n + 1), [])

  useEffect(() => {
    let active = true
    getPlacementTests(token).then(
      (items) => { if (active) setTests({ loading: false, items, error: null }) },
      (error) => { if (active) setTests({ loading: false, items: [], error }) },
    )
    return () => { active = false }
  }, [token, reloadKey])
  useEffect(() => {
    getExamCatalog(token).then(setCatalog, () => setCatalog({ levels: [], categories: [] }))
    getAdminExams(token, { status: 'PUBLISHED', pageSize: 100 }).then((data) => setExams(data.items || []), () => setExams([]))
  }, [token])

  async function edit(test) {
    setBusyId(test.placementTestId)
    setNotice(null)
    try { setEditing(await getPlacementTest(token, test.placementTestId)) } catch (error) { setNotice(errorNotice(error)) } finally { setBusyId(null) }
  }

  async function toggle(test) {
    setBusyId(test.placementTestId)
    setNotice(null)
    try {
      const detail = await getPlacementTest(token, test.placementTestId)
      await savePlacementTest(token, test.placementTestId, {
        title: detail.title, description: detail.description, timeLimitSeconds: detail.timeLimitSeconds, isActive: !detail.isActive,
        groupIds: detail.groups.filter((g) => g.isAvailable !== false).map((g) => g.groupId),
      })
      setNotice({ kind: 'success', text: detail.isActive ? `Đã tắt “${detail.title}”. Người học tạm thời không có bài kiểm tra đầu vào.` : `Người học sẽ làm “${detail.title}”.` })
      load()
    } catch (error) { setNotice(errorNotice(error)) } finally { setBusyId(null) }
  }

  async function remove(test) {
    if (!window.confirm(`Xóa “${test.title}”? Kết quả người học đã làm vẫn được giữ.`)) return
    setBusyId(test.placementTestId)
    try { await deletePlacementTest(token, test.placementTestId); setNotice({ kind: 'success', text: 'Đã xóa bài kiểm tra.' }); load() }
    catch (error) { setNotice(errorNotice(error)) } finally { setBusyId(null) }
  }

  if (editing) {
    return (
      <div>
        <div className="admin-section-heading">
          <div><p className="eyebrow">KIỂM TRA ĐẦU VÀO</p><h2>{editing.placementTestId ? 'Sửa bài kiểm tra' : 'Tạo bài kiểm tra'}</h2></div>
        </div>
        <Editor token={token} catalog={catalog} exams={exams} initial={editing.placementTestId ? editing : null}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => { setEditing(null); setNotice({ kind: 'success', text: `Đã lưu “${saved.title}” (${saved.totalQuestions} câu${saved.isActive ? ', đang dùng cho người học' : ''}).` }); load() }} />
      </div>
    )
  }

  const active = tests.items.find((t) => t.isActive)
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">KIỂM TRA ĐẦU VÀO</p>
          <h2>Bài kiểm tra đầu vào</h2>
          <p className="muted">Ghép bài ngắn từ các nhóm câu của đề đã xuất bản. Người học làm như Luyện thi (có giờ); kết quả ước tính điểm và Level Nghe/Đọc để lộ trình cá nhân gợi ý bài học. Chỉ một bài được dùng tại một thời điểm.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn-outline" onClick={load}>Tải lại</button>
          <button type="button" className="btn btn-primary" onClick={() => { setNotice(null); setEditing({}) }}>Tạo bài kiểm tra</button>
        </div>
      </div>
      <ApiNotice notice={notice || (tests.error && errorNotice(tests.error))} />
      {!tests.loading && !tests.error && !active && (
        <div className="admin-notice" data-kind="error" role="status">Chưa có bài kiểm tra nào đang dùng: người học chưa làm được kiểm tra đầu vào (lộ trình vẫn gợi ý theo kết quả luyện tập).</div>
      )}
      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Bài kiểm tra</th><th>Cấu trúc</th><th>Thời gian</th><th>Trạng thái</th><th>Lượt làm</th><th>Cập nhật</th><th>Thao tác</th></tr></thead>
            <tbody>
              {tests.loading ? <tr><td colSpan={7}>Đang tải…</td></tr>
                : !tests.items.length ? <tr><td colSpan={7}>Chưa có bài kiểm tra. Bấm “Tạo bài kiểm tra”.</td></tr>
                  : tests.items.map((t) => (
                    <tr key={t.placementTestId}>
                      <td><strong>{t.title}</strong>{t.description && <div className="muted placement-preview">{t.description}</div>}</td>
                      <td>{t.totalQuestions} câu · {t.groupCount} nhóm<div className="muted">{t.parts.map((p) => `P${p.partNo}: ${p.questionCount}`).join(' · ')}</div></td>
                      <td>{Math.round(t.timeLimitSeconds / 60)} phút</td>
                      <td><span className="status-badge" data-status={t.isActive ? 'ACTIVE' : 'LEARNER'}>{t.isActive ? 'Đang dùng' : 'Không dùng'}</span></td>
                      <td>{t.attemptCount}</td>
                      <td>{fmt(t.updatedAt)}</td>
                      <td>
                        <div className="admin-actions">
                          <button type="button" className="btn btn-sm btn-outline" disabled={busyId != null} onClick={() => edit(t)}>Sửa</button>
                          <button type="button" className={`btn btn-sm ${t.isActive ? 'btn-outline' : 'btn-secondary'}`} disabled={busyId != null} onClick={() => toggle(t)}>{t.isActive ? 'Tắt' : 'Dùng bài này'}</button>
                          <button type="button" className="btn btn-sm btn-danger" disabled={busyId != null} onClick={() => remove(t)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
