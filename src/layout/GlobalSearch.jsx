import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Package, ShoppingCart } from 'lucide-react'
import { useCrmData } from '../stores/useCrmData.js'
import { useT } from '../i18n/useI18n.js'
import { money, initials, colorFrom } from '../lib/format.js'

export default function GlobalSearch() {
  const navigate = useNavigate()
  const { t } = useT()
  const customers = useCrmData((s) => s.customers)
  const products = useCrmData((s) => s.products)
  const orders = useCrmData((s) => s.orders)

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return { customers: [], products: [], orders: [], total: 0 }
    const c = customers.filter((x) => x.name.toLowerCase().includes(term) || (x.phone || '').includes(term) || (x.email || '').toLowerCase().includes(term)).slice(0, 4)
    const p = products.filter((x) => x.name.toLowerCase().includes(term) || x.sku.toLowerCase().includes(term) || x.brand.toLowerCase().includes(term)).slice(0, 4)
    const o = orders.filter((x) => x.id.toLowerCase().includes(term) || x.customerName.toLowerCase().includes(term)).slice(0, 4)
    return { customers: c, products: p, orders: o, total: c.length + p.length + o.length }
  }, [q, customers, products, orders])

  const go = (path, state) => { setQ(''); setOpen(false); navigate(path, state ? { state } : undefined) }

  return (
    <div className="global-search" ref={boxRef} style={{ position: 'relative' }}>
      <Search size={16} />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={t('search')}
        aria-label="Global search"
      />
      {open && q.trim() && (
        <div className="search-results">
          {results.total === 0 && <div className="search-empty">{t('noData')}</div>}

          {results.customers.length > 0 && (
            <div className="search-group">
              <div className="search-group-label"><Users size={12} /> {t('customers')}</div>
              {results.customers.map((c) => (
                <button key={c.id} className="search-item" onMouseDown={() => go('/customers', { openId: c.id })}>
                  <span className="avatar" style={{ width: 26, height: 26, fontSize: 10, background: colorFrom(c.name) }}>{initials(c.name)}</span>
                  <span className="search-item-main">{c.name}</span>
                  <span className="search-item-sub">{c.phone}</span>
                </button>
              ))}
            </div>
          )}

          {results.products.length > 0 && (
            <div className="search-group">
              <div className="search-group-label"><Package size={12} /> {t('products')}</div>
              {results.products.map((p) => (
                <button key={p.id} className="search-item" onMouseDown={() => go('/products', { openId: p.id })}>
                  <span className="thumb" style={{ width: 26, height: 26, fontSize: 13 }}>{p.icon}</span>
                  <span className="search-item-main">{p.name}</span>
                  <span className="search-item-sub">{money(p.price)}</span>
                </button>
              ))}
            </div>
          )}

          {results.orders.length > 0 && (
            <div className="search-group">
              <div className="search-group-label"><ShoppingCart size={12} /> {t('orders')}</div>
              {results.orders.map((o) => (
                <button key={o.id} className="search-item" onMouseDown={() => go(`/orders/${o.id}`)}>
                  <span className="thumb" style={{ width: 26, height: 26, fontSize: 12 }}>🧾</span>
                  <span className="search-item-main">{o.id} · {o.customerName}</span>
                  <span className="search-item-sub">{money(o.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
