import { useCallback, useRef, useState } from 'react'
import { Dialog } from '../components/ui/Dialog.jsx'
import { ConfirmContext } from './confirmContext.js'

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const pending = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    pending.current?.(false)
    pending.current = resolve
    setRequest(options)
  }), [])

  function settle(value) {
    pending.current?.(value)
    pending.current = null
    setRequest(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Dialog title={request.title || 'Xác nhận'} size="sm" onClose={() => settle(false)}>
          <div className="dialog-text">{request.message}</div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => settle(false)}>{request.cancelLabel || 'Hủy'}</button>
            <button type="button" className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => settle(true)}>{request.okLabel || 'Đồng ý'}</button>
          </div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  )
}
