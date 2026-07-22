import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingCart, UserPlus, PiggyBank, Receipt, AlertTriangle,
  Download, ClipboardList, CreditCard, Truck, ShieldAlert, ChevronRight, Package,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Badge from '../components/ui/Badge.jsx'
import LineChart from '../components/charts/LineChart.jsx'
import { getKpis, getRevenueSeries, getTaskCounts } from '../data/analytics.js'
import { DAILY } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, compactMoney, number } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useAuth } from '../stores/useAuth.js'
import { useT } from '../i18n/useI18n.js'

export default function Dashboard() {
  const { t } = useT()
  const user = useAuth((s) => s.user)
  const push = useToast((s) => s.push)

  const orders = useCrmData((s) => s.orders)
  const products = useCrmData((s) => s.products)

  const k = getKpis()
  const today = DAILY[DAILY.length - 1]
  const series = getRevenueSeries(30)
  const lowStock = products.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock)

  // Today's tasks (order/payment counts from live data; delivery/warranty from seed)
  const taskCounts = getTaskCounts()
  const newOrders = orders.filter((o) => o.status === 'New').length
  const pendingPay = orders.filter((o) => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled').length
  const recentOrders = orders.slice(0, 5)

  const tasks = [
    { icon: ClipboardList, tone: ['var(--primary-soft)', 'var(--primary)'], label: t('taskNewOrders'), count: newOrders, to: '/orders' },
    { icon: CreditCard, tone: ['var(--warning-soft)', 'var(--warning)'], label: t('taskPendingPay'), count: pendingPay, to: '/payments' },
    { icon: Truck, tone: ['var(--info-soft)', 'var(--info)'], label: t('taskDeliveries'), count: taskCounts.inTransit, to: '/delivery' },
    { icon: ShieldAlert, tone: ['var(--danger-soft)', 'var(--danger)'], label: t('taskWarranty'), count: taskCounts.warrantySoon, to: '/warranty' },
  ]

  return (
    <div className="page">
      <PageHeader
        title={`${t('dash.welcome')}, ${user?.name?.split(' ')[0] || ''} 👋`}
        subtitle={t('dash.subtitle')}
        actions={
          <>
            <span className="badge indigo" style={{ padding: '7px 12px' }}>{t('last30')}</span>
            <button className="btn btn-ghost" onClick={() => push(t('reportExported'), 'success')}>
              <Download size={16} /> {t('export')}
            </button>
          </>
        }
      />

      {/* KPI row — 6 cards */}
      <div className="grid grid-kpi">
        <StatCard label={t('todaysSales')} value={money(k.daily.value)} change={k.daily.change} hint={t('vsYesterday')} icon={DollarSign} tone="indigo" />
        <StatCard label={t('todaysOrders')} value={number(today.orders)} hint={t('vsYesterday')} icon={ShoppingCart} tone="blue" />
        <StatCard label={t('newCustomers')} value={number(k.newCustomers)} hint="30d" icon={UserPlus} tone="green" />
        <StatCard label={t('netProfit')} value={money(k.profit.value)} change={k.profit.change} hint={t('vsLastMonth')} icon={PiggyBank} tone="violet" />
        <StatCard label={t('expenses')} value={money(k.expenses.value)} change={k.expenses.change} hint={t('vsLastMonth')} icon={Receipt} tone="amber" invertTrend />
        <StatCard label={t('lowStockKpi')} value={number(lowStock.length)} hint={t('needRestock')} icon={AlertTriangle} tone="red" />
      </div>

      {/* Sales chart */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>{t('salesChart')}</h3>
          <span className="muted">{money(k.monthly.value)}</span>
        </div>
        <div className="card-pad">
          <LineChart
            labels={series.map((s) => s.label)}
            formatY={(v) => compactMoney(v)}
            series={[{ name: t('todaysSales'), color: '#4f46e5', data: series.map((s) => s.revenue) }]}
          />
        </div>
      </div>

      {/* Tasks + Recent orders + Low stock */}
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {/* Today's Tasks */}
        <div className="card">
          <div className="card-head"><h3>{t('dashTasks')}</h3></div>
          <div className="card-pad" style={{ display: 'grid', gap: 8 }}>
            {tasks.map((task) => (
              <Link key={task.label} to={task.to} className="task-row">
                <span className="stat-icon" style={{ width: 34, height: 34, background: task.tone[0], color: task.tone[1] }}>
                  <task.icon size={16} />
                </span>
                <span style={{ flex: 1 }}>{task.label}</span>
                <b style={{ fontSize: 15 }}>{task.count}</b>
                <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-head">
            <h3>{t('recentOrders')}</h3>
            <Link to="/orders" className="muted" style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>{t('viewAll')} <ChevronRight size={13} /></Link>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
            {recentOrders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="mini-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-strong">{o.id}</div>
                  <div className="cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.customerName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ fontSize: 13 }}>{money(o.total)}</b>
                  <div style={{ marginTop: 2 }}><Badge status={o.status} dot={false} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-head">
            <h3>{t('lowStockTitle')}</h3>
            <Badge variant="red" dot={false}>{lowStock.length}</Badge>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
            {lowStock.slice(0, 5).map((p) => (
              <div key={p.id} className="mini-row">
                <span className="thumb" style={{ width: 32, height: 32 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div className="cell-muted" style={{ fontSize: 12 }}>{p.sku}</div>
                </div>
                <Badge status={p.stock === 0 ? 'Out of stock' : 'Low stock'} dot={false}>{p.stock}</Badge>
              </div>
            ))}
            <Link to="/inventory" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }}>
              <Package size={14} /> {t('inventory')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
