import { useMemo, useState } from 'react'
import { CreditCard, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { PAYMENT_METHODS } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number, formatDate } from '../lib/format.js'
import { useT } from '../i18n/useI18n.js'
import { th, tPayment } from '../i18n/labels.js'

export default function Payments() {
  const { t, lang } = useT()
  const orders = useCrmData((s) => s.orders)
  const [method, setMethod] = useState('All')

  // Payments derive from orders that have been (partly) paid or refunded.
  const payments = useMemo(() => orders
    .filter((o) => o.paymentStatus !== 'Pending')
    .map((o) => ({
      id: `PAY-${o.id.replace(/\D/g, '')}`,
      orderId: o.id,
      customerName: o.customerName,
      method: o.paymentMethod,
      amount: o.paymentStatus === 'Partial' ? Math.round(o.total * 50) / 100 : o.total,
      status: o.paymentStatus,
      date: o.createdAt,
    })), [orders])

  const rows = useMemo(() => (method === 'All' ? payments : payments.filter((p) => p.method === method)), [method, payments])

  const total = payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)
  const partial = payments.filter((p) => p.status === 'Partial').length
  const refunds = payments.filter((p) => p.status === 'Refunded').length

  const columns = [
    { key: 'id', header: th(lang, 'payment'), sortable: true, render: (p) => <b>{p.id}</b> },
    { key: 'orderId', header: th(lang, 'order'), sortable: true },
    { key: 'customerName', header: th(lang, 'customer'), sortable: true },
    { key: 'method', header: th(lang, 'method'), sortable: true, render: (p) => <span className="badge indigo" style={{ fontWeight: 600 }}><CreditCard size={11} /> {tPayment(lang, p.method)}</span> },
    { key: 'amount', header: th(lang, 'amount'), sortable: true, align: 'right', render: (p) => <b>{money(p.amount)}</b> },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (p) => <Badge status={p.status} /> },
    { key: 'date', header: th(lang, 'date'), sortable: true, render: (p) => formatDate(p.date) },
  ]

  return (
    <div className="page">
      <PageHeader title={t('payments')} subtitle={`${number(payments.length)} ${t('paymentsSub')}`} breadcrumb={[{ label: t('payments') }]} />
      <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalCollected')} value={money(total)} icon={CheckCircle2} tone="green" />
        <StatCard label={t('transactionsStat')} value={number(payments.length)} icon={CreditCard} tone="indigo" />
        <StatCard label={t('partialPayments')} value={number(partial)} icon={Clock} tone="amber" />
        <StatCard label={t('refundsStat')} value={number(refunds)} icon={RotateCcw} tone="red" />
      </div>
      <DataTable
        columns={columns} rows={rows}
        searchKeys={['id', 'orderId', 'customerName']}
        searchPlaceholder={t('searchPayments')}
        filters={
          <select className="select" style={{ width: 'auto' }} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="All">{t('allMethodsFilter')}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{tPayment(lang, m)}</option>)}
          </select>
        }
      />
    </div>
  )
}
