/**
 * Donut chart (pure SVG).
 * data: [{ label, value, color }]
 */
export default function DonutChart({ data, size = 200, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r

  // Precompute each segment's dash length and starting offset (no mutation during render).
  const segments = data.map((d, i) => ({
    ...d,
    dash: (d.value / total) * circ,
    offset: data.slice(0, i).reduce((s, x) => s + (x.value / total) * circ, 0),
  }))

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {segments.map((d, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${d.dash} ${circ - d.dash}`}
            strokeDashoffset={-d.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        ))}
        {(centerValue || centerLabel) && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--text)">{centerValue}</text>
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{centerLabel}</text>
          </>
        )}
      </svg>
      <div style={{ flex: 1, minWidth: 160 }}>
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1)
          return (
            <div key={i} className="legend-item" style={{ justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span className="legend-swatch" style={{ background: d.color }} />
                {d.label}
              </span>
              <b style={{ color: 'var(--text)' }}>{pct}%</b>
            </div>
          )
        })}
      </div>
    </div>
  )
}
