/**
 * Horizontal bar list.
 * data: [{ label, value, color?, sub? }]
 */
export default function BarList({ data, format = (v) => v, defaultColor = 'var(--primary)' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <span className="cell-strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.label}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color || defaultColor }} />
          </span>
          <b style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{format(d.value)}</b>
        </div>
      ))}
    </div>
  )
}
