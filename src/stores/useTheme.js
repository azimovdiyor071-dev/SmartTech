import { create } from 'zustand'

function initial() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('stc.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme) {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme)
}

const start = initial()
apply(start)

export const useTheme = create((set, get) => ({
  theme: start,
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    apply(next)
    try { localStorage.setItem('stc.theme', next) } catch { /* ignore */ }
    set({ theme: next })
  },
}))
