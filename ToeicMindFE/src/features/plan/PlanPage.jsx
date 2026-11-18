import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill, ProgressBar } from '../../components/ui/Badges.jsx'
import { PageHero } from '../../components/ui/Controls.jsx'
import { ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { PART_NAMES, formatDate, percent } from '../../lib/format.js'
import { useToast } from '../../providers/toastContext.js'
import { paths } from '../../routes/learnerRoutes.js'
import { useStartBank } from '../bank/useStartBank.js'
import { GoalDialog } from './components/GoalDialog.jsx'
import { RecommendationCard } from './components/RecommendationCard.jsx'
import { PART_STATUS, SOURCE_LABEL, daysLabel, minutesLabel, skillProgress } from './planModel.js'
import { getLearningPlan } from './services/planApi.js'
import { useRecommendation } from './useRecommendation.js'

function PlacementCard({ placement }) {
  const last = placement.lastResult
  if (placement.inProgressAttemptId) {
    return (
      <div className="callout plan-placement">
        <Icon name="clock" size={20} />
        <p className="spacer"><b>Bạn đang làm dở bài kiểm tra đầu vào.</b> Hoàn thành để lộ trình dùng đúng trình độ của bạn.</p>
        <Link className="btn btn-primary btn-sm" to={paths.attempt(placement.inProgressAttemptId)}>Làm tiếp</Link>
      </div>
    )
  }
  if (!last && placement.available) {
    return (
      <section className="card plan-placement plan-placement--cta">
        <span className="rec-icon" aria-hidden="true"><Icon name="target" size={22} /></span>
        <div className="spacer">
          <h2 className="card-title">Kiểm tra đầu vào</h2>
          <p className="muted">{placement.test.totalQuestions} câu · {Math.ceil(placement.test.timeLimitSeconds / 60)} phút. Kết quả xác định Level Nghe/Đọc để gợi ý bài học vừa sức.</p>
        </div>
        <Link className="btn btn-primary" to="/placement">Làm bài kiểm tra</Link>
      </section>
    )
  }
  if (!last) return null
  return (
    <section className="card plan-card">
      <div className="plan-card-head">
        <h2 className="card-title">Kết quả kiểm tra đầu vào</h2>
        <span className="muted small">{formatDate(last.submittedAt)}</span>
      </div>
      <dl className="plan-scores">
        <div><dt>Ước tính</dt><dd className="plan-score">{last.totalScaled ?? '–'}</dd></div>
        <div><dt>Nghe</dt><dd className="plan-score plan-score--sm">{last.listeningScaled ?? '–'}</dd>{last.listeningLevel && <dd><Pill>{last.listeningLevel.shortLabel}</Pill></dd>}</div>
        <div><dt>Đọc</dt><dd className="plan-score plan-score--sm">{last.readingScaled ?? '–'}</dd>{last.readingLevel && <dd><Pill>{last.readingLevel.shortLabel}</Pill></dd>}</div>
      </dl>
      <p className="plan-card-foot">
        <Link className="text-link" to={paths.result(last.attemptId)}>Xem kết quả chi tiết →</Link>
        {placement.available && <Link className="text-link" to="/placement">Làm lại bài kiểm tra</Link>}
      </p>
    </section>
  )
}

function GoalCard({ profile, current, onEdit }) {
  const reached = profile.targetScore && current.totalScaled != null ? percent(current.totalScaled, profile.targetScore) : null
  return (
    <section className="card plan-card">
      <div className="plan-card-head">
        <h2 className="card-title">Mục tiêu</h2>
        <button type="button" className="btn btn-outline btn-sm" onClick={onEdit}><Icon name="flag" size={14} />{profile.targetScore ? 'Sửa mục tiêu' : 'Đặt mục tiêu'}</button>
      </div>
      {profile.targetScore ? (
        <>
          <div className="plan-goal">
            <div><p className="muted small">Hiện tại</p><p className="plan-score">{current.totalScaled ?? '–'}</p></div>
            <Icon name="arrow-right" size={22} className="muted" />
            <div><p className="muted small">Mục tiêu</p><p className="plan-score plan-score--goal">{profile.targetScore}</p></div>
          </div>
          {reached != null && (
            <div className="plan-goal-progress">
              <ProgressBar value={reached} tone={reached >= 100 ? 'success' : undefined} label="Tiến độ tới điểm mục tiêu" />
              <p className="muted small">Đã đạt {Math.min(100, Math.round(reached))}% mục tiêu</p>
            </div>
          )}
        </>
      ) : <p className="muted">Bạn chưa đặt điểm mục tiêu. Đặt mục tiêu để lộ trình ưu tiên đúng kỹ năng còn thiếu.</p>}
      <div className="tag-row plan-card-foot">
        {profile.examDate && <Pill tone={profile.daysToExam != null && profile.daysToExam <= 14 ? 'warning' : undefined}><Icon name="clock" size={12} />Thi {formatDate(profile.examDate)} · {daysLabel(profile.daysToExam)}</Pill>}
        <Pill tone="muted">{minutesLabel(profile.dailyMinutes)} mỗi ngày</Pill>
      </div>
    </section>
  )
}

function SkillCard({ skills }) {
  return (
    <section className="card plan-card plan-card--skills">
      <h2 className="card-title">Trình độ theo kỹ năng</h2>
      <div className="plan-skills">
        {skills.map((skill) => {
          const progress = skillProgress(skill)
          return (
            <div key={skill.skill} className="plan-skill">
              <div className="row small">
                <b>{skill.name}</b>
                {skill.isFocus && <Pill tone="accent">Ưu tiên</Pill>}
                <span className="spacer" />
                <span><b className="plan-skill-score">{skill.estimatedScaled ?? '–'}</b>{skill.targetScaled ? <span className="muted"> / {skill.targetScaled}</span> : <span className="muted"> / 495</span>}</span>
              </div>
              <ProgressBar value={progress ?? percent(skill.estimatedScaled || 0, 495)} tone={progress === 100 ? 'success' : undefined} label={`Tiến tới mục tiêu ${skill.name}`} />
              <p className="muted small">
                {skill.estimatedScaled != null ? <>{SOURCE_LABEL[skill.source] || 'Ước tính'}{skill.level && <> · {skill.level.name}</>}</> : 'Chưa đủ dữ liệu để ước tính điểm'}
                {skill.practiceLevel && <> · nên luyện <b>{skill.practiceLevel.shortLabel}</b></>}
                {skill.gap > 0 && <> · còn thiếu <b>{skill.gap}</b> điểm</>}
                {skill.answered > 0 && <> · đúng {Math.round(skill.accuracyPercent)}% ({skill.correct}/{skill.answered} câu)</>}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TopicList({ topics, onPractice }) {
  return (
    <ul className="plan-topics">
      {topics.map((topic) => (
        <li key={topic.cardKey + topic.partNo}>
          <div className="row small">
            <Pill tone="muted">Part {topic.partNo}</Pill><b className="spacer">{topic.name}</b>
            <span><b>{topic.correct}</b>/{topic.answered} đúng</span>
          </div>
          <div className="row">
            <div className="spacer"><ProgressBar value={topic.accuracyPercent} tone={topic.accuracyPercent >= 80 ? 'success' : topic.accuracyPercent < 60 ? 'danger' : 'warning'} label={`Tỷ lệ đúng ${topic.name}`} /></div>
            {onPractice && <button type="button" className="btn btn-outline btn-sm" onClick={() => onPractice(topic)}>Luyện</button>}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function PlanPage() {
  useDocumentTitle('Lộ trình cá nhân')
  const toast = useToast()
  const startBank = useStartBank()
  const [editing, setEditing] = useState(false)
  const run = useRecommendation(() => setEditing(true))
  const { data: plan, error, loading, reload } = useAsync(getLearningPlan, [])

  if (loading) return <Loading label="Đang phân tích kết quả học của bạn…" />
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/" />

  const today = plan.recommendations.filter((item) => item.isToday)
  const more = plan.recommendations.filter((item) => !item.isToday)
  const practiceTopic = (topic) => startBank(topic.partNo, topic.cardKey, topic.wrong >= 3 ? 'WRONG' : 'NEW')

  const hasResult = Boolean(plan.placement.lastResult) && !plan.placement.inProgressAttemptId

  return (
    <div className="stack">
      <PageHero icon="target" eyebrow="Lộ trình cá nhân" title="Học đúng phần bạn cần">
        Lộ trình dựa trên bài kiểm tra đầu vào, các bài thi và lần trả lời gần nhất của từng câu; gợi ý mở thẳng bài học trong ngân hàng câu hỏi, nghe chép và từ vựng. Tự cập nhật sau mỗi bài.
      </PageHero>

      {/* Chưa có kết quả (mời làm / đang làm dở): lời mời chiếm cả hàng; có kết quả: thành một thẻ trong hàng tổng quan. */}
      {!hasResult && <PlacementCard placement={plan.placement} />}

      <div className="plan-overview" data-count={hasResult ? 3 : 2}>
        <GoalCard profile={plan.profile} current={plan.current} onEdit={() => setEditing(true)} />
        {hasResult && <PlacementCard placement={plan.placement} />}
        <SkillCard skills={plan.skills} />
      </div>

      <div className="plan-layout">
        <div className="plan-col">
          <section className="card">
            <div className="plan-card-head">
              <h2 className="card-title">Kế hoạch hôm nay</h2>
              <Pill tone="muted"><Icon name="clock" size={12} />{minutesLabel(plan.todayMinutes)} / {minutesLabel(plan.profile.dailyMinutes)}</Pill>
            </div>
            {today.length
              ? <div className="rec-list">{today.map((item) => <RecommendationCard key={item.key} item={item} onStart={run} />)}</div>
              : <p className="muted">Chưa có gợi ý nào. Hãy làm một bài luyện tập để hệ thống đánh giá.</p>}
          </section>
          {more.length > 0 && (
            <section className="card">
              <h2 className="card-title">Gợi ý thêm</h2>
              <div className="rec-list">{more.map((item) => <RecommendationCard key={item.key} item={item} onStart={run} />)}</div>
            </section>
          )}
        </div>
        <div className="plan-col">
          <section className="card">
            <h2 className="card-title">Phân tích theo Part</h2>
            <div className="plan-parts">
              {plan.parts.map((part) => {
                const [label, tone] = PART_STATUS[part.status] || PART_STATUS.UNTESTED
                return (
                  <div key={part.partNo} className="part-progress">
                    <div className="row small">
                      <b>Part {part.partNo}</b><span className="muted plan-part-name">{PART_NAMES[part.partNo] || part.partName}</span>
                      <Pill tone={tone}>{label}</Pill>
                      <span className="plan-part-num">{part.answered ? <>{Math.round(part.accuracyPercent)}% · {part.correct}/{part.answered}</> : '–'}</span>
                    </div>
                    <ProgressBar value={part.accuracyPercent ?? 0} tone={tone === 'muted' ? undefined : tone} label={`Tỷ lệ đúng Part ${part.partNo}`} />
                  </div>
                )
              })}
            </div>
          </section>
          <section className="card">
            <h2 className="card-title">Chủ điểm cần củng cố</h2>
            {plan.weakTopics.length
              ? <TopicList topics={plan.weakTopics} onPractice={practiceTopic} />
              : <p className="muted">{plan.answeredQuestions ? 'Chưa thấy chủ điểm nào dưới 60% (cần ít nhất 3 câu mỗi chủ điểm).' : 'Làm bài kiểm tra đầu vào hoặc vài bài luyện tập để tìm chủ điểm yếu.'}</p>}
          </section>
          {plan.strongTopics.length > 0 && (
            <section className="card"><h2 className="card-title">Chủ điểm đã vững</h2><TopicList topics={plan.strongTopics} /></section>
          )}
        </div>
      </div>

      {editing && <GoalDialog profile={plan.profile} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); toast('Đã lưu mục tiêu. Lộ trình đã được cập nhật.', 'success'); reload() }} />}
    </div>
  )
}
