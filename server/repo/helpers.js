// Pure domain helpers shared by both storage backends.
export const round2 = (n) => Math.round(n * 100) / 100

export const productStatus = (p) => (p.stock === 0 ? 'Out of stock' : p.stock <= p.reorderLevel ? 'Low stock' : 'Active')

export function nextId(ids, prefix, pad = 3) {
  const max = ids.reduce((m, id) => Math.max(m, parseInt(String(id).replace(/\D/g, ''), 10) || 0), 0)
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

export function nextOrderId(ids) {
  const max = ids.reduce((m, id) => Math.max(m, parseInt(String(id).replace(/\D/g, ''), 10) || 0), 10240)
  return `ORD-${max + 1}`
}

export function buildCustomer(input, id) {
  return {
    id,
    name: (input.name || '').trim(),
    email: input.email?.trim() || '',
    phone: input.phone?.trim() || '',
    city: input.city || '',
    branch: input.branch || 'b1',
    totalSpent: 0, orders: 0, loyaltyPoints: 0,
    segment: input.segment || 'New', status: 'Active',
    lastOrder: null, joined: new Date().toISOString(), notes: input.notes || '',
  }
}

export function buildProduct(input, id) {
  const p = {
    id,
    name: (input.name || '').trim(),
    category: input.category || 'accessories',
    brand: input.brand?.trim() || '—',
    sku: input.sku?.trim() || `SKU-${Date.now()}`,
    barcode: input.barcode || `48${Math.floor(Math.random() * 1e8)}`,
    imei: input.imei || null,
    cost: round2(Number(input.cost) || 0),
    price: round2(Number(input.price) || 0),
    stock: Number(input.stock) || 0,
    reorderLevel: Number(input.reorderLevel) || 8,
    warrantyMonths: Number(input.warrantyMonths) || 12,
    variants: 1, status: 'Active', icon: input.icon || '📦', sold: 0,
  }
  p.status = productStatus(p)
  return p
}

export function buildEmployee(input, id) {
  return {
    id,
    name: (input.name || '').trim(),
    role: input.role || 'Cashier',
    branch: input.branch || 'b1',
    email: input.email?.trim() || '',
    phone: input.phone?.trim() || '',
    status: input.status || 'Active',
    sales: Number(input.sales) || 0,
    joined: new Date().toISOString(),
  }
}

export function mergeProduct(existing, patch) {
  const p = { ...existing, ...patch, id: existing.id }
  p.cost = round2(Number(p.cost) || 0)
  p.price = round2(Number(p.price) || 0)
  p.stock = Number(p.stock) || 0
  p.status = productStatus(p)
  return p
}

// Build an order object + its line items from raw input. Pure — the caller
// persists the order and applies the stock/customer side-effects.
export function assembleOrder({ customer, products, items, discountPct = 0, paymentMethod = 'Cash', paymentStatus = 'Pending', branch = 'b1', repName, orderId }) {
  if (!Array.isArray(items)) return null
  const built = items.map(({ productId, qty }) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return null
    const q = Math.max(1, Number(qty) || 1)
    return { productId: p.id, name: p.name, price: p.price, qty: q, total: round2(p.price * q) }
  }).filter(Boolean)
  if (built.length === 0) return null

  // Clamp the discount to 0..100 and never let a bad value make totals negative/NaN.
  const pct = Math.min(100, Math.max(0, Number(discountPct) || 0))
  const subtotal = round2(built.reduce((s, it) => s + it.total, 0))
  const discount = round2(subtotal * (pct / 100))
  const tax = round2((subtotal - discount) * 0.12)
  const total = round2(subtotal - discount + tax)

  const order = {
    id: orderId, customerId: customer.id, customerName: customer.name, branch,
    repName, items: built, subtotal, discount, tax, total,
    status: 'New', paymentStatus, paymentMethod, deliveryStatus: 'Pending',
    createdAt: new Date().toISOString(), notes: '',
  }
  return { order, built }
}
