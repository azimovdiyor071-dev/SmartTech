import { useState } from 'react'
import { ShieldCheck, Wrench, ShieldAlert } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { WARRANTIES, SERVICE_REQUESTS } from '../data/db.js'
import { money, formatDate } from '../lib/format.js'
import { useT } from '../i18n/useI18n.js'
import { th } from '../i18n/labels.js'

export default function Warranty() {
  const { t, lang } = useT()
  const [tab, setTab] = useState('warranties')

  const activeW = WARRANTIES.filter((w) => w.status === 'Active').length
  const expired = WARRANTIES.filter((w) => w.status === 'Expired').length
  const openService = SERVICE_REQUESTS.filter((s) => s.status !== 'Completed').length

  const warrantyCols = [
    { key: 'id', header: th(lang, 'warranty'), sortable: true, render: (w) => <b>{w.id}</b> },
    { key: 'product', header: th(lang, 'product'), sortable: true },
    { key: 'imei', header: th(lang, 'imei'), render: (w) => <span className="cell-muted">{w.imei}</span> },
    { key: 'customerName', header: th(lang, 'customer'), sortable: true },
    { key: 'months', header: th(lang, 'term'), align: 'right', render: (w) => `${w.months} ${t('months')}` },
    { key: 'expires', header: th(lang, 'expires'), sortable: true, render: (w) => formatDate(w.expires) },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (w) => <Badge status={w.status} /> },
  ]

  const serviceCols = [
    { key: 'id', header: th(lang, 'request'), sortable: true, render: (s) => <b>{s.id}</b> },
    { key: 'product', header: th(lang, 'product'), sortable: true },
    { key: 'imei', header: th(lang, 'imei'), render: (s) => <span className="cell-muted">{s.imei}</span> },
    { key: 'issue', header: th(lang, 'issue'), sortable: true },
    { key: 'technician', header: th(lang, 'technician'), sortable: true },
    { key: 'cost', header: th(lang, 'cost'), sortable: true, align: 'right', render: (s) => money(s.cost) },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (s) => <Badge status={s.status} /> },
    { key: 'createdAt', header: th(lang, 'date'), sortable: true, render: (s) => formatDate(s.createdAt) },
  ]

  return (
    <div className="page">
      <PageHeader title={t('warranty')} subtitle={t('warrantySub')} breadcrumb={[{ label: t('warranty') }]} />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('activeWarranties')} value={activeW} icon={ShieldCheck} tone="green" />
        <StatCard label={t('expiredStat')} value={expired} icon={ShieldAlert} tone="red" />
        <StatCard label={t('openServiceStat')} value={openService} icon={Wrench} tone="amber" />
      </div>

      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div style={{ display: 'inline-flex', gap: 4, background: 'var(--surface-3)', padding: 4, borderRadius: 12 }}>
          <button className={`btn btn-sm ${tab === 'warranties' ? 'btn-primary' : 'btn-ghost'}`} style={tab === 'warranties' ? {} : { border: 'none', background: 'transparent' }} onClick={() => setTab('warranties')}>{t('warrantiesTab')}</button>
          <button className={`btn btn-sm ${tab === 'service' ? 'btn-primary' : 'btn-ghost'}`} style={tab === 'service' ? {} : { border: 'none', background: 'transparent' }} onClick={() => setTab('service')}>{t('serviceTab')}</button>
        </div>
      </div>

      {tab === 'warranties' ? (
        <DataTable columns={warrantyCols} rows={WARRANTIES} searchKeys={['id', 'product', 'imei', 'customerName']} searchPlaceholder={t('searchImei')} />
      ) : (
        <DataTable columns={serviceCols} rows={SERVICE_REQUESTS} searchKeys={['id', 'product', 'imei', 'issue', 'technician']} searchPlaceholder={t('searchImeiIssue')} />
      )}
    </div>
  )
}
