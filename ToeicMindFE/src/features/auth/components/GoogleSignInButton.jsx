import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GoogleIcon } from '../../../components/ui/GoogleIcon.jsx'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

export default function GoogleSignInButton({ isRegister, disabled, loading, highlighted, onCredential, onError }) {
  const hostRef = useRef(null)
  const latest = useRef({ disabled, onCredential })
  useLayoutEffect(() => { latest.current = { disabled, onCredential } }, [disabled, onCredential])
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const failure = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    let disposed = false
    let timer
    let observer
    let width = 0
    const deadline = Date.now() + 15000
    failure.current = null

    function setup() {
      if (disposed) return
      if (!CLIENT_ID) {
        failure.current = 'Chưa cấu hình Google Client ID. Vui lòng liên hệ quản trị viên.'
        return
      }
      const gsi = window.google?.accounts?.id
      if (!gsi) {
        if (Date.now() < deadline) timer = setTimeout(setup, 300)
        else failure.current = 'Không tải được dịch vụ Google. Kiểm tra kết nối rồi thử lại.'
        return
      }
      try {
        gsi.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (!disposed && !latest.current.disabled) latest.current.onCredential(response)
          },
          ux_mode: 'popup',
          auto_select: false,
        })
        const render = () => {
          if (disposed) return
          const nextWidth = Math.min(400, Math.floor(host.getBoundingClientRect().width))
          if (nextWidth <= 0 || nextWidth === width) return
          width = nextWidth
          host.replaceChildren()
          gsi.renderButton(host, {
            type: 'standard', theme: 'outline', size: 'large',
            text: isRegister ? 'signup_with' : 'signin_with',
            shape: 'rectangular', width, locale: 'vi', logo_alignment: 'left',
          })
          setReady(true)
        }
        render()
        observer = new ResizeObserver(render)
        observer.observe(host)
      } catch {
        failure.current = 'Không khởi tạo được đăng nhập Google. Vui lòng thử lại.'
        setReady(false)
      }
    }
    setup()
    return () => {
      disposed = true
      clearTimeout(timer)
      observer?.disconnect()
      host.replaceChildren()
    }
  }, [isRegister, attempt])

  return (
    <div className="google-btn-wrapper" data-highlighted={highlighted || undefined} aria-busy={loading}>
      <div
        ref={hostRef}
        className="google-sdk-button"
        data-ready={ready}
        inert={disabled || !ready}
        aria-hidden={disabled || !ready}
        style={{ visibility: ready && !disabled ? 'visible' : 'hidden' }}
      />
      {(!ready || disabled) && (
        <button
          type="button"
          className="google-button"
          disabled={disabled}
          onClick={() => {
            onError(failure.current || 'Dịch vụ Google chưa sẵn sàng. Vui lòng đợi một chút rồi thử lại.')
            setReady(false)
            setAttempt((value) => value + 1)
          }}
        >
          {loading ? <span className="button-spinner button-spinner--dark" aria-hidden="true" /> : <GoogleIcon size={18} />}
          {loading ? 'Đang xác thực Google…' : isRegister ? 'Đăng ký với Google' : 'Đăng nhập với Google'}
        </button>
      )}
    </div>
  )
}
