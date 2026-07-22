import { useId, useState } from 'react'

/**
 * Lightweight responsive multi-line/area chart (pure SVG).
 * series: [{ name, color, data: number[] }]
 * labels: string[]  (same length as data)
 */
export default function LineChart({ series, labels = [], height = 240, formatY = (v) => v }) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState(null)
  const W = 760
  const H = height
  const padL = 52
  const padR = 16
  const padT = 16
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const all = series.flatMap((s) => s.data)
  const max = Math.max(...all, 1)
  const min = Math.min(...all, 0)
  const range = max - min || 1
  const n = labels.length || series[0]?.data.length || 1

  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => padT + innerH - ((v - min) / range) * innerH

  const gridLines = 4
  const linePath = (data) => data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const areaPath = (data) => `${linePath(data)} L ${x(data.length - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((rel - padL) / innerW) * (n - 1))
    if (i >= 0 && i < n) setHover(i)
  }

  const tickEvery = Math.ceil(n / 8)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`grad-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const gy = padT + (i / gridLines) * innerH
          const val = max - (i / gridLines) * range
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 8} y={gy + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{formatY(Math.round(val))}</text>
            </g>
          )
        })}

        {series.map((s, si) => (
          <g key={si}>
            <path d={areaPath(s.data)} fill={`url(#grad-${uid}-${si})`} />
            <path d={linePath(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}

        {labels.map((lab, i) => (
          i % tickEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{lab}</text>
          ) : null
        ))}

        {hover != null && (
          <g>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
            {series.map((s, si) => (
              <circle key={si} cx={x(hover)} cy={y(s.data[hover])} r="4" fill="var(--surface)" stroke={s.color} strokeWidth="2.5" />
            ))}
          </g>
        )}
      </svg>

      <div className="chart-legend">
        {series.map((s, si) => (
          <span key={si} className="legend-item">
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.name}
            {hover != null && <b style={{ color: 'var(--text)', marginLeft: 4 }}>{formatY(s.data[hover])}</b>}
          </span>
        ))}
        {hover != null && labels[hover] && <span className="legend-item" style={{ marginLeft: 'auto' }}>{labels[hover]}</span>}
      </div>
    </div>
  )
}
