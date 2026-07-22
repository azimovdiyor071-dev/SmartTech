import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShoppingCart, Clock, CheckCircle2, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import { ORDER_STATUSES, PAYMENT_METHODS } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { useNotifications } from '../stores/useNotifications.js'
import { money, number, formatDate } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tStatus, tPayment } from '../i18n/labels.js'

const round2 = (n) => Math.round(n * 100) / 100

export default function Orders() {
  const navigate = useNavigate()
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const orders = useCrmData((s) => s.orders)
  const customers = useCrmData((s) => s.customers)
  const products = useCrmData((s) => s.products)
  const createOrder = useCrmData((s) => s.createOrder)
  const addNotification = useNotifications((s) => s.addNotification)

  const [status, setStatus] = useState('All')
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([]) // [{productId, qty}]
  const [pick, setPick] = useState('')
  const [qty, setQty] = useState(1)
  const [discountPct, setDiscountPct] = useState(0)
  const [method, setMethod] = useState('Cash')
  const [payStatus, setPayStatus] = useState('Pending')
  const [err, setErr] = useState('')

  const rows = useMemo(
    () => (status === 'All' ? orders : orders.filter((o) => o.status === status)),
    [status, orders],
  )

  const revenue = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded').reduce((s, o) => s + o.total, 0)
  const pending = orders.filter((o) => ['New', 'Confirmed', 'Preparing', 'Ready'].includes(o.status)).length
  const delivered = orders.filter((o) => o.status === 'Delivered').length

  // live totals for the create form
  const lineItems = items.map((it) => {
    const p = products.find((x) => x.id === it.productId)
    return { ...it, name: p?.name, price: p?.price || 0, total: round2((p?.price || 0) * it.qty) }
  })
  const subtotal = round2(lineItems.reduce((s, it) => s + it.total, 0))
  const discount = round2(subtotal * (Number(discountPct) / 100))
  const tax = round2((subtotal - discount) * 0.12)
  const total = round2(subtotal - discount + tax)

  const reset = () => { setCustomerId(''); setItems([]); setPick(''); setQty(1); setDiscountPct(0); setMethod('Cash'); setPayStatus('Pending'); setErr('') }
  const openNew = () => { reset(); setCustomerId(customers[0]?.id || ''); setOpen(true) }

  const addItem = () => {
    if (!pick) return
    setItems((list) => {
      const found = list.find((i) => i.productId === pick)
      if (found) return list.map((i) => (i.productId === pick ? { ...i, qty: i.qty + Number(qty) } : i))
      return [...list, { productId: pick, qty: Number(qty) || 1 }]
    })
    setPick(''); setQty(1)
  }
  const removeItem = (id) => setItems((list) => list.filter((i) => i.productId !== id))

  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!customerId) { setErr(t('selectCustomer')); return }
    if (items.length === 0) { setErr(t('noItemsYet')); return }
    setSaving(true)
    try {
      const order = await createOrder({ customerId, items, discountPct, paymentMethod: method, paymentStatus: payStatus })
      addNotification({ type: 'order', titleKey: 'notif.newOrder', body: `${order.id} · ${order.customerName} · ${money(order.total)}` })
      if (payStatus === 'Paid') addNotification({ type: 'payment', titleKey: 'notif.payment', body: `${order.id} · ${money(order.total)} · ${tPayment(lang, method)}` })
      push(`${t('orderCreated')}: ${order.id}`, 'success')
      setOpen(false)
      navigate(`/orders/${order.id}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', header: th(lang, 'order'), sortable: true, render: (o) => <b>{o.id}</b> },
    { key: 'customerName', header: th(lang, 'customer'), sortable: true },
    { key: 'items', header: th(lang, 'items'), align: 'right', render: (o) => number(o.items.reduce((s, i) => s + i.qty, 0)) },
    { key: 'total', header: th(lang, 'total'), sortable: true, align: 'right', render: (o) => <b>{money(o.total)}</b> },
    { key: 'paymentStatus', header: th(lang, 'payment'), sortable: true, render: (o) => <Badge status={o.paymentStatus} /> },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (o) => <Badge status={o.status} /> },
    { key: 'createdAt', header: th(lang, 'date'), sortable: true, render: (o) => formatDate(o.createdAt) },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('orders')}
        subtitle={`${number(orders.length)} ${t('orders').toLowerCase()} · ${money(revenue)} ${t('ordersRevenue')}`}
        breadcrumb={[{ label: t('orders') }]}
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> {t('createOrder')}</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalOrders')} value={number(orders.length)} icon={ShoppingCart} tone="indigo" />
        <StatCard label={t('pendingStat')} value={number(pending)} icon={Clock} tone="amber" />
        <StatCard label={t('deliveredStat')} value={number(delivered)} icon={CheckCircle2} tone="green" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['id', 'customerName']}
        searchPlaceholder={t('searchOrderCust')}
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        filters={
          <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">{t('allStatuses')}</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{tStatus(lang, s)}</option>)}
          </select>
        }
      />

      <Drawer
        open={open}
        title={t('newOrder')}
        onClose={() => setOpen(false)}
        footer={<button className="btn btn-primary" style={{ width: '100%' }} onClick={submit} disabled={saving}>{t('createOrder')} · {money(total)}</button>}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="field"><label>{t('customerCard')} *</label>
            <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t('selectCustomer')}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{t('orderItems')}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <select className="select" value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
                <option value="">{th(lang, 'product')}…</option>
                {products.filter((p) => p.stock > 0).map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)} ({p.stock})</option>)}
              </select>
              <input className="input" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 64 }} />
              <button className="btn btn-ghost" onClick={addItem}><Plus size={15} /></button>
            </div>
          </div>

          {lineItems.length === 0 && <p className="cell-muted" style={{ fontSize: 13 }}>{t('noItemsYet')}</p>}
          {lineItems.map((it) => (
            <div key={it.productId} className="kv" style={{ alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{it.name} <span className="cell-muted">×{it.qty}</span></span>
              <b style={{ marginRight: 10 }}>{money(it.total)}</b>
              <button className="page-btn" onClick={() => removeItem(it.productId)}><Trash2 size={13} /></button>
            </div>
          ))}

          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>{t('discountPct')}</label><input className="input" type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></div>
            <div className="field"><label>{th(lang, 'method')}</label>
              <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{tPayment(lang, m)}</option>)}
              </select>
            </div>
            <div className="field"><label>{t('paymentStatusLabel')}</label>
              <select className="select" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                {['Pending', 'Paid', 'Partial'].map((s) => <option key={s} value={s}>{tStatus(lang, s)}</option>)}
              </select>
            </div>
          </div>

          <div className="card card-pad" style={{ display: 'grid', gap: 4 }}>
            <div className="kv"><span>{t('subtotal')}</span><b>{money(subtotal)}</b></div>
            <div className="kv"><span>{t('discount')}</span><b style={{ color: 'var(--success)' }}>-{money(discount)}</b></div>
            <div className="kv"><span>{t('taxLabel')}</span><b>{money(tax)}</b></div>
            <div className="kv" style={{ fontSize: 15 }}><span style={{ color: 'var(--text)', fontWeight: 700 }}>{t('total')}</span><b>{money(total)}</b></div>
          </div>

          {err && <span className="err-text">{err}</span>}
        </div>
      </Drawer>
    </div>
  )
}
