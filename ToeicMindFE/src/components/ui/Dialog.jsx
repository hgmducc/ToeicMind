import { useEffect, useId, useRef } from 'react'
import { Icon } from './Icon.jsx'

let scrollLocks = 0

// Hộp thoại dùng <dialog> native: giữ focus, Escape và nền mờ theo trình duyệt.
// Không đóng được khi dismissible=false (đang gửi dữ liệu).
export function Dialog({ title, description, onClose, children, size = 'md', dismissible = true }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    scrollLocks++
    document.body.style.overflow = 'hidden'
    return () => {
      scrollLocks = Math.max(0, scrollLocks - 1)
      if (!scrollLocks) document.body.style.overflow = ''
      dialog.close()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); if (dismissible) onClose?.() }}
      onClick={(event) => { if (dismissible && event.target === event.currentTarget) onClose?.() }}
    >
      <div className="dialog-body">
        <header className="dialog-head">
          <div>
            <h2 className="dialog-title" id={titleId}>{title}</h2>
            {description && <p className="dialog-desc" id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose} disabled={!dismissible}><Icon name="x" size={18} /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
