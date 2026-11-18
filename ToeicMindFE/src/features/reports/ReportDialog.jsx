import { useState } from 'react'
import { Dialog } from '../../components/ui/Dialog.jsx'
import { useToast } from '../../providers/toastContext.js'
import { createReport } from './reportsApi.js'

// UC-14: báo lỗi một nội dung. Không dùng trong Luyện thi (ASM-06). Mỗi đối tượng có bộ loại lỗi phù hợp; mã gửi lên vẫn là 5 loại chuẩn.
const TARGETS = {
  QUESTION: {
    idKey: 'questionId', title: 'Báo lỗi câu hỏi', noun: 'câu này',
    types: [['WRONG_ANSWER', 'Đáp án sai'], ['WRONG_EXPLANATION', 'Giải thích sai'], ['MEDIA_ERROR', 'Lỗi âm thanh / hình'], ['TYPO', 'Lỗi chính tả'], ['OTHER', 'Khác']],
  },
  VOCABULARY: {
    idKey: 'vocabId', title: 'Báo lỗi từ vựng', noun: 'từ này',
    types: [['WRONG_EXPLANATION', 'Nghĩa / ví dụ sai'], ['TYPO', 'Lỗi chính tả / phiên âm'], ['MEDIA_ERROR', 'Phát âm sai'], ['OTHER', 'Khác']],
  },
  GRAMMAR_ARTICLE: {
    idKey: 'articleId', title: 'Báo lỗi bài ngữ pháp', noun: 'bài này',
    types: [['WRONG_EXPLANATION', 'Giải thích / ví dụ sai'], ['TYPO', 'Lỗi chính tả'], ['MEDIA_ERROR', 'Lỗi hình / hiển thị'], ['OTHER', 'Khác']],
  },
  LISTENING_ITEM: {
    idKey: 'listeningItemId', title: 'Báo lỗi bộ clip', noun: 'bộ clip này',
    types: [['WRONG_EXPLANATION', 'Script / bản dịch sai'], ['MEDIA_ERROR', 'Lỗi âm thanh'], ['TYPO', 'Lỗi chính tả'], ['OTHER', 'Khác']],
  },
}

// targetType + targetId; vẫn nhận questionId để giữ cách gọi cũ ở màn làm bài.
export function ReportDialog({ targetType = 'QUESTION', targetId, questionId, subtitle, onClose }) {
  const toast = useToast()
  const target = TARGETS[targetType]
  const id = targetId ?? questionId
  const [type, setType] = useState(target.types[0][0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (type === 'OTHER' && !description.trim()) { setError('Vui lòng mô tả lỗi.'); return }
    setBusy(true)
    setError('')
    try {
      await createReport({ targetType, [target.idKey]: id, errorType: type, description: description.trim() || null })
      toast('Đã gửi báo lỗi, cảm ơn bạn!', 'success')
      onClose()
    } catch (failure) {
      if (failure.code === 'REPORT_DUPLICATE') { toast(`Bạn đã báo lỗi ${target.noun}, đang chờ xử lý.`); onClose(); return }
      setError(failure.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title={target.title} size="sm" onClose={onClose} dismissible={!busy}>
      <form onSubmit={submit} noValidate>
        {subtitle && <p className="muted small">{subtitle}</p>}
        <label className="form-field"><span className="form-label">Loại lỗi</span>
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>{target.types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        <label className="form-field"><span className="form-label">Mô tả (bắt buộc nếu chọn Khác)</span>
          <textarea className="textarea" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo lỗi'}</button>
        </div>
      </form>
    </Dialog>
  )
}
