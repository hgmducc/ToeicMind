import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Pill } from '../../components/ui/Badges.jsx'
import { Pagination } from '../../components/ui/Controls.jsx'
import { Dialog } from '../../components/ui/Dialog.jsx'
import { EmptyState, ErrorState, Loading } from '../../components/ui/Feedback.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useConfirm } from '../../providers/confirmContext.js'
import { useToast } from '../../providers/toastContext.js'
import { VocabTabs } from './components/VocabTabs.jsx'
import { deleteMyVocab, getMyVocab, saveMyVocab } from './services/vocabApi.js'

const PAGE_SIZE = 30

function AddWordDialog({ onClose, onSaved }) {
  const [values, setValues] = useState({ word: '', meaning: '', example: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const word = values.word.trim()
    const meaning = values.meaning.trim()
    if (!word || !meaning) { setError('Nhập từ và nghĩa.'); return }
    setBusy(true)
    setError('')
    try {
      await saveMyVocab({ customWord: word, customMeaning: meaning, customExample: values.example.trim() || null })
      onSaved()
    } catch (failure) {
      setError(failure.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title="Thêm từ mới" size="sm" onClose={onClose} dismissible={!busy}>
      <form onSubmit={submit} noValidate>
        <label className="form-field"><span className="form-label">Từ / cụm từ</span><input className="input" autoFocus maxLength={100} value={values.word} onChange={(e) => setValues({ ...values, word: e.target.value })} /></label>
        <label className="form-field"><span className="form-label">Nghĩa</span><input className="input" maxLength={500} value={values.meaning} onChange={(e) => setValues({ ...values, meaning: e.target.value })} /></label>
        <label className="form-field"><span className="form-label">Ví dụ (tùy chọn)</span><textarea className="textarea" rows={2} maxLength={1000} value={values.example} onChange={(e) => setValues({ ...values, example: e.target.value })} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu từ'}</button>
        </div>
      </form>
    </Dialog>
  )
}

export default function MyVocabPage() {
  useDocumentTitle('Từ vựng của tôi')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [params] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const search = params.get('search') || ''
  const [adding, setAdding] = useState(false)
  const { data, error, loading, reload } = useAsync(() => getMyVocab({ page, pageSize: PAGE_SIZE, search }), [page, search])
  const link = (target) => `/vocab/mine?${new URLSearchParams({ ...(search && { search }), page: String(target) })}`

  async function remove(entry) {
    if (!(await confirm({ title: 'Xóa từ', message: `Xóa “${entry.word}” khỏi bộ từ của bạn?`, danger: true, okLabel: 'Xóa' }))) return
    try { await deleteMyVocab(entry.userVocabId); toast('Đã xóa.', 'success'); reload() }
    catch (failure) { toast(failure.message, 'error') }
  }

  return (
    <div className="stack">
      <VocabTabs current="mine" />
      <h1 className="page-title">Từ vựng của tôi</h1>
      <div className="toolbar">
        <form onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('search').trim(); navigate(`/vocab/mine${value ? `?search=${encodeURIComponent(value)}` : ''}`) }}>
          <input className="input" type="search" name="search" defaultValue={search} placeholder="Tìm theo từ hoặc nghĩa…" aria-label="Tìm từ" />
          <button type="submit" className="btn btn-outline">Tìm</button>
        </form>
        <span className="spacer" />
        <Link className="btn btn-outline" to="/vocab/learn?mine=true"><Icon name="play" size={14} />Học từ của tôi</Link>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={15} />Thêm từ</button>
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {data.items.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={entry.userVocabId}>
                      <td><b>{entry.word}</b> {entry.pos && <i className="muted small">{entry.pos}</i>}{entry.cefr && <> <Pill>{entry.cefr}</Pill></>}{entry.ipa && <div className="muted small">/{entry.ipa}/</div>}</td>
                      <td>{entry.meaning}</td>
                      <td className="muted small">{entry.example}</td>
                      <td className="cell-actions"><button type="button" className="icon-btn" data-tone="danger" aria-label={`Xóa từ ${entry.word}`} title="Xóa" onClick={() => remove(entry)}><Icon name="trash" size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card"><EmptyState>{search ? 'Không tìm thấy từ nào.' : 'Bạn chưa lưu từ nào. Khi xem giải thích câu hỏi, bấm “Lưu từ” để thêm vào đây.'}</EmptyState></div>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.totalCount} unit="từ" linkFor={link} />
        </>
      )}
      {adding && <AddWordDialog onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toast('Đã lưu từ.', 'success'); reload() }} />}
    </div>
  )
}
