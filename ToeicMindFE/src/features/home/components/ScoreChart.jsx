import { formatDateTime } from '../../../lib/format.js'

// Đường điểm TOEIC tự vẽ bằng SVG (không dùng thư viện đồ thị).
export function ScoreChart({ points }) {
  const data = points.filter((p) => p.totalScaled != null).slice(0, 20).reverse()
  if (data.length < 2) return <p className="muted small">Cần ít nhất 2 bài Luyện thi có điểm để vẽ biểu đồ.</p>
  const W = 520, H = 170, L = 38, R = 12, T = 12, B = 26
  const values = data.map((p) => p.totalScaled)
  const min = Math.max(0, Math.floor(Math.min(...values) / 50) * 50 - 50)
  const max = Math.min(990, Math.ceil(Math.max(...values) / 50) * 50 + 50)
  const x = (i) => L + (i * (W - L - R)) / (data.length - 1)
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min || 1)
  const ticks = [min, (min + max) / 2, max]
  return (
    <svg className="score-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Đường điểm TOEIC của ${data.length} bài gần nhất, từ ${values[0]} đến ${values[values.length - 1]} điểm`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="chart-grid" x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} />
          <text className="chart-tick" x={L - 6} y={y(tick) + 4} textAnchor="end">{Math.round(tick)}</text>
        </g>
      ))}
      <path className="chart-line" d={data.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.totalScaled)}`).join(' ')} />
      {data.map((p, i) => (
        <circle key={i} className="chart-dot" cx={x(i)} cy={y(p.totalScaled)} r="4">
          <title>{`${p.examTitle || ''} · ${p.totalScaled} điểm · ${formatDateTime(p.submittedAt)}`}</title>
        </circle>
      ))}
    </svg>
  )
}
