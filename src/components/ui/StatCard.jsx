import { TrendingUp, TrendingDown } from 'lucide-react'
import { percent } from '../../lib/format.js'

const TONES = {
  indigo: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  green: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  amber: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  red: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  blue: { bg: 'var(--info-soft)', fg: 'var(--info)' },
  violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
}

export default function StatCard({ label, value, change, hint, icon: Icon, tone = 'indigo', invertTrend = false }) {
  const t = TONES[tone] || TONES.indigo
  const hasTrend = typeof change === 'number'
  let up = change >= 0
  if (invertTrend) up = !up // for expenses/refunds, up is bad
  const good = invertTrend ? change <= 0 : change >= 0

  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon" style={{ background: t.bg, color: t.fg }}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        {hasTrend && (
          <span className={`trend ${good ? 'up' : 'down'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {percent(change)}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  )
}
