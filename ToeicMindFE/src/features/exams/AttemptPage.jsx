import { Navigate, useParams } from 'react-router-dom'
import { ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { paths } from '../../routes/learnerRoutes.js'
import ExamRunner from './ExamRunner.jsx'
import PlacementRunner from './PlacementRunner.jsx'
import PracticeRunner from './PracticeRunner.jsx'
import { getAttempt, getExamModes } from './services/examApi.js'

// Mở một lượt làm bài: Luyện thi chạy liền mạch (ExamRunner), Luyện tập/ngân hàng chấm ngay (PracticeRunner).
export default function AttemptPage() {
  const { attemptId } = useParams()
  const { data, error, loading, reload } = useAsync(async () => {
    const attempt = await getAttempt(attemptId)
    let title = attempt.scope === 'BANK' ? 'Luyện theo ngân hàng câu hỏi' : attempt.scope === 'PLACEMENT' ? 'Kiểm tra đầu vào' : 'Làm bài'
    if (attempt.examId && attempt.status === 'IN_PROGRESS') {
      try { title = (await getExamModes(attempt.examId)).title } catch { /* Giữ tên mặc định. */ }
    }
    return { attempt, title }
  }, [attemptId])
  useDocumentTitle(data?.title || 'Làm bài')

  if (loading) return <Loading label="Đang mở bài làm…" />
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/history" />
  if (data.attempt.status !== 'IN_PROGRESS') return <Navigate to={paths.result(attemptId)} replace />
  const { attempt, title } = data
  if (attempt.scope === 'PLACEMENT') return <PlacementRunner key={attempt.attemptId} attempt={attempt} title={title} />
  return attempt.mode === 'EXAM' && attempt.scope !== 'BANK'
    ? <ExamRunner key={attempt.attemptId} attempt={attempt} title={title} />
    : <PracticeRunner key={attempt.attemptId} attempt={attempt} title={title} />
}
