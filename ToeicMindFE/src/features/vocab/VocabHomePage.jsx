import { Link, useSearchParams } from 'react-router-dom'
import { Pill, ProgressBar, VipPill } from '../../components/ui/Badges.jsx'
import { ChipLink } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { percent } from '../../lib/format.js'
import { VocabTabs } from './components/VocabTabs.jsx'
import { getVocabOverview, getVocabSetExams } from './services/vocabApi.js'

const Progress = ({ learned, mastered, total }) => (
  <div>
    <ProgressBar value={percent(learned, total)} label={`${learned}/${total} từ đã học`} />
    <p className="muted small">{learned}/{total} đã học · {mastered} đã thuộc</p>
  </div>
)

function ExamList({ setId }) {
  const { data, error, loading, reload } = useAsync(() => getVocabSetExams(setId), [setId])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.length) return <div className="card"><EmptyState>Bộ đề này chưa có từ vựng.</EmptyState></div>
  return (
    <div className="exam-grid">
      {data.map((exam) => (
        <article key={exam.examId} className="exam-card">
          <h3>{exam.title} <VipPill locked={exam.isLocked} /></h3>
          <p className="muted small">{exam.examCode} · {exam.wordCount} từ{exam.dueCount ? <> · <b className="bad-text">{exam.dueCount} đến hạn</b></> : null}</p>
          <Progress learned={exam.learnedCount} mastered={exam.masteredCount} total={exam.wordCount} />
          <div className="part-pick-grid">
            {exam.parts.map((part) => (
              <Link key={part.partNo} className="part-link" to={`/vocab/words?examSetId=${setId}&examId=${exam.examId}&partNo=${part.partNo}`}>
                <span>Part {part.partNo}</span><span className="muted">{part.learnedCount}/{part.wordCount}</span>
              </Link>
            ))}
          </div>
          <div className="exam-card-actions">
            <Link className="btn btn-primary btn-sm" to={`/vocab/learn?examSetId=${setId}&examId=${exam.examId}`}><Icon name="play" size={13} />Học đề này</Link>
            <Link className="btn btn-outline btn-sm" to={`/vocab/words?examSetId=${setId}&examId=${exam.examId}`}>Xem từ</Link>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function VocabHomePage() {
  useDocumentTitle('Từ vựng')
  const [params] = useSearchParams()
  const { data: overview, error, loading, reload } = useAsync(getVocabOverview, [])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const setId = params.get('set') ? Number(params.get('set')) : overview.sets[0]?.examSetId || 0

  return (
    <div className="stack">
      <VocabTabs current="learn" />
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-value">{overview.dueNow}</div><div className="stat-label">Từ đến hạn ôn</div></div>
        <div className="stat-card"><div className="stat-value">{overview.newWords}</div><div className="stat-label">Từ mới chưa học</div></div>
        <div className="stat-card"><div className="stat-value">{overview.learningWords}</div><div className="stat-label">Đang học</div></div>
        <div className="stat-card"><div className="stat-value">{overview.masteredWords}</div><div className="stat-label">Đã thuộc</div></div>
      </div>

      <div className="card row">
        <div className="spacer">
          <b>Hôm nay</b>
          <p className="muted small">Đã ôn {overview.reviewedToday} lượt · {overview.newToday} từ mới (mục tiêu {overview.newPerDay} từ mới/phiên)</p>
        </div>
        <Link className={`btn ${overview.dueNow ? 'btn-primary' : 'btn-outline'}`} to="/vocab/play?src=REVIEW"><Icon name="refresh" size={15} />Ôn {overview.dueNow} từ</Link>
        <Link className="btn btn-primary" to="/vocab/learn"><Icon name="play" size={15} />Học ngay</Link>
      </div>

      {overview.sets.length > 0 && (
        <nav className="chip-row" aria-label="Bộ đề">
          {overview.sets.map((set) => (
            <ChipLink key={set.examSetId} to={`/vocab?set=${set.examSetId}`} active={set.examSetId === setId}>
              {set.name} <span className="small">{set.wordCount}</span>{set.isLocked && <VipPill />}
            </ChipLink>
          ))}
        </nav>
      )}
      {overview.lockedWords > 0 && (
        <p className="muted small"><Pill tone="warning">VIP</Pill> {overview.lockedWords} từ thuộc nội dung VIP chưa được mở khóa. <Link className="text-link" to="/vip">Nâng cấp VIP</Link></p>
      )}

      {!overview.sets.length ? (
        <div className="card"><EmptyState>Chưa có từ vựng nào gắn với đề thi đã xuất bản.</EmptyState></div>
      ) : (
        <>
          <div className="row">
            <Link className="btn btn-outline btn-sm" to={`/vocab/words?examSetId=${setId}`}>Xem tất cả từ của bộ đề</Link>
            <Link className="btn btn-primary btn-sm" to={`/vocab/learn?examSetId=${setId}`}><Icon name="play" size={13} />Học cả bộ đề</Link>
          </div>
          <ExamList setId={setId} />
        </>
      )}
    </div>
  )
}
