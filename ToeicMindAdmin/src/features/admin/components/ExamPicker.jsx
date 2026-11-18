import { useEffect, useState } from 'react'
import { getAdminExams } from '../../exams/services/examService.js'

/** Ô chọn đề (tối đa 100 đề chưa xóa, mới nhất trước) dùng chung cho Media, Hướng dẫn, Nhập JSON. */
export function ExamPicker({ token, value, onChange, label = 'Đề thi', allowEmpty, emptyLabel = 'Chọn đề…' }) {
  const [items, setItems] = useState([]),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getAdminExams(token, { pageSize: 100 })
      .then((r) => active && setItems(r.items))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [token])
  return (
    <label>
      {label}
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value, items.find((x) => String(x.examId) === e.target.value))}>
        {(allowEmpty || !value) && <option value="">{emptyLabel}</option>}
        {items.map((x) => (
          <option key={x.examId} value={x.examId}>
            {x.examCode} · {x.title}
          </option>
        ))}
      </select>
      {error && <small className="muted">{error}</small>}
    </label>
  )
}
