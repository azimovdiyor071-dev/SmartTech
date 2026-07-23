import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import repo from './repo/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'smarttech-crm-dev-secret-change-me'
const TOKEN_TTL = '7d'

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })

export function sign(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

// Express middleware: require a valid Bearer token.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await repo.findUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export async function register({ name, email, password, role }) {
  if (!email || !password) throw Object.assign(new Error('Email and password are required'), { status: 400 })
  email = String(email).trim()
  const exists = await repo.findUserByEmail(email)
  if (exists) throw Object.assign(new Error('Email already registered'), { status: 409 })
  const count = await repo.countUsers()
  const user = {
    id: `U${String(count + 1).padStart(3, '0')}`,
    name: name || 'New User',
    email,
    role: role || 'Cashier',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  }
  await repo.insertUser(user)
  return { token: sign(user), user: publicUser(user) }
}

export async function login({ email, password }) {
  const user = await repo.findUserByEmail(String(email || '').trim())
  if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
  return { token: sign(user), user: publicUser(user) }
}

export { publicUser }
