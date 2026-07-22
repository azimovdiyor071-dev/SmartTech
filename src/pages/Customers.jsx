import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { UserPlus, Star, MapPin, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { BRANCHES } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number, initials, colorFrom, formatDate } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tStatus } from '../i18n/labels.js'

const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || '—'
const SEGMENTS = ['All', 'VIP', 'Regular', 'New', 'At risk']
const EMPTY = { name: '', email: '', phone: '', city: '', segment: 'New' }

export default function Customers() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const customers = useCrmData((s) => s.customers)
  const orders = useCrmData((s) => s.orders)
  const addCustomer = useCrmData((s) => s.addCustomer)
  const updateCustomer = useCrmData((s) => s.updateCustomer)
  const deleteCustomer = useCrmData((s) => s.deleteCustomer)

  const [segment, setSegment] = useState('All')
  const [editing, setEditing] = useState(null) // 'new' | customer | null
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  const rows = useMemo(
    () => (segment === 'All' ? customers : customers.filter((c) => c.segment === segment)),
    [segment, customers],
  )

  const vipCount = customers.filter((c) => c.segment === 'VIP').length
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0)

  const openNew = () => { setForm(EMPTY); setErr(''); setEditing('new') }
  const openEdit = (c) => { setForm({ name: c.name, email: c.email, phone: c.phone, city: c.city, segment: c.segment }); setErr(''); setEditing(c) }
  const close = () => setEditing(null)

  // Open a specific customer when arriving from global search.
  const location = useLocation()
  useEffect(() => {
    const id = location.state?.openId
    if (!id) return
    const c = customers.find((x) => x.id === id)
    window.history.replaceState({}, '')
    if (c) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openEdit(c)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setErr(t('nameReq')); return }
    try {
      if (editing === 'new') { await addCustomer(form); push(t('created'), 'success') }
      else { await updateCustomer(editing.id, form); push(t('updated'), 'success') }
      close()
    } catch (e) { setErr(e.message) }
  }
  const remove = async () => {
    if (editing === 'new') return
    if (!window.confirm(t('confirmDelete'))) return
    try { await deleteCustomer(editing.id); push(t('deleted'), 'info'); close() } catch (e) { push(e.message, 'error') }
  }

  const columns = [
    {
      key: 'name', header: th(lang, 'customer'), sortable: true,
      render: (c) => (
        <div className="cell-media">
          <span className="avatar" style={{ background: colorFrom(c.name) }}>{initials(c.name)}</span>
          <div>
            <div className="cell-strong">{c.name}</div>
            <div className="cell-muted" style={{ fontSize: 12 }}>{c.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'city', header: th(lang, 'city'), sortable: true },
    { key: 'segment', header: th(lang, 'segment'), sortable: true, render: (c) => <Badge status={c.segment} /> },
    { key: 'orders', header: th(lang, 'orders'), sortable: true, align: 'right', render: (c) => number(c.orders) },
    { key: 'totalSpent', header: th(lang, 'totalSpent'), sortable: true, align: 'right', render: (c) => <b>{money(c.totalSpent)}</b> },
    { key: 'loyaltyPoints', header: th(lang, 'loyalty'), sortable: true, align: 'right', render: (c) => <span className="badge amber" style={{ gap: 4 }}><Star size={11} /> {number(c.loyaltyPoints)}</span> },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (c) => <Badge status={c.status} /> },
  ]

  const custOrders = editing && editing !== 'new' ? orders.filter((o) => o.customerId === editing.id) : []

  return (
    <div className="page">
      <PageHeader
        title={t('customers')}
        subtitle={`${number(customers.length)} ${t('customersLower')} · ${money(totalSpent)} ${t('lifetimeValue')}`}
        breadcrumb={[{ label: t('customers') }]}
        actions={<button className="btn btn-primary" onClick={openNew}><UserPlus size={16} /> {t('addCustomer')}</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('customers')} value={number(customers.length)} icon={UserPlus} tone="indigo" />
        <StatCard label={t('vipCustomers')} value={number(vipCount)} icon={Star} tone="violet" />
        <StatCard label={t('lifetimeValue')} value={money(totalSpent)} icon={Star} tone="green" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['name', 'email', 'phone', 'city']}
        searchPlaceholder={t('searchGeneric')}
        onRowClick={openEdit}
        filters={
          <select className="select" style={{ width: 'auto' }} value={segment} onChange={(e) => setSegment(e.target.value)}>
            {SEGMENTS.map((s) => <option key={s} value={s}>{s === 'All' ? t('allSegments') : tStatus(lang, s)}</option>)}
          </select>
        }
      />

      <Drawer
        open={!!editing}
        title={editing === 'new' ? t('addCustomer') : t('editCustomer')}
        onClose={close}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>{editing === 'new' ? t('save') : t('saveChanges')}</button>
            {editing !== 'new' && <button className="btn btn-ghost" onClick={remove} style={{ color: 'var(--danger)' }}><Trash2 size={15} /> {t('deleteWord')}</button>}
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {editing && editing !== 'new' && (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="avatar" style={{ width: 52, height: 52, fontSize: 17, background: colorFrom(form.name || '?') }}>{initials(form.name || '?')}</span>
              <div style={{ display: 'flex', gap: 8 }}><Badge status={editing.status} /></div>
            </div>
          )}

          <div className="field"><label>{th(lang, 'name')} *</label><input className={`input${err ? ' input-err' : ''}`} value={form.name} onChange={set('name')} autoFocus /></div>
          {err && <span className="err-text">{err}</span>}
          <div className="field"><label>{t('emailLabel')}</label><input className="input" value={form.email} onChange={set('email')} placeholder="name@mail.uz" /></div>
          <div className="field"><label>{th(lang, 'phone')}</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" /></div>
          <div className="field"><label>{th(lang, 'city')}</label><input className="input" value={form.city} onChange={set('city')} /></div>
          <div className="field"><label>{th(lang, 'segment')}</label>
            <select className="select" value={form.segment} onChange={set('segment')}>
              {['New', 'Regular', 'VIP', 'At risk'].map((s) => <option key={s} value={s}>{tStatus(lang, s)}</option>)}
            </select>
          </div>

          {editing && editing !== 'new' && (
            <>
              <div className="grid grid-3" style={{ gap: 10 }}>
                <div className="card card-pad" style={{ textAlign: 'center' }}><div className="stat-value" style={{ fontSize: 17 }}>{money(editing.totalSpent)}</div><div className="cell-muted" style={{ fontSize: 11 }}>{th(lang, 'totalSpent')}</div></div>
                <div className="card card-pad" style={{ textAlign: 'center' }}><div className="stat-value" style={{ fontSize: 17 }}>{editing.orders}</div><div className="cell-muted" style={{ fontSize: 11 }}>{th(lang, 'orders')}</div></div>
                <div className="card card-pad" style={{ textAlign: 'center' }}><div className="stat-value" style={{ fontSize: 17 }}>{number(editing.loyaltyPoints)}</div><div className="cell-muted" style={{ fontSize: 11 }}>{th(lang, 'loyalty')}</div></div>
              </div>
              <div className="kv"><span><MapPin size={13} /> {th(lang, 'branch')}</span><b>{branchName(editing.branch)}</b></div>
              <div className="kv"><span>{t('joinedField')}</span><b>{formatDate(editing.joined)}</b></div>
              <div>
                <h4 style={{ fontSize: 14, margin: '4px 0 8px' }}>{t('purchaseHistory')} ({custOrders.length})</h4>
                {custOrders.length === 0 && <p className="cell-muted">{t('noOrdersYet')}</p>}
                {custOrders.slice(0, 6).map((o) => (
                  <div key={o.id} className="kv">
                    <span>{o.id} · {formatDate(o.createdAt)}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Badge status={o.status} dot={false} /> <b>{money(o.total)}</b></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </div>
  )
}
