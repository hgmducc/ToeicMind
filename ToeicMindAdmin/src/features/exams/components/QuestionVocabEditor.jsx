import { useState } from 'react'

const fields = [
  ['term', 'Từ xuất hiện *'],
  ['base', 'Nguyên thể *'],
  ['meaning_base', 'Nghĩa gốc *'],
  ['term_meaning_vi', 'Nghĩa trong ngữ cảnh'],
  ['ipa', 'Phiên âm IPA'],
  ['definition_en', 'Định nghĩa tiếng Anh'],
  ['example_en', 'Ví dụ tiếng Anh'],
  ['example_vi', 'Ví dụ tiếng Việt'],
]
const empty = () => ({
  term: '',
  base: '',
  pos: 'n',
  cefr: 'B1',
  meaning_base: '',
  term_meaning_vi: '',
  ipa: '',
  definition_en: '',
  example_en: '',
  example_vi: '',
})

export function QuestionVocabEditor({ vocabularies = [], questionNo, isReadOnly, onChange }) {
  const [editing, setEditing] = useState(null),
    [form, setForm] = useState(empty),
    [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(vocabularies.length / 10)),
    current = Math.min(page, pages)
  function edit(index) {
    setEditing(index)
    setForm(index === -1 ? empty() : { ...empty(), ...vocabularies[index] })
  }
  function save(e) {
    e.preventDefault()
    const next = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    )
    if (editing === -1) onChange([...vocabularies, next])
    else onChange(vocabularies.map((v, i) => (i === editing ? next : v)))
    setEditing(null)
  }
  return (
    <details className="question-vocab-box">
      <summary>
        Từ vựng câu {questionNo} · {vocabularies.length} ngữ cảnh
      </summary>
      {!isReadOnly && (
        <button type="button" className="btn btn-sm btn-outline" onClick={() => edit(-1)}>
          Thêm từ vựng
        </button>
      )}
      {editing !== null && (
        <form className="vocab-inline-form" onSubmit={save}>
          <div className="admin-form-grid">
            {fields.map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  required={['term', 'base', 'meaning_base'].includes(field)}
                  value={form[field]}
                  maxLength={
                    ['term', 'base', 'ipa'].includes(field) ? 100 : field.includes('meaning') ? 500 : 1000
                  }
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </label>
            ))}
            <label>
              Loại từ
              <select value={form.pos} onChange={(e) => setForm({ ...form, pos: e.target.value })}>
                {['n', 'v', 'adj', 'adv', 'prep', 'phr', 'phr.v'].map((pos) => (
                  <option key={pos}>{pos}</option>
                ))}
              </select>
            </label>
            <label>
              CEFR
              <select value={form.cefr} onChange={(e) => setForm({ ...form, cefr: e.target.value })}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-actions">
            <button type="submit" className="btn btn-primary">
              Lưu từ
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="vocab-list">
        {vocabularies.slice((current - 1) * 10, current * 10).map((v, offset) => {
          const index = (current - 1) * 10 + offset
          return (
            <article className="vocab-entry" key={index}>
              <div className="admin-card-header">
                <strong>
                  {v.term} → {v.base}{' '}
                  <small>
                    ({v.pos} · {v.cefr})
                  </small>
                </strong>
                {!isReadOnly && (
                  <div className="admin-actions">
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => edit(index)}>
                      Sửa từ
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (window.confirm(`Xóa từ “${v.term}” khỏi câu ${questionNo}?`))
                          onChange(vocabularies.filter((_, i) => i !== index))
                      }}
                    >
                      Xóa từ
                    </button>
                  </div>
                )}
              </div>
              <dl className="vocab-detail">
                {fields
                  .filter(([key]) => !['term', 'base'].includes(key))
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>{label.replace(' *', '')}</dt>
                      <dd>{v[key] || '—'}</dd>
                    </div>
                  ))}
              </dl>
            </article>
          )
        })}
      </div>
      {!vocabularies.length && <p className="muted">Chưa có từ vựng cho câu này.</p>}
      {pages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Trước
          </button>
          <span>
            {current}/{pages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </details>
  )
}
