import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { VipPill } from '../../components/ui/Badges.jsx'
import { ChipLink, PageHero } from '../../components/ui/Controls.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ModeDialog } from './components/ModeDialog.jsx'
import { getExamSets, getExams } from './services/examApi.js'

function ExamGrid({ setId, onPick }) {
  const { data, error, loading, reload } = useAsync(() => getExams(setId), [setId])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.items.length) return <div className="card"><EmptyState>Bộ đề này chưa có đề xuất bản.</EmptyState></div>
  return (
    <div className="exam-grid">
      {data.items.map((exam) => (
        <article key={exam.examId} className="exam-card">
          <h3>{exam.title}</h3>
          <p className="muted small">{exam.examCode}</p>
          {exam.description && <p className="small">{exam.description}</p>}
          {exam.effectiveAccess === 'VIP' && <p><VipPill />{exam.isLocked && <span className="muted small"> cần nâng cấp để làm bài</span>}</p>}
          <div className="exam-card-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onPick(exam)}><Icon name="play" size={14} />Chọn chế độ</button>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function TestsPage() {
  useDocumentTitle('Đề thi')
  const [params] = useSearchParams()
  const [picked, setPicked] = useState(null)
  const { data, error, loading, reload } = useAsync(getExamSets, [])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const sets = data.items
  const setId = params.get('set') ? Number(params.get('set')) : sets[0]?.examSetId || 0
  const current = sets.find((set) => set.examSetId === setId)

  return (
    <div className="stack">
      <PageHero icon="file" eyebrow="Đề thi TOEIC" title="Làm đề như thi thật">
        Chọn bộ đề, chọn đề rồi chọn chế độ: <b>Luyện thi</b> (có đồng hồ, chấm khi nộp) hoặc <b>Luyện tập</b> (xem đáp án ngay).
      </PageHero>
      {sets.length > 0 && (
        <nav className="chip-row" aria-label="Bộ đề">
          {sets.map((set) => <ChipLink key={set.examSetId} to={`/tests?set=${set.examSetId}`} active={set.examSetId === setId}>{set.name} <span className="small">{set.publishedExamCount}</span></ChipLink>)}
        </nav>
      )}
      {current?.description && <p className="muted">{current.description}</p>}
      {!sets.length ? <div className="card"><EmptyState>Chưa có bộ đề nào được xuất bản.</EmptyState></div> : <ExamGrid setId={setId} onPick={setPicked} />}
      {picked && <ModeDialog examId={picked.examId} title={picked.title} onClose={() => setPicked(null)} />}
    </div>
  )
}
