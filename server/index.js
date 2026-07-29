import './env.js' // must be first — loads .env before the repo picks a backend
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import repo, { backendLabel } from './repo/index.js'
import { requireAuth, register, login, publicUser } from './auth.js'
import { askGemini, scanInvoice } from './assistant.js'
import { authorize, can } from './permissions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.set('trust proxy', 1) // correct client IPs behind Render/Vercel proxies

// Security headers. CSP disabled because we serve the SPA (inline styles) here.
app.use(helmet({ contentSecurityPolicy: false }))

// CORS: allow only the configured frontend origin(s) in production.
const allowed = process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({ origin: allowed && allowed.length ? allowed : true }))

// Body size limit (generous to allow base64 images sent to the AI).
app.use(express.json({ limit: '12mb' }))

// Rate limiting: a general cap, plus a stricter one on auth endpoints.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } })
app.use('/api', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// The JWT secret must be strong. On a real deployment (DATABASE_URL set) refuse
// to boot with the default/empty secret — otherwise anyone could forge an admin
// token with the public repo constant. Local file-mode dev only warns.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'smarttech-crm-dev-secret-change-me') {
  const msg = 'JWT_SECRET is not set to a strong, unique value.'
  if (process.env.DATABASE_URL) {
    console.error(`❌ ${msg} Refusing to start — set JWT_SECRET in the environment.`)
    process.exit(1)
  }
  console.warn(`⚠️  ${msg} (fine for local dev; set it before deploying.)`)
}

// Never leak internal error text on 5xx; keep the client message for 4xx.
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  const status = e.status || 500
  if (status >= 500) { console.error('API error:', e); return res.status(500).json({ error: 'Server error' }) }
  res.status(status).json({ error: e.message || 'Request failed' })
})

// Only let clients write these fields; everything else (financial totals,
// customer/employee aggregates, sold counts) is derived/managed server-side.
const pick = (obj, keys) => { const o = {}; for (const k of keys) if (obj && obj[k] !== undefined) o[k] = obj[k]; return o }
const CUSTOMER_FIELDS = ['name', 'email', 'phone', 'city', 'branch', 'segment', 'status', 'notes']
const PRODUCT_FIELDS = ['name', 'brand', 'category', 'sku', 'barcode', 'imei', 'price', 'cost', 'stock', 'reorderLevel', 'warrantyMonths', 'icon']
const EMPLOYEE_FIELDS = ['name', 'email', 'phone', 'role', 'branch', 'status', 'sales']
const ORDER_FIELDS = ['status', 'paymentStatus', 'deliveryStatus', 'paymentMethod', 'notes']

// ---------- health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, backend: backendLabel, time: new Date().toISOString() }))

// ---------- auth ----------
app.post('/api/auth/register', wrap(async (req, res) => res.status(201).json(await register(req.body))))
app.post('/api/auth/login', wrap(async (req, res) => res.json(await login(req.body))))
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))
app.patch('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60)
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const updated = await repo.updateUser(req.user.id, { name })
  if (!updated) return res.status(404).json({ error: 'User not found' })
  res.json({ user: publicUser(updated) })
}))

// ---------- AI assistant (general questions via Gemini) ----------
app.post('/api/assistant', requireAuth, wrap(async (req, res) => {
  const { query, history, image } = req.body || {}
  const hasImage = image && image.data
  if ((!query || !String(query).trim()) && !hasImage) return res.status(400).json({ error: 'Empty query' })
  res.json(await askGemini(String(query || ''), Array.isArray(history) ? history : [], hasImage ? image : null))
}))

// Read a photographed invoice → structured line items (added after confirmation).
app.post('/api/assistant/scan-invoice', requireAuth, wrap(async (req, res) => {
  const { image } = req.body || {}
  if (!image || !image.data) return res.status(400).json({ error: 'Image required' })
  res.json(await scanInvoice(image))
}))

// ---------- bootstrap ----------
// Return only the collections this role may read (mirrors the mutation gates).
app.get('/api/bootstrap', requireAuth, wrap(async (req, res) => {
  const role = req.user.role
  const all = await repo.bootstrap()
  res.json({
    customers: can(role, 'customers') ? all.customers : [],
    products: can(role, 'products') ? all.products : [],
    orders: can(role, 'orders') ? all.orders : [],
    employees: can(role, 'employees') ? all.employees : [],
  })
}))

// ---------- customers ----------
app.get('/api/customers', requireAuth, authorize('customers'), wrap(async (_req, res) => res.json(await repo.listCustomers())))
app.post('/api/customers', requireAuth, authorize('customers'), wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertCustomer(pick(req.body, CUSTOMER_FIELDS)))
}))
app.patch('/api/customers/:id', requireAuth, authorize('customers'), wrap(async (req, res) => {
  const c = await repo.updateCustomer(req.params.id, pick(req.body, CUSTOMER_FIELDS))
  if (!c) return res.status(404).json({ error: 'Customer not found' })
  res.json(c)
}))
app.delete('/api/customers/:id', requireAuth, authorize('customers'), wrap(async (req, res) => { await repo.deleteCustomer(req.params.id); res.json({ ok: true }) }))

// ---------- products ----------
app.get('/api/products', requireAuth, authorize('products'), wrap(async (_req, res) => res.json(await repo.listProducts())))
app.post('/api/products', requireAuth, authorize('products'), wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertProduct(pick(req.body, PRODUCT_FIELDS)))
}))
app.patch('/api/products/:id', requireAuth, authorize('products'), wrap(async (req, res) => {
  const p = await repo.updateProduct(req.params.id, pick(req.body, PRODUCT_FIELDS))
  if (!p) return res.status(404).json({ error: 'Product not found' })
  res.json(p)
}))
app.delete('/api/products/:id', requireAuth, authorize('products'), wrap(async (req, res) => { await repo.deleteProduct(req.params.id); res.json({ ok: true }) }))

// ---------- employees ----------
app.get('/api/employees', requireAuth, authorize('employees'), wrap(async (_req, res) => res.json(await repo.listEmployees())))
app.post('/api/employees', requireAuth, authorize('employees'), wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertEmployee(pick(req.body, EMPLOYEE_FIELDS)))
}))
app.patch('/api/employees/:id', requireAuth, authorize('employees'), wrap(async (req, res) => {
  const e = await repo.updateEmployee(req.params.id, pick(req.body, EMPLOYEE_FIELDS))
  if (!e) return res.status(404).json({ error: 'Employee not found' })
  res.json(e)
}))
app.delete('/api/employees/:id', requireAuth, authorize('employees'), wrap(async (req, res) => { await repo.deleteEmployee(req.params.id); res.json({ ok: true }) }))

// ---------- orders ----------
app.get('/api/orders', requireAuth, authorize('orders'), wrap(async (_req, res) => res.json(await repo.listOrders())))
app.post('/api/orders', requireAuth, authorize('orders'), wrap(async (req, res) => {
  const { items, discountPct, paymentMethod, paymentStatus, branch, customerId } = req.body || {}
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'At least one item is required' })
  if (discountPct !== undefined && (!Number.isFinite(Number(discountPct)) || Number(discountPct) < 0 || Number(discountPct) > 100)) {
    return res.status(400).json({ error: 'discountPct must be a number between 0 and 100' })
  }
  const clean = { customerId, items, discountPct, paymentMethod, paymentStatus, branch }
  const { order, error } = await repo.createOrder(clean, req.user.name)
  if (error) return res.status(400).json({ error })
  res.status(201).json(order)
}))
app.patch('/api/orders/:id', requireAuth, authorize('orders'), wrap(async (req, res) => {
  const o = await repo.updateOrder(req.params.id, pick(req.body, ORDER_FIELDS))
  if (!o) return res.status(404).json({ error: 'Order not found' })
  res.json(o)
}))

// ---------- serve the built frontend (single-service deploy) ----------
// When ../dist exists (production build), serve it and fall back to
// index.html for any non-API route so client-side routing works.
const clientDir = join(__dirname, '..', 'dist')
if (existsSync(clientDir)) {
  app.use(express.static(clientDir))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(clientDir, 'index.html')))
  console.log('🖥️  Serving frontend from /dist')
}

const PORT = process.env.PORT || 4000
repo.init()
  .then(() => app.listen(PORT, () => console.log(`🚀 SmartTech CRM API on http://localhost:${PORT}  ·  storage: ${backendLabel}`)))
  .catch((err) => { console.error('❌ Failed to start:', err.message); process.exit(1) })
