// Dashboard metrics computed from the LIVE store (orders/customers/products)
// so the dashboard always matches what's really in the CRM — add or delete a
// record and every figure here updates immediately.
import { pctChange } from '../lib/format.js'

const DAY = 86400000
const startOfDay = (daysAgo = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() - daysAgo * DAY
}

export function dashboardStats({ orders = [], customers = [], products = [] }) {
  const now = Date.now()
  const active = orders.filter((o) => o.status !== 'Cancelled')

  const costOfItem = (it) => {
    const p = products.find((x) => x.id === it.productId)
    const unit = p && p.cost != null ? p.cost : (it.price || 0) * 0.8 // fallback if product was removed
    return unit * (it.qty || 0)
  }
  const at = (iso) => new Date(iso).getTime()
  const inWindow = (iso, a, b) => { const t = at(iso); return t >= now - b * DAY && t < now - a * DAY }
  const revenue = (a, b) => active.filter((o) => inWindow(o.createdAt, a, b)).reduce((s, o) => s + (o.total || 0), 0)
  const cogs = (a, b) => active.filter((o) => inWindow(o.createdAt, a, b))
    .reduce((s, o) => s + (o.items || []).reduce((ss, it) => ss + costOfItem(it), 0), 0)

  // Today vs yesterday
  const todayStart = startOfDay(0)
  const yStart = startOfDay(1)
  const between = (from, to) => active.filter((o) => { const t = at(o.createdAt); return t >= from && t < to })
  const todayRev = between(todayStart, now + 1).reduce((s, o) => s + (o.total || 0), 0)
  const ydayRev = between(yStart, todayStart).reduce((s, o) => s + (o.total || 0), 0)
  const todaysOrders = between(todayStart, now + 1).length

  // Last 30 days vs the 30 before that. inWindow(iso,a,b) = [now-b, now-a),
  // so the previous 30-day window is (30, 60) — NOT (30, 30) (which is empty).
  const rev30 = revenue(0, 30); const rev60 = revenue(30, 60)
  const cogs30 = cogs(0, 30); const cogs60 = cogs(30, 60)
  const profit30 = rev30 - cogs30; const profit60 = rev60 - cogs60

  const newCustomers = customers.filter((c) => c.joined && now - at(c.joined) < 30 * DAY).length

  // 30-day daily revenue series for the chart
  const series = []
  for (let i = 29; i >= 0; i--) {
    const from = startOfDay(i); const to = startOfDay(i - 1)
    const dayRev = between(from, to).reduce((s, o) => s + (o.total || 0), 0)
    // Label from LOCAL date parts (buckets are local days) — toISOString would
    // shift the label a day in every UTC+ timezone (e.g. Tashkent UTC+5).
    const d = new Date(from)
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    series.push({ label, revenue: Math.round(dayRev) })
  }

  return {
    daily: { value: Math.round(todayRev), change: pctChange(todayRev, ydayRev) },
    todaysOrders,
    newCustomers,
    totalCustomers: customers.length,
    profit: { value: Math.round(profit30), change: pctChange(profit30, profit60) },
    expenses: { value: Math.round(cogs30), change: pctChange(cogs30, cogs60) },
    monthly: Math.round(rev30),
    series,
    inTransit: orders.filter((o) => o.deliveryStatus === 'In transit').length,
  }
}