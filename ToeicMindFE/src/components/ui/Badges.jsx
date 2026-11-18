import { Icon } from './Icon.jsx'

// tone: default | success | danger | warning | muted | accent
export function Pill({ tone, children, title, className = '' }) {
  return <span className={`pill ${className}`.trim()} data-tone={tone} title={title}>{children}</span>
}

export function VipPill({ locked = true }) {
  if (!locked) return null
  return <Pill tone="warning" title="Cần tài khoản VIP"><Icon name="star" size={12} />VIP</Pill>
}

export function ProgressBar({ value, tone, label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  return (
    <div className="progress" data-tone={tone} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped} aria-label={label}>
      <i style={{ width: `${clamped}%` }} />
    </div>
  )
}
