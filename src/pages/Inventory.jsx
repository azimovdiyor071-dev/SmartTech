import { useMemo, useState } from 'react'
import { Boxes, AlertTriangle, XOctagon, ArrowDownUp, Plus, Minus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { CATEGORIES } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tCategory } from '../i18n/labels.js'

export default function Inventory() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const products = useCrmData((s) => s.products)
  const adjustStock = useCrmData((s) => s.adjustStock)
  const [filter, setFilter] = useState('All')

  const rows = useMemo(() => {
    if (filter === 'Low stock') return products.filter((p) => p.stock > 0 && p.stock <= p.reorderLevel)
    if (filter === 'Out of stock') return products.filter((p) => p.stock === 0)
    return products
  }, [filter, products])

  const totalUnits = products.reduce((s, p) => s + p.stock, 0)
  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0)
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.reorderLevel).length
  const out = products.filter((p) => p.stock === 0).length
  const catName = (id) => tCategory(lang, id, CATEGORIES.find((c) => c.id === id)?.name)

  const FILTERS = [['All', t('all')], ['Low stock', t('lowStockStat')], ['Out of stock', t('outStockStat')]]
  const adjust = (p, dir) => (e) => { e.stopPropagation(); adjustStock(p.id, dir); push(dir > 0 ? t('stockAdded') : t('stockRemoved'), dir > 0 ? 'success' : 'info') }

  const columns = [
    { key: 'name', header: th(lang, 'product'), sortable: true, render: (p) => (
      <div className="cell-media"><span className="thumb">{p.icon}</span><div><div className="cell-strong">{p.name}</div><div className="cell-muted" style={{ fontSize: 12 }}>{p.sku}</div></div></div>
    ) },
    { key: 'category', header: th(lang, 'category'), sortable: true, render: (p) => catName(p.category) },
    { key: 'stock', header: th(lang, 'inStock'), sortable: true, align: 'right', render: (p) => <b>{number(p.stock)}</b> },
    { key: 'reorderLevel', header: th(lang, 'reorder'), align: 'right', render: (p) => p.reorderLevel },
    { key: 'value', header: th(lang, 'stockValue'), sortable: true, sortValue: (p) => p.cost * p.stock, align: 'right', render: (p) => money(p.cost * p.stock) },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (p) => <Badge status={p.status} /> },
    { key: 'actions', header: th(lang, 'adjust'), align: 'right', render: (p) => (
      <div style={{ display: 'inline-flex', gap: 6 }}>
        <button className="page-btn" onClick={adjust(p, 1)} aria-label="Add"><Plus size={14} /></button>
        <button className="page-btn" onClick={adjust(p, -1)} aria-label="Remove"><Minus size={14} /></button>
      </div>
    ) },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('inventory')}
        subtitle={t('invSubtitle')}
        breadcrumb={[{ label: t('inventory') }]}
        actions={<button className="btn btn-primary" onClick={() => push(t('stockTransferDemo'), 'success')}><ArrowDownUp size={16} /> {t('stockTransfer')}</button>}
      />

      <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalUnits')} value={number(totalUnits)} icon={Boxes} tone="indigo" />
        <StatCard label={th(lang, 'stockValue')} value={money(stockValue)} icon={Boxes} tone="green" />
        <StatCard label={t('lowStockStat')} value={number(low)} icon={AlertTriangle} tone="amber" />
        <StatCard label={t('outStockStat')} value={number(out)} icon={XOctagon} tone="red" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['name', 'sku', 'brand']}
        searchPlaceholder={t('searchInventory')}
        filters={
          <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        }
      />
    </div>
  )
}
