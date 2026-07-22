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
import { askGemini } from './assistant.js'

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

// Warn loudly if the JWT secret was never changed.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'smarttech-crm-dev-secret-change-me') {
  console.warn('⚠️  JWT_SECRET is not set to a strong value — set it in server/.env before deploying.')
}

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(e.status || 500).json({ error: e.message || 'Server error' }))

// ---------- health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, backend: backendLabel, time: new Date().toISOString() }))

// ---------- auth ----------
app.post('/api/auth/register', wrap(async (req, res) => res.status(201).json(await register(req.body))))
app.post('/api/auth/login', wrap(async (req, res) => res.json(await login(req.body))))
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

// ---------- AI assistant (general questions via Gemini) ----------
app.post('/api/assistant', requireAuth, wrap(async (req, res) => {
  const { query, history, image } = req.body || {}
  const hasImage = image && image.data
  if ((!query || !String(query).trim()) && !hasImage) return res.status(400).json({ error: 'Empty query' })
  res.json(await askGemini(String(query || ''), Array.isArray(history) ? history : [], hasImage ? image : null))
}))

// ---------- bootstrap ----------
app.get('/api/bootstrap', requireAuth, wrap(async (_req, res) => res.json(await repo.bootstrap())))

// ---------- customers ----------
app.get('/api/customers', requireAuth, wrap(async (_req, res) => res.json(await repo.listCustomers())))
app.post('/api/customers', requireAuth, wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertCustomer(req.body))
}))
app.patch('/api/customers/:id', requireAuth, wrap(async (req, res) => {
  const c = await repo.updateCustomer(req.params.id, req.body)
  if (!c) return res.status(404).json({ error: 'Customer not found' })
  res.json(c)
}))
app.delete('/api/customers/:id', requireAuth, wrap(async (req, res) => { await repo.deleteCustomer(req.params.id); res.json({ ok: true }) }))

// ---------- products ----------
app.get('/api/products', requireAuth, wrap(async (_req, res) => res.json(await repo.listProducts())))
app.post('/api/products', requireAuth, wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertProduct(req.body))
}))
app.patch('/api/products/:id', requireAuth, wrap(async (req, res) => {
  const p = await repo.updateProduct(req.params.id, req.body)
  if (!p) return res.status(404).json({ error: 'Product not found' })
  res.json(p)
}))
app.delete('/api/products/:id', requireAuth, wrap(async (req, res) => { await repo.deleteProduct(req.params.id); res.json({ ok: true }) }))

// ---------- employees ----------
app.get('/api/employees', requireAuth, wrap(async (_req, res) => res.json(await repo.listEmployees())))
app.post('/api/employees', requireAuth, wrap(async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required' })
  res.status(201).json(await repo.insertEmployee(req.body))
}))
app.patch('/api/employees/:id', requireAuth, wrap(async (req, res) => {
  const e = await repo.updateEmployee(req.params.id, req.body)
  if (!e) return res.status(404).json({ error: 'Employee not found' })
  res.json(e)
}))
app.delete('/api/employees/:id', requireAuth, wrap(async (req, res) => { await repo.deleteEmployee(req.params.id); res.json({ ok: true }) }))

// ---------- orders ----------
app.get('/api/orders', requireAuth, wrap(async (_req, res) => res.json(await repo.listOrders())))
app.post('/api/orders', requireAuth, wrap(async (req, res) => {
  const { order, error } = await repo.createOrder(req.body, req.user.name)
  if (error) return res.status(400).json({ error })
  res.status(201).json(order)
}))
app.patch('/api/orders/:id', requireAuth, wrap(async (req, res) => {
  const o = await repo.updateOrder(req.params.id, req.body)
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
