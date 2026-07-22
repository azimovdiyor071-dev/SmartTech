import { ShoppingCart, CreditCard, AlertTriangle, ShieldAlert, Wrench, CheckCheck, Bell } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { timeAgo } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useNotifications, selectUnread } from '../stores/useNotifications.js'
import { useT } from '../i18n/useI18n.js'

const ICONS = {
  order: { icon: ShoppingCart, tone: ['var(--primary-soft)', 'var(--primary)'] },
  payment: { icon: CreditCard, tone: ['var(--success-soft)', 'var(--success)'] },
  stock: { icon: AlertTriangle, tone: ['var(--warning-soft)', 'var(--warning)'] },
  warranty: { icon: ShieldAlert, tone: ['var(--danger-soft)', 'var(--danger)'] },
  service: { icon: Wrench, tone: ['var(--info-soft)', 'var(--info)'] },
}

export default function Notifications() {
  const push = useToast((s) => s.push)
  const { t } = useT()
  const items = useNotifications((s) => s.items)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const markRead = useNotifications((s) => s.markRead)
  const unread = useNotifications(selectUnread)

  const markAll = () => { markAllRead(); push(t('allMarked'), 'success') }

  return (
    <div className="page">
      <PageHeader
        title={t('notifications')} subtitle={`${unread} ${t('notifSub')}`} breadcrumb={[{ label: t('notifications') }]}
        actions={<button className="btn btn-ghost" onClick={markAll}><CheckCheck size={16} /> {t('markAllRead')}</button>}
      />
      <div className="card">
        {items.length === 0 && <EmptyState icon={Bell} title={t('allCaught')} sub={t('noNotif')} />}
        {items.map((n, i) => {
          const cfg = ICONS[n.type] || ICONS.order
          const [bg, fg] = cfg.tone
          return (
            <div key={n.id} onClick={() => markRead(n.id)} style={{ display: 'flex', gap: 13, padding: '15px 18px', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', background: n.read ? 'transparent' : 'var(--surface-2)' }}>
              <span className="stat-icon" style={{ width: 40, height: 40, background: bg, color: fg, flex: 'none' }}><cfg.icon size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <b style={{ fontSize: 14 }}>{n.titleKey ? t(n.titleKey) : n.title}</b>
                  <span className="cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(n.time)}</span>
                </div>
                <div className="cell-muted" style={{ fontSize: 13, marginTop: 2 }}>{n.bodyKey ? t(n.bodyKey) : n.body}</div>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flex: 'none', marginTop: 6 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
