import { Link } from 'react-router-dom'

export function Loading({ label = 'Đang tải…' }) {
  return <div className="state-box" role="status"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>
}

export function ErrorState({ error, onRetry, backTo, title = 'Không tải được nội dung' }) {
  return (
    <div className="state-box state-box--error" role="alert">
      <h2 className="state-title">{title}</h2>
      <p>{error?.message || 'Có lỗi xảy ra, vui lòng thử lại.'}</p>
      <div className="state-actions">
        {onRetry && <button type="button" className="btn btn-primary" onClick={onRetry}>Thử lại</button>}
        {backTo && <Link className="btn btn-outline" to={backTo}>Quay lại</Link>}
      </div>
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state-box">
      {title && <h2 className="state-title">{title}</h2>}
      {children && <p>{children}</p>}
      {action && <div className="state-actions">{action}</div>}
    </div>
  )
}

export function Notice({ kind = 'info', children, className = '' }) {
  return <p className={`form-notice ${className}`.trim()} data-kind={kind === 'info' ? undefined : kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}
