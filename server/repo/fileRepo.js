// File-backed repository (default when no DATABASE_URL is set).
import { initDb, getDb, save } from '../db.js'
import {
  productStatus, nextId, nextOrderId, buildCustomer, buildProduct, buildEmployee, mergeProduct, assembleOrder, round2,
} from './helpers.js'

export const label = 'file store (server/data/db.json)'

export async function init() { await initDb() }

export async function bootstrap() {
  const { customers, products, orders, employees = [] } = getDb()
  return { customers, products, orders, employees }
}

// ---- users ----
export async function findUserByEmail(email) {
  return getDb().users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null
}
export async function findUserById(id) {
  return getDb().users.find((u) => u.id === id) || null
}
export async function insertUser(user) {
  getDb().users.push(user)
  save()
  return user
}
export async function countUsers() { return getDb().users.length }

// ---- customers ----
export async function listCustomers() { return getDb().customers }
export async function insertCustomer(input) {
  const db = getDb()
  const c = buildCustomer(input, nextId(db.customers.map((x) => x.id), 'C'))
  db.customers.unshift(c)
  save()
  return c
}
export async function updateCustomer(id, patch) {
  const c = getDb().customers.find((x) => x.id === id)
  if (!c) return null
  Object.assign(c, patch, { id })
  save()
  return c
}
export async function deleteCustomer(id) {
  const db = getDb()
  db.customers = db.customers.filter((x) => x.id !== id)
  save()
}

// ---- products ----
export async function listProducts() { return getDb().products }
export async function insertProduct(input) {
  const db = getDb()
  const p = buildProduct(input, nextId(db.products.map((x) => x.id), 'P'))
  db.products.unshift(p)
  save()
  return p
}
export async function updateProduct(id, patch) {
  const db = getDb()
  const idx = db.products.findIndex((x) => x.id === id)
  if (idx === -1) return null
  db.products[idx] = mergeProduct(db.products[idx], patch)
  save()
  return db.products[idx]
}
export async function deleteProduct(id) {
  const db = getDb()
  db.products = db.products.filter((x) => x.id !== id)
  save()
}

// ---- employees ----
export async function listEmployees() { return getDb().employees || [] }
export async function insertEmployee(input) {
  const db = getDb()
  if (!db.employees) db.employees = []
  const e = buildEmployee(input, nextId(db.employees.map((x) => x.id), 'E'))
  db.employees.unshift(e)
  save()
  return e
}
export async function updateEmployee(id, patch) {
  const e = getDb().employees.find((x) => x.id === id)
  if (!e) return null
  Object.assign(e, patch, { id })
  save()
  return e
}
export async function deleteEmployee(id) {
  const db = getDb()
  db.employees = (db.employees || []).filter((x) => x.id !== id)
  save()
}

// ---- orders ----
export async function listOrders() { return getDb().orders }
export async function createOrder(payload, repName) {
  const db = getDb()
  const customer = db.customers.find((c) => c.id === payload.customerId)
  if (!customer) return { error: 'Customer required' }
  const assembled = assembleOrder({ ...payload, customer, products: db.products, repName, orderId: nextOrderId(db.orders.map((o) => o.id)) })
  if (!assembled) return { error: 'At least one item required' }
  const { order, built } = assembled

  db.orders.unshift(order)
  for (const it of built) {
    const p = db.products.find((x) => x.id === it.productId)
    if (p) { p.stock = Math.max(0, p.stock - it.qty); p.sold += it.qty; p.status = productStatus(p) }
  }
  customer.orders += 1
  customer.totalSpent = round2(customer.totalSpent + order.total)
  customer.loyaltyPoints += Math.round(order.total / 10)
  customer.lastOrder = order.createdAt
  save()
  return { order }
}
export async function updateOrder(id, patch) {
  const o = getDb().orders.find((x) => x.id === id)
  if (!o) return null
  Object.assign(o, patch, { id })
  save()
  return o
}
