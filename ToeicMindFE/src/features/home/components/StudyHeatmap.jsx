import { useState } from 'react'
import { isoDay } from '../../../lib/format.js'

// Lịch học 12 tuần: cột = tuần, hàng = thứ (bắt đầu từ thứ Hai); ô đậm hơn khi làm nhiều bài hơn trong ngày.
export function StudyHeatmap({ days, weeks = 12 }) {
  const counts = new Map(days.map((day) => [String(day.date).slice(0, 10), day.attemptCount]))
  const [today] = useState(() => new Date())
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(end.getDate() - 7 * weeks + 1)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const cells = []
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const key = isoDay(day)
    const count = counts.get(key) || 0
    cells.push(<i key={key} data-level={Math.min(count, 3) || undefined} title={`${key.split('-').reverse().join('/')}: ${count} lượt`} />)
  }
  return <div className="heat" role="img" aria-label={`Lịch học ${weeks} tuần gần nhất`}>{cells}</div>
}
