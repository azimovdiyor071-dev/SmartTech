import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useT } from '../../i18n/useI18n.js'

export default function PageHeader({ title, subtitle, breadcrumb = [], actions }) {
  const { t } = useT()
  return (
    <div>
      {breadcrumb.length > 0 && (
        <nav className="breadcrumb">
          <Link to="/">{t('home')}</Link>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <ChevronRight size={13} />
              {b.to ? <Link to={b.to}>{b.label}</Link> : <span style={{ color: 'var(--text-2)' }}>{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        {actions && <div className="head-actions">{actions}</div>}
      </div>
    </div>
  )
}
