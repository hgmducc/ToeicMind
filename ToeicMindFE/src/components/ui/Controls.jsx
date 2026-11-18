import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'

export function ChipLink({ to, active, tone, children }) {
  return <Link className="chip" to={to} data-active={active ? 'true' : 'false'} data-tone={tone} aria-current={active ? 'true' : undefined}>{children}</Link>
}

export function Chip({ active, onClick, children, disabled, title }) {
  return <button type="button" className="chip" data-active={active ? 'true' : 'false'} aria-pressed={!!active} onClick={onClick} disabled={disabled} title={title}>{children}</button>
}

// Thanh tab dạng viên thuốc, mỗi tab là một liên kết (trạng thái nằm trên URL).
export function SegTabs({ items, label }) {
  return (
    <nav className="seg-tabs" aria-label={label}>
      {items.map((item) => (
        <Link key={item.key ?? item.to} to={item.to} className="seg-tab" data-active={item.active ? 'true' : 'false'} aria-current={item.active ? 'page' : undefined}>{item.label}</Link>
      ))}
    </nav>
  )
}

export function Pagination({ page, pageSize, total, linkFor, unit = 'mục' }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)))
  if (pages <= 1) return <p className="muted pager-note">{total} {unit}</p>
  const step = (target, label, icon, disabled) => (disabled
    ? <span className="btn btn-outline btn-sm" aria-disabled="true">{label}</span>
    : <Link className="btn btn-outline btn-sm" to={linkFor(target)}>{label}</Link>)
  return (
    <nav className="pager" aria-label="Phân trang">
      {step(page - 1, <><Icon name="chevron-left" size={14} />Trước</>, null, page <= 1)}
      <span className="muted">Trang {page}/{pages} · {total} {unit}</span>
      {step(page + 1, <>Sau<Icon name="chevron-right" size={14} /></>, null, page >= pages)}
    </nav>
  )
}

export function PageHero({ icon, eyebrow, title, children }) {
  return (
    <section className="page-hero">
      <div className="page-hero-text">
        {eyebrow && <p className="eyebrow"><Icon name={icon || 'sparkles'} size={14} />{eyebrow}</p>}
        <h1 className="page-hero-title">{title}</h1>
        {children && <p className="page-hero-desc">{children}</p>}
      </div>
      <span className="page-hero-icon" aria-hidden="true"><Icon name={icon || 'sparkles'} size={40} /></span>
    </section>
  )
}
