import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../../../components/ui/Badges.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { useAsync } from '../../../hooks/useAsync.js'
import { useToast } from '../../../providers/toastContext.js'
import { minutesLabel } from '../planModel.js'
import { getLearningPlan } from '../services/planApi.js'
import { useRecommendation } from '../useRecommendation.js'
import { GoalDialog } from './GoalDialog.jsx'
import { RecommendationCard } from './RecommendationCard.jsx'

// Khối lộ trình trên Trang chủ: mời kiểm tra đầu vào và 3 bài nên học hôm nay. Tải riêng; lỗi thì ẩn để Trang chủ vẫn dùng được.
export function PlanWidget() {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const run = useRecommendation(() => setEditing(true))
  const { data: plan, error, loading, reload } = useAsync(getLearningPlan, [])
  if (loading || error || !plan) return null

  const placement = plan.placement
  const invite = placement.available && !placement.lastResult && !placement.inProgressAttemptId
  const today = plan.recommendations.filter((item) => item.isToday && item.kind !== 'PLACEMENT').slice(0, 3)
  const current = plan.current.totalScaled

  return (
    <>
      {invite && (
        <section className="card plan-placement plan-placement--cta" aria-label="Kiểm tra đầu vào">
          <span className="rec-icon" aria-hidden="true"><Icon name="target" size={22} /></span>
          <div className="spacer">
            <h2 className="card-title">Kiểm tra trình độ để nhận lộ trình riêng</h2>
            <p className="muted">{placement.test.totalQuestions} câu · {Math.ceil(placement.test.timeLimitSeconds / 60)} phút. Hệ thống ước tính điểm, xác định Level Nghe/Đọc rồi gợi ý bài học vừa sức.</p>
          </div>
          <Link className="btn btn-primary" to="/placement">Làm bài kiểm tra</Link>
        </section>
      )}
      <section className="card">
        <div className="row plan-today-head">
          <h2 className="card-title spacer">Hôm nay nên học</h2>
          {current != null && <Pill tone="muted">Ước tính {current}{plan.profile.targetScore ? ` → mục tiêu ${plan.profile.targetScore}` : ''}</Pill>}
          <Pill tone="muted"><Icon name="clock" size={12} />{minutesLabel(plan.todayMinutes)}</Pill>
        </div>
        {today.length
          ? <div className="rec-list">{today.map((item) => <RecommendationCard key={item.key} item={item} onStart={run} compact />)}</div>
          : <p className="muted">Chưa có gợi ý cho hôm nay.</p>}
        <p className="heat-note"><Link className="text-link" to="/plan">Xem lộ trình đầy đủ →</Link></p>
      </section>
      {editing && <GoalDialog profile={plan.profile} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); toast('Đã lưu mục tiêu.', 'success'); reload() }} />}
    </>
  )
}
