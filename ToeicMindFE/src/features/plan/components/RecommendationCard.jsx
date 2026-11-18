import { useState } from 'react'
import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { kindMeta, minutesLabel } from '../planModel.js'

// Một bài học được gợi ý: loại, tiêu đề, lý do, thời lượng và nút mở đúng bài.
export function RecommendationCard({ item, onStart, compact = false }) {
  const [busy, setBusy] = useState(false)
  const meta = kindMeta(item.kind)
  async function start() {
    if (busy) return
    setBusy(true)
    try { await onStart(item) } finally { setBusy(false) }
  }
  return (
    <article className="rec-card" data-kind={item.kind} data-compact={compact}>
      <span className="rec-icon" aria-hidden="true"><Icon name={meta.icon} size={20} /></span>
      <div className="rec-body">
        <div className="tag-row"><Pill tone="muted">{meta.label}</Pill><Pill tone="muted"><Icon name="clock" size={12} />{minutesLabel(item.estimatedMinutes)}</Pill></div>
        <h3 className="rec-title">{item.title}</h3>
        {!compact && <p className="rec-reason">{item.reason}</p>}
      </div>
      <button type="button" className="btn btn-primary btn-sm rec-action" onClick={start} disabled={busy} aria-label={`Bắt đầu: ${item.title}`}>
        {busy ? 'Đang mở…' : item.kind === 'PROFILE' ? 'Đặt mục tiêu' : 'Bắt đầu'}<Icon name="chevron-right" size={13} />
      </button>
    </article>
  )
}
