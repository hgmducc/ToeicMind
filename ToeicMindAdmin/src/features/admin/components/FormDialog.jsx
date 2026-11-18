import { useEffect, useRef, useState } from 'react'

/**
 * Hộp thoại dùng chung (dialog native, cùng kiểu PublishCheckModal).
 * fields: [{ key, label, type: text|email|password|textarea|select, options: [[value,label]], required, maxLength }]
 * Không truyền fields => chỉ hiển thị nội dung (children) và nút Đóng.
 */
export function FormDialog({ title, fields = [], initial = {}, submitLabel = 'Lưu', busy, error, onSubmit, onClose, wide, children }) {
  const ref = useRef(null)
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? ''])))
  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    return () => d.open && d.close()
  }, [])
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))
  return (
    <dialog
      ref={ref}
      className="publish-dialog"
      style={wide ? { maxWidth: 'min(860px, 94vw)' } : undefined}
      aria-labelledby="form-dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => e.target === ref.current && !busy && onClose()}
    >
      <div className="modal-header">
        <h2 id="form-dialog-title">{title}</h2>
        <button type="button" className="modal-close-btn" disabled={busy} onClick={onClose} aria-label="Đóng">
          ×
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.(values)
        }}
      >
        {error && (
          <div className="admin-notice" data-kind="error" role="alert">
            {error}
          </div>
        )}
        {fields.map((f) => (
          <label key={f.key} className="dialog-field">
            {f.label}
            {f.type === 'textarea' ? (
              <textarea rows={4} required={f.required} disabled={f.disabled} maxLength={f.maxLength} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === 'select' ? (
              <select required={f.required} disabled={f.disabled} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type || 'text'}
                required={f.required}
                disabled={f.disabled}
                min={f.min}
                max={f.max}
                maxLength={f.maxLength}
                autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
        {children}
        <div className="admin-actions modal-actions">
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>
            {onSubmit ? 'Hủy' : 'Đóng'}
          </button>
          {onSubmit && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang lưu…' : submitLabel}
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
