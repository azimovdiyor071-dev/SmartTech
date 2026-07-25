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
import { allowedDomains, DOMAIN_LABEL, can } from './permissions.js'
import { useCrmData } from '../stores/useCrmData.js'
import { parseAction, confirmMd, matchEntity, norm } from './actions.js'

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

// ---------------------------------------------------------------------------
// IDENTITY — "who made you?" always credits the developer.
// ---------------------------------------------------------------------------
const CREATOR = 'Azimov Diyorbek'
const IDENTITY_RE = /\b(who (made|created|developed|built|designed|programmed|coded) you|who('?s| is) your (creator|developer|maker|author|owner)|who develops? you)\b/
const identity = {
  id: 'identity', domain: 'public',
  test: (q, ctx) => {
    const raw = (ctx?.raw || '').toLowerCase()
    return IDENTITY_RE.test(q)
      || /kim (yaratdi|ishlab chiq|tayyorladi|yasagan|yozgan|dasturlagan)|seni kim|kim tomonidan|kim yaratgan|kim ishlab chiqqan/.test(raw)
      || /кто (тебя|вас) (создал|разработал|сделал|написал)|кто твой (создатель|разработчик)|кто разработал/.test(raw)
  },
  run: (_q, { lang }) => ({ md: tt(lang, 'identity', { by: CREATOR }) }),
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
    // "all / list / everyone / names" — return the FULL customer list, not just the top few.
    const wantsAll = /\b(list|all|everyone|names?)\b/.test(q)
      || /hamma|barcha|ro['’]?y[hx]at|ismlar|ism[- ]?familiya|ismini|ismlarini|to['’]?liq/.test(raw.toLowerCase())
      || /список|все|весь|имена|имён/.test(raw.toLowerCase())
    if (wantsAll) {
      const all = [...cust].sort((a, b) => b.totalSpent - a.totalSpent)
      const table = mdTable(H(lang, ['customer', 'phone', 'city', 'spent']), all.map((c) => [c.name, c.phone, c.city, money(c.totalSpent)]))
      return { md: tt(lang, 'customers.list', { count: all.length, table }), memory: { lastDomain: 'customers' } }
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

// ---------------------------------------------------------------------------
// INSIGHTS — real AI-style analysis on demand: compares the last 7 days with
// the previous 7 from LIVE orders and gives concrete recommendations.
// ---------------------------------------------------------------------------
const DAY = 86400000
function weeklyInsights() {
  const { orders, products, customers } = live()
  const now = Date.now()
  const inRange = (iso, a, b) => { const t = new Date(iso).getTime(); return t >= now - b * DAY && t < now - a * DAY }
  const active = orders.filter((o) => o.status !== 'Cancelled')
  const rev = (a, b) => active.filter((o) => inRange(o.createdAt, a, b)).reduce((s, o) => s + (o.total || 0), 0)
  const revNow = rev(0, 7); const revPrev = rev(7, 14)
  const qtyBy = (a, b) => {
    const m = {}
    for (const o of active) {
      if (!inRange(o.createdAt, a, b)) continue
      for (const it of o.items || []) m[it.productId] = (m[it.productId] || 0) + (it.qty || 0)
    }
    return m
  }
  const nowQ = qtyBy(0, 7); const prevQ = qtyBy(7, 14)
  const ids = new Set([...Object.keys(nowQ), ...Object.keys(prevQ)])
  const changes = [...ids].map((id) => {
    const p = products.find((x) => x.id === id)
    const cur = nowQ[id] || 0; const prv = prevQ[id] || 0
    return { name: p?.name || id, cur, prv, diff: cur - prv, pct: prv ? ((cur - prv) / prv) * 100 : (cur ? 100 : 0) }
  })
  const declines = changes.filter((c) => c.diff < 0).sort((a, b) => a.diff - b.diff)
  const rises = changes.filter((c) => c.diff > 0).sort((a, b) => b.diff - a.diff)
  const low = products.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock)
  const atRisk = customers.filter((c) => c.orders > 1 && c.lastOrder && now - new Date(c.lastOrder) > 45 * DAY)
  const revPct = revPrev ? ((revNow - revPrev) / revPrev) * 100 : (revNow ? 100 : 0)
  return { revNow, revPrev, revPct, declines, rises, low, atRisk, hasData: active.length > 0 }
}

const INS = {
  en: {
    title: '📊 **Business insights — last 7 days**', none: "Not enough recent sales yet. Make a few orders and ask again.",
    rev: (v, p) => `- 💰 Revenue: **${money(v)}** this week (${p} vs last week)`,
    drop: (n, p) => `- 📉 **${n}** sales dropped **${p}** — I'd recommend a promo or an ad`,
    rise: (n, p) => `- 📈 **${n}** is rising **${p}** — keep plenty in stock`,
    low: (n, names) => `- ⚠️ **${n}** product(s) low on stock (${names}) — reorder soon`,
    risk: (n) => `- 🔔 **${n}** loyal customer(s) haven't bought in 45+ days — send them an offer`,
    reco: '💡 **My advice:** ', recoUp: 'Great momentum — reinvest in your best sellers and keep them stocked.',
    recoDown: 'Sales are cooling — run a short promotion on the slow items and message quiet customers.',
    recoFlat: 'Steady week — push your top product and refill low stock to grow next week.',
  },
  uz: {
    title: "📊 **Biznes tahlili — oxirgi 7 kun**", none: "Hozircha yetarli savdo yo'q. Bir nechta buyurtma qiling-da, qayta so'rang.",
    rev: (v, p) => `- 💰 Tushum: bu hafta **${money(v)}** (o'tgan haftaga nisbatan ${p})`,
    drop: (n, p) => `- 📉 **${n}** sotuvi **${p}** tushdi — reklama yoki chegirma tavsiya qilaman`,
    rise: (n, p) => `- 📈 **${n}** **${p}** ko'tarilmoqda — omborda yetarli saqlang`,
    low: (n, names) => `- ⚠️ **${n}** ta mahsulot kam qoldi (${names}) — tez orada to'ldiring`,
    risk: (n) => `- 🔔 **${n}** ta doimiy mijoz 45+ kundan beri xarid qilmadi — chegirma taklif qiling`,
    reco: '💡 **Mening maslahatim:** ', recoUp: "Zo'r sur'at — eng ko'p sotilayotganlarga e'tibor bering va omborni to'ldiring.",
    recoDown: "Savdo sekinlashyapti — sekin ketayotgan tovarlarga aksiya qiling va jim mijozlarga xabar yuboring.",
    recoFlat: "Barqaror hafta — eng yaxshi mahsulotni reklama qiling va kam qolgan tovarni to'ldiring.",
  },
  ru: {
    title: '📊 **Аналитика — последние 7 дней**', none: 'Пока мало продаж. Сделайте несколько заказов и спросите снова.',
    rev: (v, p) => `- 💰 Выручка: **${money(v)}** за неделю (${p} к прошлой)`,
    drop: (n, p) => `- 📉 Продажи **${n}** упали на **${p}** — рекомендую акцию или рекламу`,
    rise: (n, p) => `- 📈 **${n}** растёт на **${p}** — держите запас`,
    low: (n, names) => `- ⚠️ **${n}** товар(ов) заканчивается (${names}) — пополните склад`,
    risk: (n) => `- 🔔 **${n}** постоянных клиента(ов) не покупали 45+ дней — предложите скидку`,
    reco: '💡 **Мой совет:** ', recoUp: 'Хороший темп — вкладывайтесь в топ-товары и держите их в наличии.',
    recoDown: 'Продажи замедляются — запустите акцию на медленные товары и напишите «тихим» клиентам.',
    recoFlat: 'Стабильная неделя — продвигайте топ-товар и пополните склад.',
  },
}
const insights = {
  id: 'insights', domain: 'reports',
  test: (q, ctx) => has(q, 'analyze', 'analysis', 'analytics', 'insight', 'advice', 'recommend', 'recommendation')
    || /tahlil|analiz|maslahat|tavsiya|nima qilay|savdo qanday|umumiy holat|biznes holat/.test((ctx?.raw || '').toLowerCase())
    || /аналитик|анализ|совет|рекоменд|как дела с продаж/.test((ctx?.raw || '').toLowerCase()),
  run: (_q, { lang }) => {
    const L = INS[lang] || INS.en
    const d = weeklyInsights()
    if (!d.hasData) return { md: `${L.title}\n\n${L.none}` }
    const lines = [L.rev(d.revNow, pct(d.revPct))]
    if (d.declines[0]) lines.push(L.drop(d.declines[0].name, pct(d.declines[0].pct)))
    if (d.rises[0]) lines.push(L.rise(d.rises[0].name, pct(d.rises[0].pct)))
    if (d.low.length) lines.push(L.low(d.low.length, d.low.slice(0, 3).map((p) => p.name).join(', ')))
    if (d.atRisk.length) lines.push(L.risk(d.atRisk.length))
    const reco = d.revPct > 5 ? L.recoUp : d.revPct < -5 ? L.recoDown : L.recoFlat
    return { md: `${L.title}\n\n${lines.join('\n')}\n\n${L.reco}${reco}`, memory: { lastDomain: 'reports' } }
  },
}

// ---------------------------------------------------------------------------
// FORECAST — predictive analytics on demand: what's likely to sell next and
// which loyal customers are at risk of leaving (churn), from LIVE data.
// ---------------------------------------------------------------------------
function forecast() {
  const { orders, products, customers } = live()
  const now = Date.now()
  const activeO = orders.filter((o) => o.status !== 'Cancelled')
  const qtyIn = (days, prev) => {
    const m = {}
    for (const o of activeO) {
      const age = (now - new Date(o.createdAt).getTime()) / DAY
      const inWin = prev ? (age > days && age <= days + prev) : age <= days
      if (inWin) for (const it of o.items || []) m[it.productId] = (m[it.productId] || 0) + (it.qty || 0)
    }
    return m
  }
  const last30 = qtyIn(30); const prev30 = qtyIn(30, 30)
  const top = products.map((p) => {
    const cur = last30[p.id] || 0; const prv = prev30[p.id] || 0
    const momentum = prv ? (cur - prv) / prv : (cur ? 1 : 0)
    const projected = Math.max(cur, Math.round(cur * (1 + Math.max(-0.5, Math.min(1, momentum)))))
    return { name: p.name, cur, projected, stock: p.stock, reorder: p.reorderLevel }
  }).filter((x) => x.cur > 0).sort((a, b) => b.projected - a.projected).slice(0, 3)
  const churn = customers
    .filter((c) => c.orders > 1 && c.lastOrder && now - new Date(c.lastOrder).getTime() > 60 * DAY)
    .sort((a, b) => b.totalSpent - a.totalSpent)
  return { top, churn: churn.slice(0, 5), churnCount: churn.length, hasData: activeO.length > 0 }
}
const FC = {
  en: {
    title: '🔮 **Forecast — next 30 days**', none: 'Not enough sales history yet to predict. Come back after more orders.',
    topH: '**Likely best sellers next month:**', topRow: (v) => `- 📈 **${v.name}** — ~${v.projected} units (${v.cur} sold last 30d)${v.stock <= v.reorder ? ' ⚠️ low stock, reorder' : ''}`,
    churnH: (n) => `**At risk of leaving (${n}):**`, churnRow: (v) => `- 🔔 **${v.name}** — ${money(v.totalSpent)} lifetime, quiet 60+ days`,
    churnNone: '✅ No loyal customers are drifting away right now — nice.',
    advice: '💡 Reorder the top movers early, and win back at-risk customers with a personal offer.',
  },
  uz: {
    title: "🔮 **Bashorat — keyingi 30 kun**", none: "Bashorat uchun hali savdo tarixi kam. Ko'proq buyurtmadan keyin urinib ko'ring.",
    topH: "**Kelasi oy ko'p sotilishi mumkin:**", topRow: (v) => `- 📈 **${v.name}** — ~${v.projected} dona (oxirgi 30 kunda ${v.cur} ta)${v.stock <= v.reorder ? " ⚠️ kam qoldi, to'ldiring" : ''}`,
    churnH: (n) => `**Ketib qolish ehtimoli (${n} ta):**`, churnRow: (v) => `- 🔔 **${v.name}** — ${money(v.totalSpent)} umumiy, 60+ kun jim`,
    churnNone: "✅ Hozircha doimiy mijozlardan hech kim ketayotgani yo'q — zo'r.",
    advice: "💡 Ko'p ketayotgan tovarni oldindan to'ldiring, ketayotgan mijozlarni shaxsiy taklif bilan qaytaring.",
  },
  ru: {
    title: '🔮 **Прогноз — ближайшие 30 дней**', none: 'Пока мало истории продаж для прогноза. Вернитесь после новых заказов.',
    topH: '**Вероятные хиты следующего месяца:**', topRow: (v) => `- 📈 **${v.name}** — ~${v.projected} шт (${v.cur} за 30 дней)${v.stock <= v.reorder ? ' ⚠️ мало на складе' : ''}`,
    churnH: (n) => `**Риск ухода (${n}):**`, churnRow: (v) => `- 🔔 **${v.name}** — ${money(v.totalSpent)} всего, тишина 60+ дней`,
    churnNone: '✅ Сейчас лояльные клиенты не уходят — отлично.',
    advice: '💡 Заранее пополните топ-товары и верните уходящих клиентов персональным предложением.',
  },
}
const forecastSkill = {
  id: 'forecast', domain: 'reports',
  test: (q, ctx) => has(q, 'forecast', 'predict', 'prediction', 'projection', 'churn')
    || /bashorat|prognoz|kelasi oy|keyingi oy|kim ketadi|kim ket|tark et|ketib qol/.test((ctx?.raw || '').toLowerCase())
    || /прогноз|башорат|отток|уйдут|кто уйдёт|следующий месяц|churn/.test((ctx?.raw || '').toLowerCase()),
  run: (_q, { lang }) => {
    const L = FC[lang] || FC.en
    const d = forecast()
    if (!d.hasData || !d.top.length) return { md: `${L.title}\n\n${L.none}` }
    const parts = [L.title, '', L.topH, ...d.top.map((t) => L.topRow(t))]
    parts.push('', d.churnCount ? L.churnH(d.churnCount) : '', ...(d.churnCount ? d.churn.map((c) => L.churnRow(c)) : [L.churnNone]))
    parts.push('', L.advice)
    return { md: parts.filter((x) => x !== undefined).join('\n'), memory: { lastDomain: 'reports' } }
  },
}

// ---------------------------------------------------------------------------
// IDEAS — the assistant brainstorms concrete growth ideas, grounded in the
// shop's LIVE situation (low stock, quiet customers, top/slow products), and
// points to the exact command it can run for you.
// ---------------------------------------------------------------------------
function ideaContext() {
  const { products, customers } = live()
  const now = Date.now()
  const low = products.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock)
  const bySold = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0))
  const topSeller = bySold[0]
  const slow = [...products].filter((p) => p.stock > 0).sort((a, b) => (a.sold || 0) - (b.sold || 0))[0]
  const quiet = customers.filter((c) => c.orders > 1 && c.lastOrder && now - new Date(c.lastOrder).getTime() > 60 * DAY)
  const vip = customers.filter((c) => c.segment === 'VIP')
  return { low, topSeller, slow, quiet, vip }
}
const IDEAS = {
  en: {
    title: '💡 **Ideas to grow your shop**', intro: "Here's what I'd try, based on your real data:",
    restock: (names) => `1. **Restock the fast movers** (${names}) before the weekend so you don't miss sales.`,
    winback: (n) => `2. **Win back ${n} quiet customer(s)** — say: *"send a 10% SMS to customers inactive 3 months"* and I'll do it.`,
    bundle: (name) => `3. **Bundle "${name}"** (your best seller) with accessories (case, charger) to raise the average sale.`,
    slow: (name) => `4. **Move slow stock:** put a small discount on **${name}** to free up cash.`,
    loyalty: '5. **Start a loyalty program** — points on every purchase brings customers back.',
    close: 'Want me to act on any of these? Just tell me — e.g. *"forecast next month"* or *"give me analytics"*.',
  },
  uz: {
    title: "💡 **Do'koningizni o'stirish g'oyalari**", intro: "Real ma'lumotingizga qarab men shularni tavsiya qilaman:",
    restock: (names) => `1. **Tez ketayotgan tovarni to'ldiring** (${names}) — dam olish kunlaridan oldin, savdoni boy bermang.`,
    winback: (n) => `2. **${n} ta jim mijozni qaytaring** — menga: *"3 oyda xarid qilmagan mijozlarga 10% chegirma sms yubor"* deng, bajaraman.`,
    bundle: (name) => `3. **"${name}"ni to'plam qiling** (eng ko'p sotilgani) — aksessuar (g'ilof, zaryadchi) bilan birga soting, o'rtacha chek oshadi.`,
    slow: (name) => `4. **Sekin tovarni harakatlantiring:** **${name}**ga kichik chegirma qo'ying, pul aylanadi.`,
    loyalty: '5. **Sodiqlik dasturi** — har xariddan ball bering, mijoz qaytib keladi.',
    close: 'Shulardan birini bajaray? Ayting — masalan *"kelasi oy bashorati"* yoki *"menga tahlil ber"*.',
  },
  ru: {
    title: '💡 **Идеи для роста магазина**', intro: 'Вот что я бы попробовал, судя по вашим данным:',
    restock: (names) => `1. **Пополните ходовые товары** (${names}) до выходных, чтобы не упустить продажи.`,
    winback: (n) => `2. **Верните ${n} «тихих» клиента(ов)** — скажите: *«отправь SMS со скидкой 10% клиентам без покупок 3 месяца»*, и я сделаю.`,
    bundle: (name) => `3. **Соберите комплект с «${name}»** (ваш хит) и аксессуарами (чехол, зарядка) — вырастет средний чек.`,
    slow: (name) => `4. **Разгоните залежавшийся товар:** небольшая скидка на **${name}** освободит деньги.`,
    loyalty: '5. **Запустите программу лояльности** — баллы за покупки возвращают клиентов.',
    close: 'Хотите, чтобы я что-то сделал? Скажите — например *«прогноз на следующий месяц»* или *«дай аналитику»*.',
  },
}
const ideas = {
  id: 'ideas', domain: 'reports',
  test: (q, ctx) => {
    const raw = (ctx?.raw || '').toLowerCase()
    return has(q, 'idea', 'ideas', 'brainstorm', 'suggestion', 'grow', 'improve')
      || /g['’]?oya|goya|fikr ber|taklif ber|nima qil|nima qilish|nima qilsa|qanday o['’]?stir|o['’]?stirsak|rivojlan|ko['’]?paytir/.test(raw)
      || /иде[ия]|предлож|как вырас|развива|улучш/.test(raw)
  },
  run: (_q, { lang }) => {
    const L = IDEAS[lang] || IDEAS.en
    const d = ideaContext()
    const lines = []
    if (d.low.length) lines.push(L.restock(d.low.slice(0, 3).map((p) => p.name).join(', ')))
    if (d.quiet.length) lines.push(L.winback(d.quiet.length))
    if (d.topSeller) lines.push(L.bundle(d.topSeller.name))
    if (d.slow) lines.push(L.slow(d.slow.name))
    lines.push(L.loyalty)
    return { md: `${L.title}\n\n${L.intro}\n\n${lines.join('\n')}\n\n${L.close}`, memory: { lastDomain: 'reports' } }
  },
}

// ---------------------------------------------------------------------------
// ACTIONS — the assistant performs real operations (create order, delete,
// cancel) after an explicit confirmation. Domain is 'public' so the engine
// doesn't pre-gate it; the real per-action permission check happens here.
// ---------------------------------------------------------------------------
const DOMAIN_OF = { 'order.create': 'orders', 'order.cancel': 'orders', 'customer.delete': 'customers', 'employee.delete': 'employees', 'product.delete': 'products', 'marketing.sms': 'customers', 'products.import': 'products' }
const actions = {
  id: 'actions', domain: 'public',
  test: (_q, ctx) => !!parseAction(ctx?.raw || ''),
  run: (_q, { raw, lang, user }) => {
    const d = parseAction(raw)
    if (!d) return { md: tt(lang, 'refusal'), isFallback: true }
    if (d.error) return { md: confirmMd(d, lang) } // couldn't resolve — just guide, nothing pending
    const domain = DOMAIN_OF[d.type] || 'public'
    if (!can(user?.role, domain)) {
      return { md: tt(lang, 'restricted', { role: user?.role || '—', domain: DOMAIN_LABEL[domain] || domain }) }
    }
    // Nothing to act on (e.g. a campaign that matched zero customers) → no pending.
    if (d.type === 'marketing.sms' && !d.count) return { md: confirmMd(d, lang) }
    // Ask for confirmation and stash the action; useAssistant runs it on "yes".
    return { md: confirmMd(d, lang), pendingAction: d, memory: { pendingAction: d } }
  },
}

// ---------------------------------------------------------------------------
// PROFILE — "who is X / tell me about X / how is employee X doing" → a full
// single-record profile (customer or employee), read from live data.
// ---------------------------------------------------------------------------
const PROFILE_INTENT = /(haqida|malumot|ma.lumot|profil|about|who ?is|performance|данн|кто так|как работ|ishla|natija|kimligi|\bkim\b)/
const profileText = {
  customer: (lang, c) => {
    const t = { en: ['orders', 'spent', 'points', 'Last order', 'Joined'], uz: ['buyurtma', 'sarflagan', 'ball', 'Oxirgi buyurtma', "Qo'shilgan"], ru: ['заказов', 'потрачено', 'баллов', 'Последний заказ', 'Регистрация'] }[lang] || {}
    return `👤 **${c.name}**\n\n- 📞 ${c.phone}\n- 🏙️ ${c.city} · 🏷️ ${sLabel(lang, c.segment)}\n- 🛒 ${c.orders} ${t[0]} · 💰 ${money(c.totalSpent)} ${t[1]}\n- ⭐ ${number(c.loyaltyPoints)} ${t[2]} · ${sLabel(lang, c.status)}\n- 🕐 ${t[3]}: ${c.lastOrder ? formatDate(c.lastOrder) : '—'}\n- 📅 ${t[4]}: ${formatDate(c.joined)}`
  },
  employee: (lang, e, rank, total) => {
    const t = { en: ['Branch', 'Sales', 'Rank', 'of', 'Joined'], uz: ['Filial', 'Savdo', "O'rin", 'dan', "Qo'shilgan"], ru: ['Филиал', 'Продажи', 'Место', 'из', 'Принят'] }[lang] || {}
    return `👤 **${e.name}** — ${tRoleSafe(lang, e.role)}\n\n- 🏢 ${t[0]}: ${e.branch}\n- 💰 ${t[1]}: ${money(e.sales)}\n- 📊 ${t[2]}: #${rank} ${t[3]} ${total}\n- ${sLabel(lang, e.status)} · 📅 ${t[4]}: ${formatDate(e.joined)}`
  },
}
const tRoleSafe = (lang, role) => { try { return cLabel(lang, role, role) } catch { return role } }
const profile = {
  id: 'profile', domain: 'public',
  test: (_q, ctx) => {
    const raw = ctx?.raw || ''
    if (!PROFILE_INTENT.test(norm(raw))) return false
    const d = live()
    return !!(matchEntity(raw, d.employees) || matchEntity(raw, d.customers))
  },
  run: (_q, { raw, lang, user }) => {
    const d = live()
    const wantsEmp = /(hodim|xodim|ishchi|employee|staff|сотрудник|работник)/.test(norm(raw))
    const emp = matchEntity(raw, d.employees)
    const cust = matchEntity(raw, d.customers)
    // Employees are HR data — gate them; customers use the customer domain.
    if (emp && (wantsEmp || !cust)) {
      if (!can(user?.role, 'employees')) return { md: tt(lang, 'restricted', { role: user?.role || '—', domain: DOMAIN_LABEL.employees }) }
      const ranked = [...d.employees].sort((a, b) => (b.sales || 0) - (a.sales || 0))
      const rank = ranked.findIndex((x) => x.id === emp.id) + 1
      return { md: profileText.employee(lang, emp, rank, ranked.length), memory: { lastDomain: 'employees' } }
    }
    if (cust) {
      if (!can(user?.role, 'customers')) return { md: tt(lang, 'restricted', { role: user?.role || '—', domain: DOMAIN_LABEL.customers }) }
      return { md: profileText.customer(lang, cust), memory: { lastDomain: 'customers' } }
    }
    return { md: tt(lang, 'refusal'), isFallback: true }
  },
}

export const SKILLS = [
  security, identity, actions, profile, insights, forecastSkill, ideas, greeting, concepts, help, counts,
  sales, products, inventory, customers, orders, payments, invoices,
  warranty, service, delivery, employees, branches, reports,
  suggestions,
]
