import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PackagePlus, Boxes, Layers, DollarSign, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { CATEGORIES } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tCategory } from '../i18n/labels.js'

const EMPTY = { name: '', brand: '', category: 'smartphones', sku: '', barcode: '', imei: '', cost: '', price: '', stock: '', reorderLevel: 8, warrantyMonths: 12, icon: '📦' }

export default function Products() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const products = useCrmData((s) => s.products)
  const addProduct = useCrmData((s) => s.addProduct)
  const updateProduct = useCrmData((s) => s.updateProduct)
  const deleteProduct = useCrmData((s) => s.deleteProduct)

  const [cat, setCat] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  const rows = useMemo(
    () => (cat === 'All' ? products : products.filter((p) => p.category === cat)),
    [cat, products],
  )

  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0)
  const lowCount = products.filter((p) => p.stock <= p.reorderLevel).length
  const catName = (id) => tCategory(lang, id, CATEGORIES.find((c) => c.id === id)?.name)

  const openNew = () => { setForm({ ...EMPTY, icon: CATEGORIES[0].icon }); setErr(''); setEditing('new') }
  const openEdit = (p) => { setForm({ name: p.name, brand: p.brand, category: p.category, sku: p.sku, barcode: p.barcode, imei: p.imei || '', cost: p.cost, price: p.price, stock: p.stock, reorderLevel: p.reorderLevel, warrantyMonths: p.warrantyMonths, icon: p.icon }); setErr(''); setEditing(p) }
  const close = () => setEditing(null)

  // Open a specific product when arriving from global search.
  const location = useLocation()
  useEffect(() => {
    const id = location.state?.openId
    if (!id) return
    const p = products.find((x) => x.id === id)
    window.history.replaceState({}, '')
    if (p) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openEdit(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setErr(t('titleReq')); return }
    const icon = CATEGORIES.find((c) => c.id === form.category)?.icon || '📦'
    const payload = { ...form, icon }
    try {
      if (editing === 'new') { await addProduct(payload); push(t('created'), 'success') }
      else { await updateProduct(editing.id, payload); push(t('updated'), 'success') }
      close()
    } catch (e) { setErr(e.message) }
  }
  const remove = async () => {
    if (editing === 'new') return
    if (!window.confirm(t('confirmDelete'))) return
    try { await deleteProduct(editing.id); push(t('deleted'), 'info'); close() } catch (e) { push(e.message, 'error') }
  }

  const columns = [
    {
      key: 'name', header: th(lang, 'product'), sortable: true,
      render: (p) => (
        <div className="cell-media">
          <span className="thumb">{p.icon}</span>
          <div>
            <div className="cell-strong">{p.name}</div>
            <div className="cell-muted" style={{ fontSize: 12 }}>{p.brand} · {p.sku}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', header: th(lang, 'category'), sortable: true, render: (p) => catName(p.category) },
    { key: 'price', header: th(lang, 'price'), sortable: true, align: 'right', render: (p) => <b>{money(p.price)}</b> },
    { key: 'cost', header: th(lang, 'cost'), sortable: true, align: 'right', render: (p) => <span className="cell-muted">{money(p.cost)}</span> },
    { key: 'stock', header: th(lang, 'stock'), sortable: true, align: 'right', render: (p) => number(p.stock) },
    { key: 'sold', header: th(lang, 'sold'), sortable: true, align: 'right', render: (p) => number(p.sold) },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (p) => <Badge status={p.status} /> },
  ]

  const num = Number(form.price) || 0
  const margin = num ? ((num - (Number(form.cost) || 0)) / num) * 100 : 0

  return (
    <div className="page">
      <PageHeader
        title={t('products')}
        subtitle={`${number(products.length)} ${t('skusAcross')} ${CATEGORIES.length} ${t('categoriesWord')}`}
        breadcrumb={[{ label: t('products') }]}
        actions={<button className="btn btn-primary" onClick={openNew}><PackagePlus size={16} /> {t('addProduct')}</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalSkus')} value={number(products.length)} icon={Boxes} tone="indigo" />
        <StatCard label={t('stockValueCost')} value={money(stockValue)} icon={DollarSign} tone="green" />
        <StatCard label={t('lowOutStock')} value={number(lowCount)} icon={Layers} tone="amber" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['name', 'brand', 'sku', 'barcode']}
        searchPlaceholder={t('searchGeneric')}
        onRowClick={openEdit}
        filters={
          <select className="select" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="All">{t('allCategories')}</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}
          </select>
        }
      />

      <Drawer
        open={!!editing}
        title={editing === 'new' ? t('addProduct') : t('editProduct')}
        onClose={close}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>{editing === 'new' ? t('save') : t('saveChanges')}</button>
            {editing !== 'new' && <button className="btn btn-ghost" onClick={remove} style={{ color: 'var(--danger)' }}><Trash2 size={15} /> {t('deleteWord')}</button>}
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="field"><label>{th(lang, 'product')} *</label><input className={`input${err ? ' input-err' : ''}`} value={form.name} onChange={set('name')} autoFocus /></div>
          {err && <span className="err-text">{err}</span>}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>{th(lang, 'brand')}</label><input className="input" value={form.brand} onChange={set('brand')} /></div>
            <div className="field"><label>{th(lang, 'category')}</label>
              <select className="select" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}
              </select>
            </div>
            <div className="field"><label>{t('sellingPrice')}</label><input className="input" type="number" min="0" value={form.price} onChange={set('price')} /></div>
            <div className="field"><label>{t('costPrice')}</label><input className="input" type="number" min="0" value={form.cost} onChange={set('cost')} /></div>
            <div className="field"><label>{t('stockQty')}</label><input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} /></div>
            <div className="field"><label>{t('reorderLevel')}</label><input className="input" type="number" min="0" value={form.reorderLevel} onChange={set('reorderLevel')} /></div>
            <div className="field"><label>SKU</label><input className="input" value={form.sku} onChange={set('sku')} placeholder="auto" /></div>
            <div className="field"><label>{t('warrantyField')} ({t('months')})</label><input className="input" type="number" min="0" value={form.warrantyMonths} onChange={set('warrantyMonths')} /></div>
          </div>
          {num > 0 && (
            <div className="kv"><span>{t('margin')}</span><b style={{ color: 'var(--success)' }}>{margin.toFixed(0)}%</b></div>
          )}
        </div>
      </Drawer>
    </div>
  )
}
