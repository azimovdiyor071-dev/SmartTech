// Derived analytics computed from the mock database.
import {
  DAILY, ORDERS, PRODUCTS, CUSTOMERS, EMPLOYEES, BRANCHES, CATEGORIES, DELIVERIES, WARRANTIES,
} from './db.js'
import { pctChange } from '../lib/format.js'

const sum = (arr, key) => arr.reduce((s, x) => s + (x[key] || 0), 0)
const lastN = (n) => DAILY.slice(-n)
const prevN = (n) => DAILY.slice(-2 * n, -n)

function metric(n, key) {
  const cur = sum(lastN(n), key)
  const prev = sum(prevN(n), key)
  return { value: Math.round(cur), prev: Math.round(prev), change: pctChange(cur, prev) }
}

export function getKpis() {
  const today = DAILY[DAILY.length - 1]
  const yesterday = DAILY[DAILY.length - 2]

  const daily = { value: today.revenue, prev: yesterday.revenue, change: pctChange(today.revenue, yesterday.revenue) }
  const weekly = metric(7, 'revenue')
  const monthly = metric(30, 'revenue')
  const yearly = metric(182, 'revenue') // last 6mo vs prior 6mo (proxy for YoY trend)
  const profit = metric(30, 'profit')
  const expenses = metric(30, 'expenses')
  const orders = metric(30, 'orders')
  const units = metric(30, 'units')

  const avgOrderValue = {
    value: Math.round(monthly.value / Math.max(orders.value, 1)),
    prev: Math.round(monthly.prev / Math.max(orders.prev, 1)),
    change: pctChange(monthly.value / Math.max(orders.value, 1), monthly.prev / Math.max(orders.prev, 1)),
  }

  // customers
  const now = Date.now()
  const newCustomers = CUSTOMERS.filter((c) => now - new Date(c.joined) < 30 * 86400000).length
  const returning = CUSTOMERS.filter((c) => c.orders > 1).length
  const active = CUSTOMERS.filter((c) => c.status === 'Active').length

  // order statuses
  const byStatus = (s) => ORDERS.filter((o) => o.status === s).length
  const pending = ORDERS.filter((o) => ['New', 'Confirmed', 'Preparing', 'Ready'].includes(o.status)).length
  const completed = byStatus('Delivered')
  const cancelled = byStatus('Cancelled')
  const refunded = byStatus('Refunded')
  const refundValue = ORDERS.filter((o) => o.status === 'Refunded').reduce((s, o) => s + o.total, 0)

  return {
    daily, weekly, monthly, yearly, profit, expenses, orders, units, avgOrderValue,
    newCustomers, returning, active, totalCustomers: CUSTOMERS.length,
    pending, completed, cancelled, refunded, refundValue: Math.round(refundValue),
    yearlyRevenueTotal: Math.round(sum(lastN(365), 'revenue')),
  }
}

export function getRevenueSeries(days = 30) {
  return lastN(days).map((d) => ({ label: d.date.slice(5), revenue: d.revenue, profit: d.profit, orders: d.orders }))
}

export function getCategoryDistribution() {
  const totals = CATEGORIES.map((cat) => {
    const revenue = PRODUCTS.filter((p) => p.category === cat.id).reduce((s, p) => s + p.sold * p.price, 0)
    return { id: cat.id, label: cat.name, icon: cat.icon, value: Math.round(revenue) }
  })
  return totals.sort((a, b) => b.value - a.value)
}

export function getBranchComparison() {
  return BRANCHES.map((b) => {
    const branchOrders = ORDERS.filter((o) => o.branch === b.id)
    const revenue = branchOrders.reduce((s, o) => s + o.total, 0)
    return {
      id: b.id, label: b.name, city: b.city,
      revenue: Math.round(revenue),
      orders: branchOrders.length,
      employees: EMPLOYEES.filter((e) => e.branch === b.id).length,
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

export function getTopProducts(n = 6) {
  return [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, n)
    .map((p) => ({ ...p, revenue: Math.round(p.sold * p.price) }))
}

export function getTopEmployees(n = 5) {
  return EMPLOYEES.filter((e) => e.sales).sort((a, b) => b.sales - a.sales).slice(0, n)
}

export function getLowStock() {
  return PRODUCTS.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock)
}

// Counts for the dashboard "Today's Tasks" panel.
export function getTaskCounts() {
  const now = Date.now()
  return {
    newOrders: ORDERS.filter((o) => o.status === 'New').length,
    pendingPay: ORDERS.filter((o) => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled').length,
    inTransit: DELIVERIES.filter((d) => d.status === 'In transit').length,
    warrantySoon: WARRANTIES.filter((w) => {
      const days = (new Date(w.expires) - now) / 86400000
      return w.status === 'Active' && days >= 0 && days <= 30
    }).length,
  }
}
