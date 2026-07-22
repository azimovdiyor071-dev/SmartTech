import { create } from 'zustand'
import { NOTIFICATIONS } from '../data/db.js'

// Shared notifications state so the unread badge (sidebar), the bell dot
// (topbar) and the Notifications page all stay in sync. Persisted so
// "mark all read" survives a refresh.
const KEY = 'stc.notifications'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p
    }
  } catch { /* ignore */ }
  return null
}

const persist = (items) => {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
}

const initial = load() || NOTIFICATIONS.map((n) => ({ ...n }))

let seq = 0

export const useNotifications = create((set) => ({
  items: initial,
  addNotification: (n) => set((s) => {
    const item = { id: `n${Date.now()}_${++seq}`, read: false, time: new Date().toISOString(), type: 'order', ...n }
    const items = [item, ...s.items]
    persist(items)
    return { items }
  }),
  markAllRead: () => set((s) => {
    const items = s.items.map((n) => ({ ...n, read: true }))
    persist(items)
    return { items }
  }),
  markRead: (id) => set((s) => {
    const items = s.items.map((n) => (n.id === id ? { ...n, read: true } : n))
    persist(items)
    return { items }
  }),
}))

// Selector helper for the unread count.
export const selectUnread = (s) => s.items.filter((n) => !n.read).length
