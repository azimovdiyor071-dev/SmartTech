import { Building2, MapPin, Phone, Users, ShoppingCart, Trophy } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import { BRANCHES } from '../data/db.js'
import { getBranchComparison } from '../data/analytics.js'
import { money, number } from '../lib/format.js'
import { useT } from '../i18n/useI18n.js'
import { th } from '../i18n/labels.js'

export default function Branches() {
  const { t, lang } = useT()
  const stats = getBranchComparison()
  const maxRevenue = Math.max(...stats.map((s) => s.revenue), 1)

  return (
    <div className="page">
      <PageHeader title={t('branches')} subtitle={`${BRANCHES.length} ${t('branchesSub')}`} breadcrumb={[{ label: t('branches') }]} />
      <div className="grid grid-2">
        {stats.map((s, i) => {
          const branch = BRANCHES.find((b) => b.id === s.id)
          return (
            <div key={s.id} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span className="stat-icon" style={{ width: 46, height: 46, background: 'var(--primary-soft)', color: 'var(--primary)' }}><Building2 size={22} /></span>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{s.label}</h3>
                    <div className="cell-muted" style={{ fontSize: 12.5, display: 'flex', gap: 5, alignItems: 'center' }}><MapPin size={12} /> {branch?.address}, {s.city}</div>
                    <div className="cell-muted" style={{ fontSize: 12.5, display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}><Phone size={12} /> {branch?.phone}</div>
                  </div>
                </div>
                {i === 0 && <Badge variant="amber" dot={false}><Trophy size={12} /> {t('topBranch')}</Badge>}
              </div>

              <div className="divider" />

              <div className="grid grid-3" style={{ gap: 10, gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div><div className="cell-muted" style={{ fontSize: 11 }}><ShoppingCart size={11} /> {th(lang, 'orders')}</div><b style={{ fontSize: 16 }}>{number(s.orders)}</b></div>
                <div><div className="cell-muted" style={{ fontSize: 11 }}><Users size={11} /> {t('staffLabel')}</div><b style={{ fontSize: 16 }}>{number(s.employees)}</b></div>
                <div><div className="cell-muted" style={{ fontSize: 11 }}>{th(lang, 'revenue')}</div><b style={{ fontSize: 16 }}>{money(s.revenue)}</b></div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="cell-muted" style={{ fontSize: 11, marginBottom: 5 }}>{t('perfVsTop')}</div>
                <div className="progress"><div style={{ width: `${(s.revenue / maxRevenue) * 100}%` }} /></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
