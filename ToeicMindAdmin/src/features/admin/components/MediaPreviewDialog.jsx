import { useEffect, useState } from 'react'
import { getSignedMediaUrl } from '../../exams/services/examService.js'
import { FormDialog } from './FormDialog.jsx'

export function MediaPreviewDialog({ token, media, onClose }) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState('')
  useEffect(() => {
    getSignedMediaUrl(token, media.mediaId)
      .then((r) => setUrl(r.url))
      .catch((e) => setError(e.message))
  }, [token, media.mediaId])
  return (
    <FormDialog title={media.mediaType === 'AUDIO' ? 'Nghe audio' : 'Xem hình'} onClose={onClose}>
      {error && <p role="alert" className="muted">{error}</p>}
      {!url && !error && <p role="status">Đang lấy liên kết…</p>}
      {url && (media.mediaType === 'AUDIO' ? <audio controls autoPlay src={url} style={{ width: '100%' }} /> : <img src={url} alt="" style={{ maxWidth: '100%' }} />)}
    </FormDialog>
  )
}
