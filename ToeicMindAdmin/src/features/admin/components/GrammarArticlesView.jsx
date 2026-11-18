import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { PassageEditor } from '../../exams/components/PassageEditor.jsx'
import { usePagedList } from '../../exams/hooks/usePagedList.js'
import { articleTemplate, exerciseHtml, lessonIssues, OPTION_LABELS } from '../../exams/utils/grammarArticle.js'
import { errorNotice } from '../../exams/utils/apiErrors.js'
import {
  deleteGrammarArticle,
  getGrammarArticle,
  getGrammarArticles,
  getGrammarTopics,
  restoreGrammarArticle,
  saveGrammarArticle,
} from '../services/adminApi.js'
import { FormDialog } from './FormDialog.jsx'
import { Pagination } from './Pagination.jsx'
import { useAction } from './useAction.js'

const PAGE_SIZE = 10
const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN', { hour12: false }) : '—')
const plain = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

// Soạn một câu "Thử ngay" (kiểu Part 5): câu hỏi, 2–4 lựa chọn, đáp án đúng, giải thích. Văn bản thuần, được escape khi tạo HTML.
function ExerciseDialog({ onInsert, onClose }) {
  const [error, setError] = useState('')
  return (
    <FormDialog
      title="Thêm bài tập “Thử ngay”"
      submitLabel="Chèn vào bài"
      error={error}
      initial={{ correct: '0' }}
      fields={[
        { key: 'question', label: 'Câu hỏi * (dùng ______ cho chỗ trống)', type: 'textarea', required: true, maxLength: 1000 },
        ...OPTION_LABELS.map((letter, i) => ({ key: `option${i}`, label: `Lựa chọn (${letter})${i < 2 ? ' *' : ''}`, maxLength: 300 })),
        { key: 'correct', label: 'Đáp án đúng', type: 'select', options: OPTION_LABELS.map((letter, i) => [String(i), `(${letter})`]) },
        { key: 'explanation', label: 'Giải thích * (hiện sau khi người học chọn)', type: 'textarea', required: true, maxLength: 2000 },
      ]}
      onClose={onClose}
      onSubmit={(v) => {
        const options = OPTION_LABELS.map((_, i) => String(v[`option${i}`] || '').trim())
        const count = options.findLastIndex((o) => o) + 1
        const correct = Number(v.correct)
        if (!String(v.question || '').trim() || !String(v.explanation || '').trim()) { setError('Cần nhập câu hỏi và giải thích.'); return }
        if (count < 2 || options.slice(0, count).some((o) => !o)) { setError('Cần ít nhất 2 lựa chọn, điền liền nhau từ (A).'); return }
        if (correct >= count) { setError('Đáp án đúng phải là một lựa chọn đã điền.'); return }
        onInsert(exerciseHtml({ question: v.question, options: options.slice(0, count), correct, explanation: v.explanation }))
      }}
    />
  )
}

// Soạn bài học tương tác duy nhất của một chủ điểm: mỗi phần lý thuyết kèm ví dụ và bài tập "Thử ngay", cuối bài là mẹo TOEIC.
// Bài mới điền sẵn khung mẫu; phần thiếu ví dụ/bài tập hay bài tập sai cấu trúc thì cảnh báo (không chặn lưu).
function ArticleEditor({ token, topic, articleId, onClose, onSaved }) {
  const [exerciseInsert, setExerciseInsert] = useState(null)
  const ref = useRef(null)
  const [form, setForm] = useState(articleId ? null : { title: topic.name, content: articleTemplate(topic.name) })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    return () => d.open && d.close()
  }, [])
  useEffect(() => {
    if (!articleId) return undefined
    let active = true
    getGrammarArticle(token, articleId)
      .then((a) => active && setForm({ title: a.title, content: a.content || '', isDeleted: a.isDeleted, topicId: a.grammarTopicId }))
      .catch((e) => active && setError(e.message))
    return () => { active = false }
  }, [token, articleId])
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const issues = form ? lessonIssues(form.content) : []

  async function submit(event) {
    event.preventDefault()
    if (busy || !form) return
    // E1: thiếu tiêu đề hoặc nội dung (kể cả nội dung chỉ có thẻ rỗng).
    if (!form.title.trim() || !plain(form.content)) { setError('Cần nhập tiêu đề và nội dung bài.'); return }
    setBusy(true)
    setError('')
    try {
      const saved = await saveGrammarArticle(token, articleId, { grammarTopicId: form.topicId ?? topic.grammarTopicId, title: form.title.trim(), content: form.content })
      onSaved(saved, !articleId)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <dialog ref={ref} className="publish-dialog" style={{ width: 'min(1000px, calc(100% - 24px))' }} aria-labelledby="grammar-editor-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onClose() }}>
      <div className="modal-header">
        <h2 id="grammar-editor-title">{articleId ? 'Sửa bài học' : 'Soạn bài học'} · {topic.name}</h2>
        <button type="button" className="modal-close-btn" disabled={busy} onClick={onClose} aria-label="Đóng">×</button>
      </div>
      {!form ? (
        error ? <div className="admin-notice" data-kind="error" role="alert">{error}</div> : <p role="status">Đang tải bài…</p>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <div className="admin-notice" data-kind="error" role="alert">{error}</div>}
          {form.isDeleted && <div className="admin-notice" data-kind="info">Bài đang ở thùng rác: lưu vẫn được, nhưng người học chỉ thấy sau khi khôi phục.</div>}
          <p className="muted">Mỗi chủ điểm chỉ có một bài học. Chia bài thành nhiều phần bằng “Phần (H2)”; mỗi phần nên có lý thuyết, ví dụ và một câu “+ Bài tập” để người học bấm chọn đáp án và xem giải thích ngay. Cuối bài thêm mẹo TOEIC và bài tập tổng hợp.</p>
          <label className="dialog-field">
            Tiêu đề bài *
            <input value={form.title} maxLength={200} required onChange={(e) => set('title', e.target.value)} />
          </label>
          <div className="dialog-field">
            Nội dung bài * <span className="muted">(HTML được lọc khi lưu)</span>
            <PassageEditor variant="article" label="Nội dung bài ngữ pháp" value={form.content} onChange={(html) => set('content', html)}
              onRequestExercise={(insert) => setExerciseInsert(() => insert)} />
          </div>
          {issues.length > 0 && (
            <div className="admin-notice" data-kind="info" role="status">
              <b>Gợi ý hoàn thiện bài:</b>
              <ul className="grammar-issues">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            </div>
          )}
          <div className="admin-actions modal-actions">
            <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bài'}</button>
          </div>
        </form>
      )}
      {exerciseInsert && (
        <ExerciseDialog
          onClose={() => setExerciseInsert(null)}
          onInsert={(html) => {
            // Đóng hộp thoại bài tập trước: khi dialog modal còn mở, khung soạn bên dưới bị inert nên không nhận focus để chèn.
            const insert = exerciseInsert
            setExerciseInsert(null)
            setTimeout(() => insert(html), 0)
          }}
        />
      )}
    </dialog>
  )
}

// Thùng rác: bài đã xóa mềm. Khôi phục bị từ chối nếu chủ điểm đã có bài khác (mỗi chủ điểm một bài).
function Trash({ token, reload, busy, run, onChanged }) {
  const [query, setQuery] = useState({ page: 1, pageSize: PAGE_SIZE, isDeleted: true })
  const list = usePagedList(getGrammarArticles, token, query, reload)
  return (
    <section className="admin-card">
      <div className="admin-card-header"><h3>Thùng rác</h3></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Tiêu đề</th><th>Chủ điểm</th><th>Xóa lúc</th><th>Thao tác</th></tr></thead>
          <tbody>
            {list.loading ? <tr><td colSpan={4}>Đang tải…</td></tr>
              : !list.items.length ? <tr><td colSpan={4}>{list.error ? 'Chưa tải được dữ liệu.' : 'Thùng rác trống.'}</td></tr>
                : list.items.map((a) => (
                  <tr key={a.articleId}>
                    <td><b>{a.title}</b><div className="muted">#{a.articleId}</div></td>
                    <td>{a.topicName}</td>
                    <td>{fmt(a.deletedAt)}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline" disabled={busy}
                        onClick={async () => { if (await run(() => restoreGrammarArticle(token, a.articleId), 'Đã khôi phục bài.')) onChanged() }}>Khôi phục</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <Pagination page={query.page} total={list.totalCount} pageSize={PAGE_SIZE} loading={list.loading} onChange={(page) => setQuery((q) => ({ ...q, page }))} />
    </section>
  )
}

// UC-25: mỗi chủ điểm Part 5 đúng một bài học. Danh sách 15 chủ điểm kèm trạng thái bài; soạn/sửa/xóa mềm; khôi phục từ thùng rác.
// Mở thẳng bài qua ?article={id} (liên kết từ màn Báo lỗi, UC-26).
export function GrammarArticlesView({ session }) {
  const token = session.accessToken
  const [params, setParams] = useSearchParams()
  const { busy, notice, setNotice, run } = useAction()
  const [topics, setTopics] = useState(null)
  const [topicsError, setTopicsError] = useState(null)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState(null)
  const [showTrash, setShowTrash] = useState(false)
  const refresh = () => setReload((n) => n + 1)
  const linkedArticle = Number(params.get('article')) || null

  useEffect(() => {
    let active = true
    getGrammarTopics(token)
      .then((t) => active && setTopics(t))
      .catch((e) => active && setTopicsError(e))
    return () => { active = false }
  }, [token, reload])

  // Liên kết ?article=: mở bài đó (kể cả bài trong thùng rác, khi đó tìm chủ điểm theo chính bài).
  useEffect(() => {
    if (!linkedArticle || !topics) return undefined
    let active = true
    getGrammarArticle(token, linkedArticle)
      .then((a) => { if (active) setEditing({ topic: topics.find((t) => t.grammarTopicId === a.grammarTopicId), articleId: a.articleId }) })
      .catch((e) => active && setNotice(errorNotice(e)))
    return () => { active = false }
  }, [token, linkedArticle, topics, setNotice])

  function closeEditor() {
    setEditing(null)
    if (params.has('article')) setParams({}, { replace: true })
  }

  const written = topics?.filter((t) => t.articleId).length ?? 0
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">NGỮ PHÁP</p>
          <h2>Bài học theo chủ điểm</h2>
          <p className="muted">Mỗi chủ điểm Part 5 có đúng một bài học tương tác: lý thuyết đến đâu có ví dụ và câu “Thử ngay” đến đó, cuối bài là mẹo TOEIC. Bài lưu xong hiện ngay cho người học; chủ điểm chưa có bài hiện “Đang cập nhật”.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn-outline" onClick={refresh}>Tải lại</button>
          <button type="button" className="btn btn-outline" aria-pressed={showTrash} onClick={() => setShowTrash((v) => !v)}>{showTrash ? 'Ẩn thùng rác' : 'Thùng rác'}</button>
        </div>
      </div>
      <ApiNotice notice={notice || (topicsError && errorNotice(topicsError))} />
      <section className="admin-card">
        <div className="admin-card-header"><h3>Chủ điểm {topics ? `(${written}/${topics.length} đã có bài)` : ''}</h3></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Chủ điểm</th><th>Bài học</th><th>Cập nhật</th><th>Thao tác</th></tr></thead>
            <tbody>
              {!topics ? <tr><td colSpan={4}>{topicsError ? 'Chưa tải được dữ liệu.' : 'Đang tải chủ điểm…'}</td></tr>
                : topics.map((t) => (
                  <tr key={t.grammarTopicId}>
                    <td><b>{t.name}</b>{t.groupName && <div className="muted">{t.groupName}</div>}</td>
                    <td>{t.articleId ? t.articleTitle : <span className="status-badge" data-status="NEW">Chưa có bài</span>}</td>
                    <td>{fmt(t.articleUpdatedAt)}</td>
                    <td>
                      <div className="admin-actions">
                        {t.articleId ? (
                          <>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditing({ topic: t, articleId: t.articleId })}>Sửa bài</button>
                            <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={async () => {
                              if (!window.confirm(`Xóa bài “${t.articleTitle}”? Chủ điểm sẽ hiện “Đang cập nhật”; có thể khôi phục từ thùng rác.`)) return
                              if (await run(() => deleteGrammarArticle(token, t.articleId), 'Đã chuyển bài vào thùng rác.')) refresh()
                            }}>Xóa</button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing({ topic: t, articleId: null })}>Soạn bài</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {showTrash && <Trash token={token} reload={reload} busy={busy} run={run} onChanged={refresh} />}
      {editing?.topic && (
        <ArticleEditor
          token={token}
          topic={editing.topic}
          articleId={editing.articleId}
          onClose={closeEditor}
          onSaved={(saved, created) => {
            closeEditor()
            setNotice({ kind: 'success', text: created ? `Đã thêm bài “${saved.title}”.` : `Đã lưu bài “${saved.title}”.` })
            refresh()
          }}
        />
      )}
    </div>
  )
}
