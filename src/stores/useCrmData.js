import { create } from 'zustand'
import { api } from '../services/api.js'

// ============================================================
// CRM data, served by the backend API. The store caches the
// collections locally for reactive rendering; every mutation is
// persisted on the server (single source of truth).
// ============================================================

export const useCrmData = create((set, get) => ({
  customers: [],
  products: [],
  orders: [],
  employees: [],
  status: 'idle', // idle | loading | ready | error
  error: null,

  load: async () => {
    if (get().status === 'loading') return
    set({ status: 'loading', error: null })
    try {
      const { customers, products, orders, employees = [] } = await api.get('/bootstrap')
      set({ customers, products, orders, employees, status: 'ready' })
    } catch (err) {
      set({ status: 'error', error: err.message })
    }
  },

  reset: () => set({ customers: [], products: [], orders: [], employees: [], status: 'idle', error: null }),

  // ---------- customers ----------
  addCustomer: async (input) => {
    const c = await api.post('/customers', input)
    set((s) => ({ customers: [c, ...s.customers] }))
    return c
  },
  updateCustomer: async (id, patch) => {
    const c = await api.patch(`/customers/${id}`, patch)
    set((s) => ({ customers: s.customers.map((x) => (x.id === id ? c : x)) }))
    return c
  },
  deleteCustomer: async (id) => {
    await api.del(`/customers/${id}`)
    set((s) => ({ customers: s.customers.filter((x) => x.id !== id) }))
  },

  // ---------- products ----------
  addProduct: async (input) => {
    const p = await api.post('/products', input)
    set((s) => ({ products: [p, ...s.products] }))
    return p
  },
  updateProduct: async (id, patch) => {
    const p = await api.patch(`/products/${id}`, patch)
    set((s) => ({ products: s.products.map((x) => (x.id === id ? p : x)) }))
    return p
  },
  deleteProduct: async (id) => {
    await api.del(`/products/${id}`)
    set((s) => ({ products: s.products.filter((x) => x.id !== id) }))
  },
  adjustStock: async (id, delta) => {
    const p = get().products.find((x) => x.id === id)
    if (!p) return
    await get().updateProduct(id, { stock: Math.max(0, p.stock + delta) })
  },

  // ---------- employees ----------
  addEmployee: async (input) => {
    const e = await api.post('/employees', input)
    set((s) => ({ employees: [e, ...s.employees] }))
    return e
  },
  updateEmployee: async (id, patch) => {
    const e = await api.patch(`/employees/${id}`, patch)
    set((s) => ({ employees: s.employees.map((x) => (x.id === id ? e : x)) }))
    return e
  },
  deleteEmployee: async (id) => {
    await api.del(`/employees/${id}`)
    set((s) => ({ employees: s.employees.filter((x) => x.id !== id) }))
  },

  // ---------- orders ----------
  // Server reduces stock + rolls up the customer, so resync afterwards.
  createOrder: async (payload) => {
    const order = await api.post('/orders', payload)
    await get().load()
    return order
  },
  updateOrder: async (id, patch) => {
    const o = await api.patch(`/orders/${id}`, patch)
    set((s) => ({ orders: s.orders.map((x) => (x.id === id ? o : x)) }))
    return o
  },
}))
