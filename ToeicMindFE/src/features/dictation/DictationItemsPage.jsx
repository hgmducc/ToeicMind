import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ItemList } from './components/ItemList.jsx'

export default function DictationItemsPage() {
  useDocumentTitle('Chọn bộ clip để luyện')
  const [params] = useSearchParams()
  const set = params.get('examSetId')
  return (
    <div className="stack">
      <div className="page-head">
        <Link className="btn btn-outline btn-sm" to={`/listen/dictation${set ? `?set=${set}` : ''}`}><Icon name="chevron-left" size={14} />Nghe chép</Link>
        <h1 className="page-title">Chọn bộ clip để luyện</h1>
      </div>
      <p className="muted">Mỗi bộ clip gồm các câu nghe đã được cắt nhỏ từ một nhóm câu hỏi trong đề.</p>
      <ItemList />
    </div>
  )
}
