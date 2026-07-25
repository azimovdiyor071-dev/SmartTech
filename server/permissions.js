// Server-side role enforcement (mirrors the client matrix in src/ai/permissions.js).
// The UI/AI gate is convenience; THIS is the real guard, so a low-privilege user
// can't perform an action by calling the REST API directly.
const ALL = '*'

const MATRIX = {
  'Super Admin': ALL,
  CEO: ALL,
  'Branch Manager': ['sales', 'customers', 'products', 'inventory', 'orders', 'payments', 'invoices', 'warranty', 'service', 'delivery', 'employees', 'branches', 'reports'],
  'Sales Manager': ['sales', 'customers', 'products', 'inventory', 'orders', 'payments', 'invoices', 'warranty', 'branches', 'reports'],
  Cashier: ['sales', 'customers', 'products', 'orders', 'payments', 'invoices'],
  'Warehouse Manager': ['products', 'inventory', 'delivery', 'warranty'],
  'Service Technician': ['warranty', 'service', 'products'],
  'Delivery Staff': ['delivery', 'orders'],
  Accountant: ['sales', 'payments', 'invoices', 'reports', 'branches', 'employees'],
}

export function can(role, domain) {
  const allowed = MATRIX[role]
  if (!allowed) return false
  if (allowed === ALL) return true
  return allowed.includes(domain)
}

// Express middleware: block the request unless the signed-in user's role is
// allowed to touch `domain`. Use after requireAuth (which sets req.user).
export const authorize = (domain) => (req, res, next) => {
  if (can(req.user?.role, domain)) return next()
  return res.status(403).json({ error: 'Your role is not allowed to perform this action' })
}