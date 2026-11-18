import { useEffect, useState } from 'react'
import { getAdminDirections } from '../services/examService.js'
import { ApiNotice } from './ApiNotice.jsx'
import { MediaPreview } from './MediaPreview.jsx'

export function DirectionsEditor({ accessToken }) {
  const [directions, setDirections] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getAdminDirections(accessToken, { effective: false })
      .then((items) => { if (active) setDirections(items) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [accessToken])
  return (
    <section className="admin-card">
      <h3>4. Hướng dẫn dùng chung ({directions.length}/9)</h3>
      <p className="muted">Mọi đề thi sử dụng bộ hướng dẫn này. Quản lý nội dung, audio và ảnh Part 1 tại trang Hướng dẫn.</p>
      {error && <ApiNotice notice={{ kind: 'error', text: error }} />}
      {directions.map((direction) => (
        <details className="direction-item" key={direction.directionId}>
          <summary>{direction.partNo ? `Part ${direction.partNo}` : direction.skill === 'LISTENING' ? 'Phần Nghe' : 'Phần Đọc'} · Dùng chung</summary>
          <div className="admin-form-grid">
            {[['directionsEn', 'Hướng dẫn tiếng Anh'], ['directionsVi', 'Hướng dẫn tiếng Việt'], ['exampleEn', 'Ví dụ tiếng Anh'], ['exampleVi', 'Ví dụ tiếng Việt']].map(([key, label]) => (
              <div key={key}><strong>{label}</strong><p className="preserve-lines">{direction[key] || 'Chưa có nội dung'}</p></div>
            ))}
          </div>
          {(direction.media || []).map((media) => <MediaPreview key={media.mediaId} media={media} accessToken={accessToken} label={media.mediaType === 'AUDIO' ? 'audio hướng dẫn' : 'ảnh hướng dẫn'} />)}
        </details>
      ))}
    </section>
  )
}
