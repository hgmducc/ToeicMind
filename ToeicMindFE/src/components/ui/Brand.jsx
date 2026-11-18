export function Brand({ admin = false }) {
  return (
    <div className="brand" aria-label={`ToeicMind${admin ? ' Admin' : ''}`}>
      <span className="brand-symbol" aria-hidden="true">
        <svg width="27" height="27" viewBox="0 0 28 28" fill="none"><path d="M5 7c4-1 7 1 9 4 2-3 5-5 9-4v14c-4-1-7 0-9 3-2-3-5-4-9-3V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 11v13M9 4l2 2m8-2-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </span>
      <span className="brand-wordmark">toeic<span>mind</span><span className="brand-dot">.</span></span>
      {admin && <span className="brand-badge">ADMIN</span>}
    </div>
  )
}
