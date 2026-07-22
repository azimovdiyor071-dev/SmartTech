// ============================================================
// Skill registry — the AI Assistant's capabilities (trilingual).
// Each skill: { id, domain, test(q, ctx) -> bool, run(q, ctx) -> {md, ...} }
// `q` is the CANONICAL (English-normalized) query used for matching;
// `ctx.raw` is the user's original text; `ctx.lang` is uz|ru|en.
// Engine picks the first matching skill after a permission check.
// ============================================================
import {
  WARRANTIES, SERVICE_REQUESTS, DELIVERIES, CATEGORIES, DAILY, BRANCHES,
} from '../data/db.js'
import { getKpis } from '../data/analytics.js'
import { money, number, formatDate } from '../lib/format.js'
import { has, extractBrand, extractCategory, extractAmount, extractComparator, isRefinement, extractColor, mdTable } from './nlu.js'
import { extractSearchTerm } from './lang.js'
import { tt, sLabel, cLabel, H } from './localize.js'
import { allowedDomains, DOMAIN_LABEL } from './permissions.js'
import { useCrmData } from '../stores/useCrmData.js'

// --- small localized helpers ------------------------------------------------
const catLoc = (lang, id) => cLabel(lang, id, CATEGORIES.find((c) => c.id === id)?.name)
const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const arrow = (n) => (n >= 0 ? '📈' : '📉')
const todayRow = () => DAILY[DAILY.length - 1]

// Live data (from the backend-backed store) so the AI matches what the app shows.
const live = () => useCrmData.getState()
const isToday = (iso) => { try { return new Date(iso).toDateString() === new Date().toDateString() } catch { return false } }
const liveLowStock = () => live().products.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock)
const liveTopProducts = (n) => [...live().products].sort((a, b) => b.sold - a.sold).slice(0, n).map((p) => ({ ...p, revenue: Math.round(p.sold * p.price) }))

const CMP_WORD = {
  en: { gt: 'more than', lt: 'less than' },
  uz: { gt: "dan ko'p", lt: 'dan kam' },
  ru: { gt: 'более', lt: 'менее' },
}
const PERIOD_WORD = {
  en: { Daily: 'Daily', Weekly: 'Weekly', Monthly: 'Monthly', Quarterly: 'Quarterly', Yearly: 'Yearly' },
  uz: { Daily: 'Kunlik', Weekly: 'Haftalik', Monthly: 'Oylik', Quarterly: 'Choraklik', Yearly: 'Yillik' },
  ru: { Daily: 'Дневной', Weekly: 'Недельный', Monthly: 'Месячный', Quarterly: 'Квартальный', Yearly: 'Годовой' },
}
const COMPARE_LABEL = {
  en: { today: 'Today vs yesterday', week: 'This week vs last week', month: 'This month vs last month', year: 'Year trend' },
  uz: { today: 'Bugun vs kecha', week: "Bu hafta vs o'tgan hafta", month: "Bu oy vs o'tgan oy", year: 'Yillik tendensiya' },
  ru: { today: 'Сегодня и вчера', week: 'Эта неделя и прошлая', month: 'Этот месяц и прошлый', year: 'Годовой тренд' },
}
const cmpWord = (lang, c) => (CMP_WORD[lang] || CMP_WORD.en)[c]

function filterSummary(lang, f) {
  const L = {
    en: { brand: 'brand', cat: 'category', inYes: 'in stock', inNo: 'out of stock', match: 'match' },
    uz: { brand: 'brend', cat: 'toifa', inYes: 'mavjud', inNo: 'tugagan', match: 'moslik' },
    ru: { brand: 'бренд', cat: 'категория', inYes: 'в наличии', inNo: 'нет в наличии', match: 'совпадение' },
  }[lang] || {}
  const parts = []
  if (f.brand) parts.push(`${L.brand}: **${f.brand}**`)
  if (f.category) parts.push(`${L.cat}: **${catLoc(lang, f.category)}**`)
  if (f.inStock === true) parts.push(`**${L.inYes}**`)
  if (f.inStock === false) parts.push(`**${L.inNo}**`)
  if (f.priceOp) parts.push(`${f.priceOp === 'lt' ? '<' : '>'} ${money(f.priceVal)}`)
  if (f.name) parts.push(`${L.match}: **${f.name}**`)
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
const security = {
  id: 'security', domain: 'public',
  test: (q) =>
    has(q, 'password', 'api key', 'api-key', 'apikey', 'token', 'secret', 'credential', 'private key', 'server ip') &&
    !(has(q, 'reset', 'forgot', 'change') && has(q, 'password')),
  run: (_q, { lang }) => ({ md: tt(lang, 'security') }),
}

const greeting = {
  id: 'greeting', domain: 'public',
  test: (q) => /^(hi|hello|hey|salom|assalom|hola|good (morning|afternoon|evening))\b/.test(q) || has(q, 'thank', 'rahmat', 'raxmat', 'spasibo', 'спасибо'),
  run: (_q, { user, lang }) => ({
    md: tt(lang, 'greeting', { name: user?.name?.split(' ')[0] || '' }),
    suggestions: SUGG(lang).welcome,
  }),
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CONCEPTS — plain-language "what is …" explanations for beginners.
// ---------------------------------------------------------------------------
const CONCEPT_RE = /\b(what is|what's|what are|what does|explain|meaning of|tell me about)\b/
// Don't hijack data questions like "what are today's sales".
const CONCEPT_BLOCK = ['today', 'yesterday', 'week', 'month', 'year', 'how much', 'how many', 'best', 'top', 'list', 'pending', 'low stock', 'running out', 'waiting', 'awaiting']

function conceptKey(q) {
  if (has(q, 'customer', 'client')) return 'concept.customer'
  if (has(q, 'order')) return 'concept.order'
  if (has(q, 'inventory', 'warehouse')) return 'concept.inventory'
  if (has(q, 'profit')) return 'concept.profit'
  if (has(q, 'revenue', 'sales', 'turnover')) return 'concept.revenue'
  if (has(q, 'warranty', 'guarantee')) return 'concept.warranty'
  if (has(q, 'report')) return 'concept.report'
  if (has(q, 'invoice', 'billing')) return 'concept.invoice'
  return 'concept.generic'
}

const CONCEPT_TERMS = ['customer', 'client', 'order', 'inventory', 'warehouse', 'profit', 'revenue', 'sales', 'turnover', 'warranty', 'guarantee', 'report', 'invoice', 'billing', 'product', 'stock']

const concepts = {
  id: 'concepts', domain: 'public',
  test: (q) => {
    if (has(q, ...CONCEPT_BLOCK)) return false
    const asksMeaning = CONCEPT_RE.test(q) || /\bnima\b/.test(q) || q.includes('что такое') || q.includes('что значит') || q.includes('nimani anglatadi')
    // Only explain CRM concepts — a general "what is X" falls through to the refusal.
    return asksMeaning && has(q, ...CONCEPT_TERMS)
  },
  run: (q, { lang }) => ({ md: tt(lang, conceptKey(q)) }),
}

// ---------------------------------------------------------------------------
// COUNTS — exact "how many X" answers from LIVE data (never guessed/LLM).
// ---------------------------------------------------------------------------
const counts = {
  id: 'counts', domain: 'public',
  test: (q) =>
    !has(q, 'today', 'yesterday')
    && has(q, 'how many', 'number of', 'total number', 'count')
    && has(q, 'customer', 'client', 'user', 'buyer', 'product', 'item', 'sku', 'catalog', 'order', 'employee', 'staff', 'worker'),
  run: (q, { lang, user }) => {
    const d = useCrmData.getState()
    const allow = allowedDomains(user?.role)
    const deny = (domain) => ({ md: tt(lang, 'restricted', { role: user?.role || '—', domain: DOMAIN_LABEL[domain] || domain }) })

    if (has(q, 'customer', 'client', 'user', 'buyer')) {
      return allow.includes('customers') ? { md: tt(lang, 'count.customers', { n: number(d.customers.length) }) } : deny('customers')
    }
    if (has(q, 'employee', 'staff', 'worker')) {
      return allow.includes('employees') ? { md: tt(lang, 'count.employees', { n: number(d.employees.length) }) } : deny('employees')
    }
    if (has(q, 'order')) {
      return allow.includes('orders') ? { md: tt(lang, 'count.orders', { n: number(d.orders.length) }) } : deny('orders')
    }
    return allow.includes('products') ? { md: tt(lang, 'count.products', { n: number(d.products.length) }) } : deny('products')
  },
}

const sales = {
  id: 'sales', domain: 'sales',
  test: (q) =>
    has(q, 'sales', 'revenue', 'profit', 'expense', 'income', 'turnover', 'average order', 'aov', 'products sold', 'units sold', 'sold') ||
    (has(q, 'compare') && has(q, 'today', 'yesterday', 'month', 'week', 'year')),
  run: (q, { lang }) => {
    const k = getKpis(); const t = todayRow()
    if (has(q, 'expense')) return { md: tt(lang, 'sales.expenses', { v: money(k.expenses.value), arrow: arrow(k.expenses.change), pct: pct(k.expenses.change) }) }
    if (has(q, 'profit')) return { md: tt(lang, 'sales.profit', { v: money(k.profit.value), arrow: arrow(k.profit.change), pct: pct(k.profit.change), today: money(t.profit) }) }
    if (has(q, 'products sold', 'units sold')) return { md: tt(lang, 'sales.units', { v: number(k.units.value), arrow: arrow(k.units.change), pct: pct(k.units.change) }) }
    if (has(q, 'average order', 'aov')) return { md: tt(lang, 'sales.aov', { v: money(k.avgOrderValue.value), arrow: arrow(k.avgOrderValue.change), pct: pct(k.avgOrderValue.change) }) }

    if (has(q, 'compare', 'vs', 'versus')) {
      const which = has(q, 'month') ? 'month' : has(q, 'week') ? 'week' : has(q, 'year') ? 'year' : 'today'
      const m = { today: k.daily, week: k.weekly, month: k.monthly, year: k.yearly }[which]
      return { md: tt(lang, 'compare', { label: COMPARE_LABEL[lang][which], cur: money(m.value), prev: money(m.prev), arrow: arrow(m.change), pct: pct(m.change) }) }
    }
    if (has(q, 'yesterday')) return { md: tt(lang, 'sales.yesterday', { v: money(k.daily.prev) }) }
    if (has(q, 'week')) return { md: tt(lang, 'sales.weekly', { v: money(k.weekly.value), arrow: arrow(k.weekly.change), pct: pct(k.weekly.change) }) }
    if (has(q, 'month')) return { md: tt(lang, 'sales.monthly', { v: money(k.monthly.value), arrow: arrow(k.monthly.change), pct: pct(k.monthly.change) }) }
    if (has(q, 'year')) return { md: tt(lang, 'sales.yearly', { v: money(k.yearlyRevenueTotal) }) }

    return {
      md: tt(lang, 'sales.today', { rev: money(k.daily.value), arrow: arrow(k.daily.change), pct: pct(k.daily.change), prev: money(k.daily.prev), orders: number(t.orders), profit: money(t.profit) }),
      suggestions: SUGG(lang).sales,
    }
  },
}

// ---------------------------------------------------------------------------
function applyProductFilters(f) {
  let out = live().products
  if (f.brand) out = out.filter((p) => p.brand.toLowerCase() === f.brand.toLowerCase())
  if (f.category) out = out.filter((p) => p.category === f.category)
  if (f.inStock === true) out = out.filter((p) => p.stock > 0)
  if (f.inStock === false) out = out.filter((p) => p.stock === 0)
  if (f.priceOp === 'lt') out = out.filter((p) => p.price < f.priceVal)
  if (f.priceOp === 'gt') out = out.filter((p) => p.price > f.priceVal)
  if (f.name) out = out.filter((p) => p.name.toLowerCase().includes(f.name) || p.sku.toLowerCase().includes(f.name))
  return out
}

const products = {
  id: 'products', domain: 'products',
  test: (q, ctx) => {
    // stock questions belong to the inventory skill, even if "product" is present
    if (has(q, 'low stock', 'running out', 'out of stock', 'remaining', 'reorder')) return false
    if (extractBrand(q) || extractCategory(q)) return true
    if (has(q, 'product', 'sku', 'catalog', 'item')) return true
    return ctx?.memory?.lastDomain === 'products' && isRefinement(q)
  },
  run: (q, { memory, lang, raw }) => {
    if (has(q, 'best', 'top selling', 'best selling', 'most sold', 'popular')) {
      const top = liveTopProducts(8)
      return { md: tt(lang, 'products.top', { table: mdTable(H(lang, ['product', 'brand', 'sold', 'revenue']), top.map((p) => [p.name, p.brand, `${p.sold}`, money(p.revenue)])) }), memory: { lastDomain: 'products', productFilters: {} } }
    }

    const refine = memory?.lastDomain === 'products' && isRefinement(q) && !has(q, 'product')
    const f = refine ? { ...(memory.productFilters || {}) } : {}
    const brand = extractBrand(q); if (brand) f.brand = brand
    const cat = extractCategory(q); if (cat) f.category = cat
    if (has(q, 'available', 'in stock')) f.inStock = true
    if (has(q, 'out of stock', 'unavailable')) f.inStock = false
    const cmp = extractComparator(q); const amt = extractAmount(q)
    if (cmp && amt) { f.priceOp = cmp; f.priceVal = amt }
    if (has(q, 'find', 'search') && !brand && !cat) {
      const term = extractSearchTerm(raw)
      if (term) f.name = term
    }

    const color = extractColor(q)
    const results = applyProductFilters(f)
    if (results.length === 0) {
      return { md: tt(lang, 'products.none'), memory: { lastDomain: 'products', productFilters: f } }
    }
    const rows = results.slice(0, 8).map((p) => [p.name, p.brand, catLoc(lang, p.category), money(p.price), `${p.stock}`, sLabel(lang, p.status)])
    const table = mdTable(H(lang, ['product', 'brand', 'category', 'price', 'stock', 'status']), rows)

    return {
      md: tt(lang, 'products.list', { count: results.length, filters: filterSummary(lang, f), table, more: results.length > 8, colorNote: color }),
      memory: { lastDomain: 'products', productFilters: f },
      suggestions: SUGG(lang).products,
    }
  },
}

// ---------------------------------------------------------------------------
const inventory = {
  id: 'inventory', domain: 'inventory',
  test: (q) => has(q, 'low stock', 'running out', 'out of stock', 'reorder', 'inventory', 'restock', 'remaining'),
  run: (q, { lang }) => {
    if (has(q, 'out of stock')) {
      const out = live().products.filter((p) => p.stock === 0)
      return { md: tt(lang, 'inventory.out', { count: out.length, table: mdTable(H(lang, ['product', 'category', 'status']), out.slice(0, 10).map((p) => [p.name, catLoc(lang, p.category), sLabel(lang, p.status)])) }) }
    }
    const low = liveLowStock()
    const table = mdTable(H(lang, ['product', 'stock', 'reorder', 'status']), low.slice(0, 10).map((p) => [p.name, `${p.stock}`, `${p.reorderLevel}`, sLabel(lang, p.status)]))
    return { md: tt(lang, 'inventory.low', { count: low.length, table }), memory: { lastDomain: 'inventory' } }
  },
}

// ---------------------------------------------------------------------------
const customers = {
  id: 'customers', domain: 'customers',
  test: (q) => has(q, 'customer', 'client', 'buyer', 'vip', 'loyalty', 'retention', 'active customers', 'new customers', 'returning'),
  run: (q, { lang, raw }) => {
    const cust = live().customers
    if (has(q, 'active customers')) return { md: tt(lang, 'customers.active', { v: number(cust.filter((c) => c.status === 'Active').length), total: number(cust.length) }) }
    if (has(q, 'new customers')) return { md: tt(lang, 'customers.new', { v: number(cust.filter((c) => Date.now() - new Date(c.joined) < 30 * 86400000).length) }) }
    if (has(q, 'returning', 'retention')) return { md: tt(lang, 'customers.returning', { v: number(cust.filter((c) => c.orders > 1).length) }) }

    const cmp = extractComparator(q); const amt = extractAmount(q)
    if (cmp && amt) {
      const list = cust.filter((c) => (cmp === 'gt' ? c.totalSpent > amt : c.totalSpent < amt)).sort((a, b) => b.totalSpent - a.totalSpent)
      const table = mdTable(H(lang, ['customer', 'city', 'segment', 'spent', 'orders']), list.slice(0, 8).map((c) => [c.name, c.city, sLabel(lang, c.segment), money(c.totalSpent), `${c.orders}`]))
      return { md: tt(lang, 'customers.spent', { count: list.length, cmp: cmpWord(lang, cmp), amount: money(amt), table }), memory: { lastDomain: 'customers' } }
    }
    if (has(q, 'find', 'search')) {
      const term = extractSearchTerm(raw)
      const list = cust.filter((c) => c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term))
      if (!term || !list.length) return { md: tt(lang, 'customers.searchNone', { term: term || '—' }) }
      const table = mdTable(H(lang, ['customer', 'phone', 'segment', 'spent']), list.slice(0, 8).map((c) => [c.name, c.phone, sLabel(lang, c.segment), money(c.totalSpent)]))
      return { md: tt(lang, 'customers.search', { count: list.length, term, table }) }
    }
    if (has(q, 'vip')) {
      const vip = cust.filter((c) => c.segment === 'VIP').sort((a, b) => b.totalSpent - a.totalSpent)
      return { md: tt(lang, 'customers.vip', { count: vip.length, table: mdTable(H(lang, ['customer', 'spent', 'loyalty']), vip.slice(0, 8).map((c) => [c.name, money(c.totalSpent), number(c.loyaltyPoints)])) }) }
    }
    const top = [...cust].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8)
    return { md: tt(lang, 'customers.top', { table: mdTable(H(lang, ['customer', 'segment', 'spent', 'orders']), top.map((c) => [c.name, sLabel(lang, c.segment), money(c.totalSpent), `${c.orders}`])) }), memory: { lastDomain: 'customers' } }
  },
}

// ---------------------------------------------------------------------------
const orders = {
  id: 'orders', domain: 'orders',
  test: (q) => has(q, 'order', 'orders'),
  run: (q, { lang, raw }) => {
    const ord = live().orders
    const idMatch = raw.match(/#?\s?(\d{3,})/)
    if ((has(q, 'find', 'search') || raw.includes('#')) && idMatch) {
      const found = ord.find((o) => o.id.includes(idMatch[1]))
      if (!found) return { md: tt(lang, 'orders.notFound', { digits: idMatch[1] }) }
      return { md: tt(lang, 'orders.found', { id: found.id, customer: found.customerName, total: money(found.total), status: sLabel(lang, found.status), payment: sLabel(lang, found.paymentStatus), date: formatDate(found.createdAt) }) }
    }
    if (has(q, 'how many', 'count', 'today')) return { md: tt(lang, 'orders.today', { v: number(ord.filter((o) => isToday(o.createdAt)).length), total: number(ord.length) }) }
    if (has(q, 'awaiting payment', 'pending payment', 'unpaid')) {
      const list = ord.filter((o) => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled')
      return { md: tt(lang, 'orders.awaiting', { count: list.length, table: mdTable(H(lang, ['order', 'customer', 'total', 'payment']), list.slice(0, 10).map((o) => [o.id, o.customerName, money(o.total), sLabel(lang, o.paymentStatus)])) }), memory: { lastDomain: 'orders' } }
    }
    if (has(q, 'cancelled')) {
      const list = ord.filter((o) => o.status === 'Cancelled')
      return { md: tt(lang, 'orders.cancelled', { count: list.length, table: mdTable(H(lang, ['order', 'customer', 'total']), list.slice(0, 10).map((o) => [o.id, o.customerName, money(o.total)])) }) }
    }
    if (has(q, 'refund')) {
      const list = ord.filter((o) => o.status === 'Refunded')
      return { md: tt(lang, 'orders.refund', { count: list.length, amount: money(list.reduce((s, o) => s + o.total, 0)) }) }
    }
    if (has(q, 'delivered', 'completed')) {
      const list = ord.filter((o) => o.status === 'Delivered')
      return { md: tt(lang, 'orders.recent', { table: mdTable(H(lang, ['order', 'customer', 'status', 'total']), list.slice(0, 10).map((o) => [o.id, o.customerName, sLabel(lang, o.status), money(o.total)])) }), memory: { lastDomain: 'orders' } }
    }
    if (has(q, 'pending', 'processing', 'preparing')) {
      const list = ord.filter((o) => ['New', 'Confirmed', 'Preparing', 'Ready'].includes(o.status))
      return { md: tt(lang, 'orders.pending', { count: list.length, table: mdTable(H(lang, ['order', 'customer', 'status', 'total']), list.slice(0, 10).map((o) => [o.id, o.customerName, sLabel(lang, o.status), money(o.total)])) }), memory: { lastDomain: 'orders' } }
    }
    const recent = ord.slice(0, 8)
    return { md: tt(lang, 'orders.recent', { table: mdTable(H(lang, ['order', 'customer', 'status', 'total']), recent.map((o) => [o.id, o.customerName, sLabel(lang, o.status), money(o.total)])) }), memory: { lastDomain: 'orders' } }
  },
}

// ---------------------------------------------------------------------------
const payments = {
  id: 'payments', domain: 'payments',
  test: (q) => has(q, 'payment', 'paid', 'collected', 'transaction'),
  run: (q, { lang }) => {
    // Payments derive from live orders (mirrors the Payments page).
    const pays = live().orders.filter((o) => o.paymentStatus !== 'Pending')
      .map((o) => ({ id: `PAY-${o.id.replace(/\D/g, '')}`, orderId: o.id, amount: o.paymentStatus === 'Partial' ? Math.round(o.total * 50) / 100 : o.total, status: o.paymentStatus }))
    if (has(q, 'pending', 'partial', 'awaiting')) {
      const list = pays.filter((p) => p.status !== 'Paid')
      return { md: tt(lang, 'payments.pending', { count: list.length, table: mdTable(H(lang, ['payment', 'order', 'amount', 'status']), list.slice(0, 10).map((p) => [p.id, p.orderId, money(p.amount), sLabel(lang, p.status)])) }) }
    }
    const collected = pays.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0)
    return { md: tt(lang, 'payments.summary', { collected: money(collected), count: pays.length, refunds: pays.filter((p) => p.status === 'Refunded').length }) }
  },
}

const invoices = {
  id: 'invoices', domain: 'invoices',
  test: (q) => has(q, 'invoice', 'billing'),
  run: (q, { lang }) => {
    // Invoices derive from live orders (mirrors the Invoices page).
    const invs = live().orders.map((o) => ({ id: `INV-${o.id.replace(/\D/g, '')}`, customerName: o.customerName, amount: o.total, status: o.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid' }))
    if (has(q, 'unpaid', 'overdue', 'outstanding')) {
      const list = invs.filter((i) => i.status !== 'Paid')
      return { md: tt(lang, 'invoices.unpaid', { count: list.length, amount: money(list.reduce((s, i) => s + i.amount, 0)), table: mdTable(H(lang, ['invoice', 'customer', 'amount']), list.slice(0, 10).map((i) => [i.id, i.customerName, money(i.amount)])) }) }
    }
    return { md: tt(lang, 'invoices.summary', { count: invs.length, paid: invs.filter((i) => i.status === 'Paid').length }) }
  },
}

// ---------------------------------------------------------------------------
const warranty = {
  id: 'warranty', domain: 'warranty',
  test: (q) => has(q, 'warranty', 'imei', 'guarantee'),
  run: (q, { lang }) => {
    if (has(q, 'expir', 'this week', 'soon', 'ending', 'running out')) {
      const soon = WARRANTIES.filter((w) => { const d = (new Date(w.expires) - Date.now()) / 86400000; return w.status === 'Active' && d >= 0 && d <= 30 })
      return { md: tt(lang, 'warranty.expiring', { count: soon.length, table: mdTable(H(lang, ['warranty', 'product', 'expires']), soon.slice(0, 10).map((w) => [w.id, w.product, formatDate(w.expires)])) }) }
    }
    const active = WARRANTIES.filter((w) => w.status === 'Active').length
    return { md: tt(lang, 'warranty.summary', { active, expired: WARRANTIES.length - active }) }
  },
}

const service = {
  id: 'service', domain: 'service',
  test: (q) => has(q, 'service', 'repair', 'technician'),
  run: (_q, { lang }) => {
    const open = SERVICE_REQUESTS.filter((s) => s.status !== 'Completed')
    return { md: tt(lang, 'service.open', { count: open.length, table: mdTable(H(lang, ['request', 'product', 'issue', 'status']), open.slice(0, 10).map((s) => [s.id, s.product, s.issue, sLabel(lang, s.status)])) }) }
  },
}

const delivery = {
  id: 'delivery', domain: 'delivery',
  test: (q) => has(q, 'delivery', 'courier', 'shipment', 'in transit'),
  run: (_q, { lang }) => {
    const transit = DELIVERIES.filter((d) => d.status === 'In transit').length
    return { md: tt(lang, 'delivery.summary', { transit, delivered: DELIVERIES.filter((d) => d.status === 'Delivered').length, table: mdTable(H(lang, ['delivery', 'customer', 'courier', 'status']), DELIVERIES.slice(0, 8).map((d) => [d.id, d.customerName, d.courier, sLabel(lang, d.status)])) }) }
  },
}

// ---------------------------------------------------------------------------
const employees = {
  id: 'employees', domain: 'employees',
  test: (q) => has(q, 'employee', 'staff', 'payroll', 'worker', 'hr '),
  run: (q, { lang }) => {
    if (has(q, 'payroll', 'salary')) return { md: tt(lang, 'employees.payroll') }
    if (has(q, 'how many', 'count', 'number of')) return { md: tt(lang, 'count.employees', { n: number(live().employees.length) }) }
    const top = [...live().employees].filter((e) => e.sales).sort((a, b) => b.sales - a.sales).slice(0, 5)
    return { md: tt(lang, 'employees.top', { table: mdTable(H(lang, ['employee', 'role', 'sales']), top.map((e) => [e.name, e.role, money(e.sales)])) }), memory: { lastDomain: 'employees' } }
  },
}

const branches = {
  id: 'branches', domain: 'branches',
  test: (q) => has(q, 'branch', 'store', 'location'),
  run: (_q, { lang }) => {
    const ord = live().orders; const emps = live().employees
    const stats = BRANCHES.map((b) => {
      const bo = ord.filter((o) => o.branch === b.id)
      return { id: b.id, label: b.name, city: b.city, revenue: Math.round(bo.reduce((s, o) => s + o.total, 0)), orders: bo.length, employees: emps.filter((e) => e.branch === b.id).length }
    }).sort((a, b) => b.revenue - a.revenue)
    const rows = stats.map((b, i) => [`${i === 0 ? '🥇 ' : ''}${b.label}`, b.city, `${b.orders}`, money(b.revenue)])
    return { md: tt(lang, 'branches.comparison', { table: mdTable(H(lang, ['branch', 'city', 'orders', 'revenue']), rows), top: stats[0].label }), memory: { lastDomain: 'branches' } }
  },
}

const reports = {
  id: 'reports', domain: 'reports',
  test: (q) => has(q, 'report', 'summary'),
  run: (q, { lang }) => {
    const k = getKpis()
    const key = has(q, 'year') ? 'Yearly' : has(q, 'quarter') ? 'Quarterly' : has(q, 'week') ? 'Weekly' : has(q, 'today', 'daily') ? 'Daily' : 'Monthly'
    const [revenueH, ordersH] = H(lang, ['revenue', 'orders'])
    const profitH = { en: 'Net profit', uz: 'Sof foyda', ru: 'Чистая прибыль' }[lang] || 'Net profit'
    const table = mdTable(H(lang, ['metric', 'value']), [
      [revenueH, money(k.monthly.value)],
      [profitH, money(k.profit.value)],
      ['AOV', money(k.avgOrderValue.value)],
      [ordersH, number(live().orders.length)],
    ])
    return { md: tt(lang, 'reports.summary', { period: PERIOD_WORD[lang][key], table }) }
  },
}

// ---------------------------------------------------------------------------
const suggestions = {
  id: 'suggestions', domain: 'public',
  test: (q) => has(q, 'suggestion', 'insight', 'recommend', 'what should i', 'alerts', 'advice', 'analyze', 'focus'),
  run: (_q, { user, lang }) => {
    const allow = allowedDomains(user?.role); const k = getKpis(); const s = SUGG(lang)
    const items = []
    if (allow.includes('inventory')) { const low = liveLowStock().length; if (low) items.push(s.lowStock(low)) }
    if (allow.includes('invoices')) { const unpaid = live().orders.filter((o) => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled').length; if (unpaid) items.push(s.unpaid(unpaid)) }
    if (allow.includes('sales')) items.push(s.revenue(arrow(k.daily.change), pct(k.daily.change)))
    if (allow.includes('branches')) {
      const ord = live().orders
      const best = BRANCHES.map((b) => ({ label: b.name, revenue: ord.filter((o) => o.branch === b.id).reduce((sum, o) => sum + o.total, 0) })).sort((a, b) => b.revenue - a.revenue)[0]
      if (best) items.push(s.branch(best.label))
    }
    if (allow.includes('warranty')) { const soon = WARRANTIES.filter((w) => { const d = (new Date(w.expires) - Date.now()) / 86400000; return w.status === 'Active' && d >= 0 && d <= 30 }).length; if (soon) items.push(s.warranty(soon)) }
    if (!items.length) items.push(s.healthy())
    return { md: `${tt(lang, 'suggestions.header')}\n\n${items.map((i) => `- ${i}`).join('\n')}` }
  },
}

// ---------------------------------------------------------------------------
const HELP_TOPICS = [
  { test: (q) => (/(^|\W)sell(\W|$)/.test(q) && !has(q, 'best', 'selling')) || /sotmoq|sotish|sotib ber/.test(q) || q.includes('продать') || q.includes('продажу') || q.includes('продажа сделать'), key: 'help.sell' },
  { test: (q) => has(q, 'create', 'new') && has(q, 'order'), key: 'help.createOrder' },
  { test: (q) => has(q, 'add', 'create', 'new') && has(q, 'customer'), key: 'help.addCustomer' },
  { test: (q) => has(q, 'add', 'create', 'new') && has(q, 'product'), key: 'help.addProduct' },
  { test: (q) => has(q, 'print', 'export', 'generate') && has(q, 'invoice'), key: 'help.invoice' },
  { test: (q) => has(q, 'reset', 'forgot', 'change') && has(q, 'password'), key: 'help.password' },
  { test: (q) => has(q, 'where') && has(q, 'inventory'), key: 'help.inventoryWhere' },
  { test: (q) => has(q, 'where', 'navigate'), key: 'help.navigate' },
]

const HELP_RE = /\b(how do i|how to|how can i|help|guide|where is|where do i|steps)\b/

const help = {
  id: 'help', domain: 'public',
  test: (q) => HELP_RE.test(q) || HELP_TOPICS.some((t) => t.test(q)),
  run: (q, { lang }) => {
    const topic = HELP_TOPICS.find((t) => t.test(q))
    return { md: tt(lang, topic ? topic.key : 'help.generic') }
  },
}

// --- localized quick suggestions -------------------------------------------
function SUGG(lang) {
  const M = {
    en: {
      welcome: ["Today's sales", 'Low stock products', 'Best branch', 'How do I create an order?'],
      sales: ['Compare this month with last month', 'Monthly revenue', "Today's profit"],
      products: ['Only available', 'Under $500', 'Low stock products'],
      lowStock: (n) => `📉 **${n} products** are at or below reorder level.`,
      unpaid: (n) => `📄 **${n} invoices** are unpaid.`,
      revenue: (a, p) => `${a} Today's revenue is **${p}** vs yesterday.`,
      branch: (b) => `🏢 **${b}** is outperforming other branches.`,
      warranty: (n) => `🛡️ **${n} warranties** expire within 30 days.`,
      healthy: () => 'Everything looks healthy across your areas. ✅',
    },
    uz: {
      welcome: ['Bugungi savdo', 'Kam qolgan mahsulotlar', 'Eng yaxshi filial', 'Buyurtma qanday yarataman?'],
      sales: ["Bu oyni o'tgan oy bilan solishtir", 'Oylik daromad', 'Bugungi foyda'],
      products: ['Faqat mavjud', "500$ dan arzon", 'Kam qolgan mahsulotlar'],
      lowStock: (n) => `📉 **${n} ta mahsulot** minimal darajada yoki undan past.`,
      unpaid: (n) => `📄 **${n} ta faktura** to'lanmagan.`,
      revenue: (a, p) => `${a} Bugungi daromad kechagiga nisbatan **${p}**.`,
      branch: (b) => `🏢 **${b}** boshqa filiallardan yaxshi ishlayapti.`,
      warranty: (n) => `🛡️ **${n} ta kafolat** 30 kun ichida tugaydi.`,
      healthy: () => "Sizga tegishli bo'limlarda hammasi joyida. ✅",
    },
    ru: {
      welcome: ['Продажи сегодня', 'Товары с низким остатком', 'Лучший филиал', 'Как создать заказ?'],
      sales: ['Сравни этот месяц с прошлым', 'Выручка за месяц', 'Прибыль сегодня'],
      products: ['Только в наличии', 'Дешевле $500', 'Товары с низким остатком'],
      lowStock: (n) => `📉 **${n} товаров** на уровне минимума или ниже.`,
      unpaid: (n) => `📄 **${n} счетов** не оплачены.`,
      revenue: (a, p) => `${a} Выручка сегодня **${p}** ко вчера.`,
      branch: (b) => `🏢 **${b}** опережает другие филиалы.`,
      warranty: (n) => `🛡️ **${n} гарантий** истекают в течение 30 дней.`,
      healthy: () => 'В доступных вам разделах всё в порядке. ✅',
    },
  }
  return M[lang] || M.en
}

export const SKILLS = [
  security, greeting, concepts, help, counts,
  sales, products, inventory, customers, orders, payments, invoices,
  warranty, service, delivery, employees, branches, reports,
  suggestions,
]
