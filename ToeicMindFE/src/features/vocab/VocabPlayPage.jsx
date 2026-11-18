import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { MODES } from './engine/modeCatalog.js'
import { configToQuery, loadSession, parseConfig } from './services/sessionLoader.js'
import VocabSession from './VocabSession.jsx'

export default function VocabPlayPage() {
  useDocumentTitle('Học từ vựng')
  const [params] = useSearchParams()
  const query = params.toString()
  const config = useMemo(() => parseConfig(new URLSearchParams(query)), [query])
  const { data, error, loading, reload } = useAsync(() => loadSession(config), [query])
  const learnLink = `/vocab/learn?${configToQuery(config)}`

  if (loading) return <Loading label="Đang chuẩn bị bộ câu hỏi…" />
  if (error) return <ErrorState error={error} onRetry={reload} backTo={learnLink} />
  if (!data.items.length) {
    return (
      <EmptyState
        title="Chưa có từ để học"
        action={<><Link className="btn btn-primary" to={learnLink}>Đổi cách học</Link><Link className="btn btn-outline" to="/vocab">Về trang từ vựng</Link></>}
      >
        {config.src === 'REVIEW' ? 'Chưa có từ nào đến hạn ôn trong phạm vi này.' : config.src === 'NEW' ? 'Bạn đã học hết từ mới trong phạm vi này.' : 'Không có từ đến hạn và không còn từ mới trong phạm vi này. Hãy thử nguồn “Luyện tự do”.'}
      </EmptyState>
    )
  }
  if (!data.slots.length) {
    const names = config.modeIds.map((id) => MODES[id].short).join(', ')
    return (
      <EmptyState title="Các từ này chưa chơi được với dạng câu hỏi đã chọn" action={<Link className="btn btn-primary" to={learnLink}>Chọn dạng câu hỏi khác</Link>}>
        Các dạng đã chọn ({names}) cần thêm từ gây nhiễu, câu ví dụ hoặc định nghĩa. Hãy chọn thêm dạng câu hỏi.
      </EmptyState>
    )
  }
  return <VocabSession key={data.id} prepared={data} config={config} onRestart={reload} />
}
