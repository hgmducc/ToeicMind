import { useCallback, useEffect, useRef, useState } from 'react'
import { getSignedMediaUrl } from '../services/examService.js'

// URL ký R2 có hạn ngắn (mặc định 10 phút): làm mới trước khi hết hạn.
const REFRESH_LEAD_MS = 60 * 1000
const MIN_REFRESH_MS = 30 * 1000
const FALLBACK_TTL_MS = 5 * 60 * 1000
const EMPTY = { url: null, expiresAt: 0, loading: false, error: '' }

export function MediaPreview({ media, accessToken, label = 'Media' }) {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState(EMPTY)
  const hostRef = useRef(null)
  const tokenRef = useRef(accessToken)
  const aliveRef = useRef(true)
  const retriedRef = useRef(false)
  const mediaId = media?.mediaId
  const isImage = media?.mediaType === 'IMAGE'

  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!mediaId) return
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const { url, expiresAt } = await getSignedMediaUrl(tokenRef.current, mediaId)
      if (!aliveRef.current) return
      const expires = Date.parse(expiresAt)
      setState({
        url,
        expiresAt: Number.isNaN(expires) ? Date.now() + FALLBACK_TTL_MS : expires,
        loading: false,
        error: '',
      })
    } catch (err) {
      if (!aliveRef.current) return
      setState({ ...EMPTY, error: err.message || 'Không tải được tệp.' })
    }
  }, [mediaId])

  // Đổi tệp thì bỏ URL cũ
  useEffect(() => {
    retriedRef.current = false
    setState(EMPTY)
  }, [mediaId])

  // Chỉ tải khi khung gần màn hình, tránh gửi hàng trăm yêu cầu khi mở đề có nhiều clip
  useEffect(() => {
    if (visible || !hostRef.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (visible && mediaId) void load()
  }, [visible, mediaId, load])

  // Lên lịch làm mới URL trước khi hết hạn
  useEffect(() => {
    if (!state.url) return undefined
    const delay = Math.max(MIN_REFRESH_MS, state.expiresAt - Date.now() - REFRESH_LEAD_MS)
    const timer = setTimeout(() => {
      retriedRef.current = false
      void load()
    }, delay)
    return () => clearTimeout(timer)
  }, [state.url, state.expiresAt, load])

  function handleMediaError() {
    // Liên kết có thể vừa hết hạn: thử lấy lại một lần rồi mới báo lỗi
    if (!retriedRef.current) {
      retriedRef.current = true
      void load()
      return
    }
    setState((s) => ({
      ...s,
      url: null,
      error: isImage ? 'Ảnh chưa tải được. Hãy thử lại.' : 'Audio chưa phát được. Hãy thử lại.',
    }))
  }

  function retry() {
    retriedRef.current = false
    void load()
  }

  if (!media) return null

  return (
    <div className="media-preview" ref={hostRef}>
      {state.url ? (
        isImage ? (
          <img src={state.url} alt={media.altText || label} onError={handleMediaError} />
        ) : (
          <audio
            controls
            preload="metadata"
            src={state.url}
            aria-label={label}
            onError={handleMediaError}
          />
        )
      ) : state.error ? (
        <>
          <p className="field-error" role="alert">
            {state.error}
          </p>
          <button type="button" className="btn btn-sm btn-outline" disabled={state.loading} onClick={retry}>
            {state.loading ? 'Đang tải…' : 'Thử lại'}
          </button>
        </>
      ) : (
        <span className="media-preview-status" style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          {state.loading || visible ? `Đang tải ${label}…` : `Chuẩn bị ${label}…`}
        </span>
      )}
    </div>
  )
}