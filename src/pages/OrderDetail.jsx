import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Download, CreditCard, Truck, User, Building2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { ORDER_STATUSES, BRANCHES } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, formatDate } from '../lib/format.js'
import { openPrintWindow, invoiceHtml } from '../lib/exporters.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tStatus, tPayment } from '../i18n/labels.js'

const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || '—'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const order = useCrmData((s) => s.orders.find((o) => o.id === id))

  const exportInvoice = () => {
    const L = {
      invoice: th(lang, 'invoice'), customer: th(lang, 'customer'), payment: th(lang, 'payment'),
      product: th(lang, 'product'), price: th(lang, 'price'), qty: t('quantity'), total: th(lang, 'total'),
      subtotal: t('subtotal'), discount: t('discount'), tax: t('taxLabel'), thanks: t('invoiceThanks'),
    }
    const ok = openPrintWindow(`${th(lang, 'invoice')} ${order.id}`, invoiceHtml(order, { money, formatDate, L }))
    if (!ok) push(t('popupBlocked'), 'error')
  }

  if (!order) {
    return (
      <div className="page">
        <PageHeader title={t('orderNotFound')} breadcrumb={[{ label: t('orders'), to: '/orders' }, { label: id }]} />
        <div className="card"><EmptyState title={t('orderNotExist')} sub={t('orderRemoved')} /></div>
      </div>
    )
  }

  const currentStep = ORDER_STATUSES.indexOf(order.status)

  return (
    <div className="page">
      <PageHeader
        title={`${th(lang, 'order')} ${order.id}`}
        subtitle={`${t('orderPlaced')} ${formatDate(order.createdAt, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
        breadcrumb={[{ label: t('orders'), to: '/orders' }, { label: order.id }]}
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> {t('back')}</button>
            <button className="btn btn-ghost" onClick={exportInvoice}><Printer size={16} /> {t('print')}</button>
            <button className="btn btn-primary" onClick={exportInvoice}><Download size={16} /> {t('invoicePdf')}</button>
          </>
        }
      />

      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {ORDER_STATUSES.slice(0, 6).map((s, i) => {
          const done = i <= currentStep && currentStep < 6
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge" style={{ background: done ? 'var(--primary)' : 'var(--surface-3)', color: done ? '#fff' : 'var(--text-muted)' }}>{i + 1}. {tStatus(lang, s)}</span>
              {i < 5 && <span style={{ width: 18, height: 2, background: 'var(--border-strong)' }} />}
            </div>
          )
        })}
        {['Cancelled', 'Refunded'].includes(order.status) && <Badge status={order.status} />}
      </div>

      <div className="grid grid-2" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <div className="card">
          <div className="card-head"><h3>{t('itemsWord')} ({order.items.length})</h3><Badge status={order.status} /></div>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data">
              <thead><tr><th>{th(lang, 'product')}</th><th style={{ textAlign: 'right' }}>{th(lang, 'price')}</th><th style={{ textAlign: 'right' }}>{th(lang, 'items')}</th><th style={{ textAlign: 'right' }}>{th(lang, 'total')}</th></tr></thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i}>
                    <td className="cell-strong">{it.name}</td>
                    <td style={{ textAlign: 'right' }}>{money(it.price)}</td>
                    <td style={{ textAlign: 'right' }}>{it.qty}</td>
                    <td style={{ textAlign: 'right' }}><b>{money(it.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 4, maxWidth: 320, marginLeft: 'auto', width: '100%' }}>
            <div className="kv"><span>{t('subtotal')}</span><b>{money(order.subtotal)}</b></div>
            <div className="kv"><span>{t('discount')}</span><b style={{ color: 'var(--success)' }}>-{money(order.discount)}</b></div>
            <div className="kv"><span>{t('taxLabel')}</span><b>{money(order.tax)}</b></div>
            <div className="kv" style={{ fontSize: 16 }}><span style={{ color: 'var(--text)', fontWeight: 700 }}>{t('total')}</span><b>{money(order.total)}</b></div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card card-pad">
            <h4 style={{ fontSize: 14, marginBottom: 10, display: 'flex', gap: 7, alignItems: 'center' }}><User size={15} /> {t('customerCard')}</h4>
            <div className="kv"><span>{th(lang, 'name')}</span><Link to="/customers" style={{ color: 'var(--primary)', fontWeight: 600 }}>{order.customerName}</Link></div>
            <div className="kv"><span>{t('salesRep')}</span><b>{order.repName}</b></div>
            <div className="kv"><span><Building2 size={13} /> {th(lang, 'branch')}</span><b>{branchName(order.branch)}</b></div>
          </div>
          <div className="card card-pad">
            <h4 style={{ fontSize: 14, marginBottom: 10, display: 'flex', gap: 7, alignItems: 'center' }}><CreditCard size={15} /> {th(lang, 'payment')}</h4>
            <div className="kv"><span>{th(lang, 'method')}</span><b>{tPayment(lang, order.paymentMethod)}</b></div>
            <div className="kv"><span>{th(lang, 'status')}</span><Badge status={order.paymentStatus} /></div>
          </div>
          <div className="card card-pad">
            <h4 style={{ fontSize: 14, marginBottom: 10, display: 'flex', gap: 7, alignItems: 'center' }}><Truck size={15} /> {t('deliveryCard')}</h4>
            <div className="kv"><span>{th(lang, 'status')}</span><Badge status={order.deliveryStatus} /></div>
            <div className="kv"><span>{t('orderDate')}</span><b>{formatDate(order.createdAt)}</b></div>
          </div>
        </div>
      </div>
    </div>
  )
}
