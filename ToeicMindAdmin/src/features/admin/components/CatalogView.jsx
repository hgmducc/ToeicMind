import { useEffect, useState } from 'react'
import { ApiNotice } from '../../exams/components/ApiNotice.jsx'
import { getExamCatalog } from '../../exams/services/examService.js'

function Table({ title, head, rows }) {
  return (
    <section className="admin-card">
      <h3>
        {title} ({rows.length})
      </h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function CatalogView({ session }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    getExamCatalog(session.accessToken)
      .then((c) => active && (setData(c), setError('')))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [session.accessToken, reload])
  return (
    <div>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">DANH MỤC</p>
          <h2>Danh mục hệ thống</h2>
          <p className="muted">Chỉ đọc. Muốn sửa danh mục phải cập nhật bằng SQL.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setReload((n) => n + 1)}>
          Tải lại
        </button>
      </div>
      {error && <ApiNotice notice={{ kind: 'error', text: error }} />}
      {!data && !error && <p role="status">Đang tải danh mục…</p>}
      {data && (
        <div className="stats-grid">
          <Table title="Part" head={['Part', 'Tên', 'Kỹ năng', 'Số câu chuẩn', 'Số đáp án']} rows={data.parts.map((p) => [p.partNo, p.partName, p.skill, p.standardQuestionCount, p.optionCount])} />
          <Table title="Mức độ" head={['Level', 'Tên', 'Nhãn']} rows={data.levels.map((l) => [l.levelNo, l.nameVi, l.shortLabel])} />
          <Table title="Cờ đặc biệt" head={['ID', 'Part', 'Mã', 'Tên']} rows={data.specialTags.map((t) => [t.specialTagId, t.partNo, t.code, t.nameVi])} />
          <Table title="Phân loại câu" head={['ID', 'Part', 'Mã', 'Tên', 'Nút lá']} rows={data.categories.map((c) => [c.categoryId, c.partNo, c.code, c.nameVi, c.isLeaf ? '✓' : ''])} />
        </div>
      )}
    </div>
  )
}
