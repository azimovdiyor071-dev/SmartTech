import { Truck, PackageCheck, Navigation } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { DELIVERIES } from '../data/db.js'
import { number, formatDate } from '../lib/format.js'
import { useT } from '../i18n/useI18n.js'
import { th } from '../i18n/labels.js'

export default function Delivery() {
  const { t, lang } = useT()
  const inTransit = DELIVERIES.filter((d) => d.status === 'In transit').length
  const delivered = DELIVERIES.filter((d) => d.status === 'Delivered').length

  const columns = [
    { key: 'id', header: th(lang, 'delivery'), sortable: true, render: (d) => <b>{d.id}</b> },
    { key: 'orderId', header: th(lang, 'order'), sortable: true },
    { key: 'customerName', header: th(lang, 'customer'), sortable: true },
    { key: 'courier', header: th(lang, 'courier'), sortable: true },
    { key: 'address', header: th(lang, 'address'), render: (d) => <span className="cell-muted">{d.address}</span> },
    { key: 'eta', header: th(lang, 'eta'), align: 'right' },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (d) => <Badge status={d.status} /> },
    { key: 'date', header: th(lang, 'date'), sortable: true, render: (d) => formatDate(d.date) },
  ]

  return (
    <div className="page">
      <PageHeader title={t('delivery')} subtitle={t('deliverySub')} breadcrumb={[{ label: t('delivery') }]} />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalDeliveries')} value={number(DELIVERIES.length)} icon={Truck} tone="indigo" />
        <StatCard label={t('inTransitStat')} value={number(inTransit)} icon={Navigation} tone="blue" />
        <StatCard label={t('deliveredStat')} value={number(delivered)} icon={PackageCheck} tone="green" />
      </div>
      <DataTable columns={columns} rows={DELIVERIES} searchKeys={['id', 'orderId', 'customerName', 'courier']} searchPlaceholder={t('searchDeliveries')} />
    </div>
  )
}
