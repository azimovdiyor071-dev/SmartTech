// ============================================================
// Role-based access control for the AI Assistant.
// Each skill declares a `domain`; a role may only run skills
// whose domain it is granted here. Admins get everything ('*').
// ============================================================

export const DOMAINS = [
  'sales', 'customers', 'products', 'inventory', 'orders', 'payments',
  'invoices', 'warranty', 'service', 'delivery', 'employees', 'branches',
  'reports', 'settings', 'public',
]

// Human-friendly label used in "permission denied" messages.
export const DOMAIN_LABEL = {
  sales: 'sales & revenue',
  customers: 'customer',
  products: 'product',
  inventory: 'inventory',
  orders: 'order',
  payments: 'payment',
  invoices: 'invoice',
  warranty: 'warranty',
  service: 'service',
  delivery: 'delivery',
  employees: 'employee / HR / payroll',
  branches: 'branch',
  reports: 'reporting',
  settings: 'system settings',
}

const ALL = '*'

// role -> allowed domains ('public' is always implicitly allowed)
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
  if (domain === 'public') return true
  const allowed = MATRIX[role]
  if (!allowed) return false
  if (allowed === ALL) return true
  return allowed.includes(domain)
}

// Domains a role can access (used to tailor proactive suggestions).
export function allowedDomains(role) {
  const allowed = MATRIX[role]
  if (allowed === ALL) return DOMAINS.filter((d) => d !== 'public')
  return allowed || []
}
