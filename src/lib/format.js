// Formatting helpers shared across the app.
import { useCurrency } from '../stores/useCurrency.js'

// Base amounts are in USD; convert to the currently selected currency.
function convert(value) {
  const { currency, rates } = useCurrency.getState()
  return { currency, n: (Number(value) || 0) * (rates[currency] || 1) }
}

export function money(value) {
  const { currency, n } = convert(value)
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n)
  }
  const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n))
  return currency === 'RUB' ? `${num} ₽` : `${num} so'm`
}

export function compactMoney(value) {
  const { currency, n } = convert(value)
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }
  const num = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  return currency === 'RUB' ? `${num} ₽` : `${num} so'm`
}

export function number(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0)
}

export function percent(value, digits = 1) {
  const n = Number(value) || 0
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function formatDate(iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', opts)
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

// Deterministic color from a string — stable avatars/branch colors.
export function colorFrom(str = '') {
  const palette = ['#4f46e5', '#7c3aed', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#db2777', '#0891b2']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}
