import { FileText, Download, Printer } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { useMemo } from 'react'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number, formatDate } from '../lib/format.js'
import { openPrintWindow, invoiceHtml } from '../lib/exporters.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th } from '../i18n/labels.js'

export default function Invoices() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const orders = useCrmData((s) => s.orders)

  // Every order has an invoice; paid orders show as Paid.
  const invoices = useMemo(() => orders.map((o) => ({
    id: `INV-${o.id.replace(/\D/g, '')}`,
    orderId: o.id,
    customerName: o.customerName,
    amount: o.total,
    status: o.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
    issued: o.createdAt,
  })), [orders])

  const total = invoices.reduce((s, i) => s + i.amount, 0)
  const paid = invoices.filter((i) => i.status === 'Paid').length
  const unpaid = invoices.length - paid

  const exportInvoice = (inv) => {
    const order = orders.find((o) => o.id === inv.orderId)
      || { id: inv.id, customerName: inv.customerName, createdAt: inv.issued, items: [], subtotal: inv.amount, discount: 0, tax: 0, total: inv.amount, paymentMethod: '—' }
    const L = {
      invoice: th(lang, 'invoice'), customer: th(lang, 'customer'), payment: th(lang, 'payment'),
      product: th(lang, 'product'), price: th(lang, 'price'), qty: t('quantity'), total: th(lang, 'total'),
      subtotal: t('subtotal'), discount: t('discount'), tax: t('taxLabel'), thanks: t('invoiceThanks'),
    }
    const ok = openPrintWindow(`${th(lang, 'invoice')} ${inv.id}`, invoiceHtml({ ...order, id: inv.id }, { money, formatDate, L }))
    if (!ok) push(t('popupBlocked'), 'error')
  }

  const columns = [
    { key: 'id', header: th(lang, 'invoice'), sortable: true, render: (i) => <b>{i.id}</b> },
    { key: 'orderId', header: th(lang, 'order'), sortable: true },
    { key: 'customerName', header: th(lang, 'customer'), sortable: true },
    { key: 'amount', header: th(lang, 'amount'), sortable: true, align: 'right', render: (i) => <b>{money(i.amount)}</b> },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (i) => <Badge status={i.status} /> },
    { key: 'issued', header: th(lang, 'issued'), sortable: true, render: (i) => formatDate(i.issued) },
    { key: 'actions', header: th(lang, 'actions'), align: 'right', render: (i) => (
      <div style={{ display: 'inline-flex', gap: 6 }}>
        <button className="page-btn" onClick={(e) => { e.stopPropagation(); exportInvoice(i) }} aria-label="Print"><Printer size={14} /></button>
        <button className="page-btn" onClick={(e) => { e.stopPropagation(); exportInvoice(i) }} aria-label="PDF"><Download size={14} /></button>
      </div>
    ) },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('invoices')} subtitle={`${number(invoices.length)} ${t('invoicesSub')}`} breadcrumb={[{ label: t('invoices') }]}
        actions={<button className="btn btn-primary" onClick={() => push(t('invoiceGenerated'), 'success')}><FileText size={16} /> {t('generateInvoice')}</button>}
      />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalInvoiced')} value={money(total)} icon={FileText} tone="indigo" />
        <StatCard label={t('paidStat')} value={number(paid)} icon={FileText} tone="green" />
        <StatCard label={t('unpaidStat')} value={number(unpaid)} icon={FileText} tone="red" />
      </div>
      <DataTable columns={columns} rows={invoices} searchKeys={['id', 'orderId', 'customerName']} searchPlaceholder={t('searchInvoices')} />
    </div>
  )
}
