export function ApiNotice({ notice }) {
  if (!notice) return null
  return (
    <div className="admin-notice" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      {notice.text}
      {!!notice.details?.length && (
        <ul>
          {notice.details.map((detail, i) => (
            <li key={i}>{detail.message || String(detail)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
