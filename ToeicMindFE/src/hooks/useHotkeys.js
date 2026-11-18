import { useEffect, useRef } from 'react'

// Phím tắt toàn trang. Bỏ qua khi đang gõ trong ô nhập; luôn gọi bản handler mới nhất mà không đăng ký lại sự kiện.
export function useHotkeys(handler, enabled = true) {
  const latest = useRef(handler)
  useEffect(() => { latest.current = handler })
  useEffect(() => {
    if (!enabled) return undefined
    function onKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      latest.current(event)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
