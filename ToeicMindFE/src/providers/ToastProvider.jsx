import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext } from './toastContext.js'

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())
  const seq = useRef(0)

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((message, kind = 'info', ms = 4000) => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, message, kind }])
    timers.current.set(id, setTimeout(() => dismiss(id), ms))
  }, [dismiss])

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((timer) => clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className="toast" data-kind={item.kind} role={item.kind === 'error' ? 'alert' : 'status'}>{item.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
