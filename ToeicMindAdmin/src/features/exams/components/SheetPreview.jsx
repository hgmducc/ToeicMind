import { useState } from 'react'

export function SheetPreview({ sheets }) {
  const names = Object.keys(sheets || {})
  const [selected, setSelected] = useState('Questions')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  if (!names.length) return null
  const name = names.includes(selected) ? selected : names[0]
  const rows = sheets[name] || []
  const columns = [...new Set(rows.flatMap(Object.keys))]
  const filtered = rows
    .map((row, i) => ({ row, number: i + 2 }))
    .filter(
      ({ row }) =>
        !search ||
        Object.values(row).some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
    )
  const lastPage = Math.max(1, Math.ceil(filtered.length / 20)),
    current = Math.min(page, lastPage)
  return (
    <details className="sheet-preview admin-card">
      <summary>Đối soát toàn bộ sheet nguồn ({names.length} sheet)</summary>
      <p className="muted">
        Bản Excel gốc được lưu cùng đề để đối soát. Dict và Media là dữ liệu tham chiếu; nội dung đã biên soạn
        nằm ở phần câu hỏi bên dưới.
      </p>
      <div className="admin-actions">
        <label>
          Sheet{' '}
          <select
            value={name}
            onChange={(e) => {
              setSelected(e.target.value)
              setPage(1)
              setSearch('')
            }}
          >
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Tìm trong sheet{' '}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <span>
          {filtered.length}/{rows.length} dòng · {columns.length} cột
        </span>
      </div>
      <div className="admin-table-wrap" tabIndex={0} aria-label={`Dữ liệu sheet ${name}`}>
        <table className="admin-table sheet-table">
          <thead>
            <tr>
              <th>Dòng Excel</th>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((current - 1) * 20, current * 20).map(({ row, number }) => (
              <tr key={number}>
                <td>{number}</td>
                {columns.map((c) => (
                  <td key={c}>
                    <div className="sheet-cell">{String(row[c] ?? '')}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          Trang {current}/{lastPage}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={current === lastPage}
          onClick={() => setPage(current + 1)}
        >
          Sau
        </button>
      </div>
    </details>
  )
}
