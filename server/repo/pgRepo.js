// PostgreSQL-backed repository (used when DATABASE_URL is set).
// Documents are stored as JSONB keyed by id — same shapes as the file
// store, real SQL, real transactions. Columns can be normalised later.
import pg from 'pg'
import { buildSeed } from '../seed.js'
import {
  productStatus, nextId, nextOrderId, buildCustomer, buildProduct, buildEmployee, mergeProduct, assembleOrder, round2,
} from './helpers.js'

const { Pool } = pg
let pool

export const label = 'PostgreSQL'

const isLocal = (url) => /@(localhost|127\.0\.0\.1)/.test(url || '')

export async function init() {
  const url = process.env.DATABASE_URL
  pool = new Pool({
    connectionString: url,
    ssl: isLocal(url) ? false : { rejectUnauthorized: false },
    max: 5,
  })
  await ensureSchema()
  await seedIfEmpty()
}

async function ensureSchema() {
  await pool.query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, data JSONB NOT NULL)')
  await pool.query('CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data JSONB NOT NULL)')
  await pool.query('CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data JSONB NOT NULL)')
  await pool.query('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB NOT NULL)')
  await pool.query('CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, data JSONB NOT NULL)')
}

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users')
  if (rows[0].n > 0) { console.log('📂 PostgreSQL already seeded'); return }
  const seed = await buildSeed()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const u of seed.users) await client.query('INSERT INTO users(id,email,data) VALUES($1,$2,$3)', [u.id, u.email, JSON.stringify(u)])
    for (const c of seed.customers) await client.query('INSERT INTO customers(id,data) VALUES($1,$2)', [c.id, JSON.stringify(c)])
    for (const p of seed.products) await client.query('INSERT INTO products(id,data) VALUES($1,$2)', [p.id, JSON.stringify(p)])
    for (const o of seed.orders) await client.query('INSERT INTO orders(id,data) VALUES($1,$2)', [o.id, JSON.stringify(o)])
    for (const e of seed.employees) await client.query('INSERT INTO employees(id,data) VALUES($1,$2)', [e.id, JSON.stringify(e)])
    await client.query('COMMIT')
    console.log('🌱 Seeded PostgreSQL')
  } catch (e) {
    await client.query('ROLLBACK'); throw e
  } finally {
    client.release()
  }
}

const rowsData = (r) => r.rows.map((x) => x.data)

export async function bootstrap() {
  const [customers, products, orders, employees] = await Promise.all([listCustomers(), listProducts(), listOrders(), listEmployees()])
  return { customers, products, orders, employees }
}

// ---- users ----
export async function findUserByEmail(email) {
  const r = await pool.query('SELECT data FROM users WHERE lower(email)=lower($1)', [email])
  return r.rows[0]?.data || null
}
export async function findUserById(id) {
  const r = await pool.query('SELECT data FROM users WHERE id=$1', [id])
  return r.rows[0]?.data || null
}
export async function insertUser(user) {
  await pool.query('INSERT INTO users(id,email,data) VALUES($1,$2,$3)', [user.id, user.email, JSON.stringify(user)])
  return user
}
export async function countUsers() {
  const r = await pool.query('SELECT count(*)::int AS n FROM users')
  return r.rows[0].n
}

// ---- customers ----
export async function listCustomers() {
  return rowsData(await pool.query("SELECT data FROM customers ORDER BY data->>'joined' DESC NULLS LAST"))
}
export async function insertCustomer(input) {
  const ids = (await pool.query('SELECT id FROM customers')).rows.map((r) => r.id)
  const c = buildCustomer(input, nextId(ids, 'C'))
  await pool.query('INSERT INTO customers(id,data) VALUES($1,$2)', [c.id, JSON.stringify(c)])
  return c
}
export async function updateCustomer(id, patch) {
  const r = await pool.query('UPDATE customers SET data = data || $2::jsonb WHERE id=$1 RETURNING data', [id, JSON.stringify({ ...patch, id })])
  return r.rows[0]?.data || null
}
export async function deleteCustomer(id) {
  await pool.query('DELETE FROM customers WHERE id=$1', [id])
}

// ---- products ----
export async function listProducts() {
  return rowsData(await pool.query('SELECT data FROM products ORDER BY id'))
}
export async function insertProduct(input) {
  const ids = (await pool.query('SELECT id FROM products')).rows.map((r) => r.id)
  const p = buildProduct(input, nextId(ids, 'P'))
  await pool.query('INSERT INTO products(id,data) VALUES($1,$2)', [p.id, JSON.stringify(p)])
  return p
}
export async function updateProduct(id, patch) {
  const cur = await pool.query('SELECT data FROM products WHERE id=$1', [id])
  if (!cur.rows.length) return null
  const merged = mergeProduct(cur.rows[0].data, patch)
  await pool.query('UPDATE products SET data=$2 WHERE id=$1', [id, JSON.stringify(merged)])
  return merged
}
export async function deleteProduct(id) {
  await pool.query('DELETE FROM products WHERE id=$1', [id])
}

// ---- employees ----
export async function listEmployees() {
  return rowsData(await pool.query('SELECT data FROM employees ORDER BY id'))
}
export async function insertEmployee(input) {
  const ids = (await pool.query('SELECT id FROM employees')).rows.map((r) => r.id)
  const e = buildEmployee(input, nextId(ids, 'E'))
  await pool.query('INSERT INTO employees(id,data) VALUES($1,$2)', [e.id, JSON.stringify(e)])
  return e
}
export async function updateEmployee(id, patch) {
  const r = await pool.query('UPDATE employees SET data = data || $2::jsonb WHERE id=$1 RETURNING data', [id, JSON.stringify({ ...patch, id })])
  return r.rows[0]?.data || null
}
export async function deleteEmployee(id) {
  await pool.query('DELETE FROM employees WHERE id=$1', [id])
}

// ---- orders ----
export async function listOrders() {
  return rowsData(await pool.query("SELECT data FROM orders ORDER BY data->>'createdAt' DESC"))
}
export async function createOrder(payload, repName) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cRes = await client.query('SELECT data FROM customers WHERE id=$1 FOR UPDATE', [payload.customerId])
    if (!cRes.rows.length) { await client.query('ROLLBACK'); return { error: 'Customer required' } }
    const customer = cRes.rows[0].data
    const products = rowsData(await client.query('SELECT data FROM products'))
    const ids = (await client.query('SELECT id FROM orders')).rows.map((r) => r.id)

    const assembled = assembleOrder({ ...payload, customer, products, repName, orderId: nextOrderId(ids) })
    if (!assembled) { await client.query('ROLLBACK'); return { error: 'At least one item required' } }
    const { order, built } = assembled

    await client.query('INSERT INTO orders(id,data) VALUES($1,$2)', [order.id, JSON.stringify(order)])
    for (const it of built) {
      const pr = await client.query('SELECT data FROM products WHERE id=$1 FOR UPDATE', [it.productId])
      if (pr.rows.length) {
        const p = pr.rows[0].data
        p.stock = Math.max(0, p.stock - it.qty)
        p.sold += it.qty
        p.status = productStatus(p)
        await client.query('UPDATE products SET data=$2 WHERE id=$1', [p.id, JSON.stringify(p)])
      }
    }
    customer.orders += 1
    customer.totalSpent = round2(customer.totalSpent + order.total)
    customer.loyaltyPoints += Math.round(order.total / 10)
    customer.lastOrder = order.createdAt
    await client.query('UPDATE customers SET data=$2 WHERE id=$1', [customer.id, JSON.stringify(customer)])

    await client.query('COMMIT')
    return { order }
  } catch (e) {
    await client.query('ROLLBACK'); throw e
  } finally {
    client.release()
  }
}
export async function updateOrder(id, patch) {
  const r = await pool.query('UPDATE orders SET data = data || $2::jsonb WHERE id=$1 RETURNING data', [id, JSON.stringify({ ...patch, id })])
  return r.rows[0]?.data || null
}
