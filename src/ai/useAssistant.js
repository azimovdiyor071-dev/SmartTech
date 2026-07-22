import { create } from 'zustand'
import { getProvider } from './provider.js'
import { useAuth } from '../stores/useAuth.js'
import { useI18n } from '../i18n/useI18n.js'
import { api } from '../services/api.js'
import { tt } from './localize.js'

const KEY = 'stc.assistant'
let mid = 0
const nextId = () => `m${Date.now()}_${++mid}`

function welcome(lang) {
  const name = useAuth.getState().user?.name?.split(' ')[0] || ''
  return { id: 'welcome', role: 'assistant', md: tt(lang, 'greeting', { name }) }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.messages?.length) return { messages: parsed.messages, memory: parsed.memory || {} }
  } catch { /* ignore */ }
  return null
}

const persist = (messages, memory) => {
  try { localStorage.setItem(KEY, JSON.stringify({ messages: messages.slice(-40), memory })) } catch { /* ignore */ }
}

const saved = load()
const initialLang = (typeof localStorage !== 'undefined' && localStorage.getItem('stc.lang')) || 'en'

export const useAssistant = create((set, get) => ({
  open: false,
  maximized: false,
  typing: false,
  messages: saved?.messages || [welcome(initialLang)],
  memory: saved?.memory || {},

  toggleOpen: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  toggleMax: () => set((s) => ({ maximized: !s.maximized })),

  clear: () => {
    const lang = useI18n.getState().lang
    const msgs = [welcome(lang)]
    set({ messages: msgs, memory: { lang } })
    persist(msgs, { lang })
  },

  send: async (text) => {
    const query = (text || '').trim()
    if (!query || get().typing) return

    const user = useAuth.getState().user || {}
    const appLang = useI18n.getState().lang
    const userMsg = { id: nextId(), role: 'user', md: query }
    set((s) => ({ messages: [...s.messages, userMsg], typing: true }))

    await new Promise((r) => setTimeout(r, 420))

    let answer
    try {
      answer = await getProvider().generate({ query, user, memory: get().memory, appLang, history: get().messages })
      // Hybrid: CRM questions answered locally; anything else → the real AI (Gemini).
      if (answer.isFallback) {
        try {
          const history = get().messages.slice(-6).map((m) => ({ role: m.role, md: m.md }))
          const ai = await api.post('/assistant', { query, history })
          if (ai?.md) answer = { md: ai.md }
        } catch { /* keep the local fallback message if the AI is unavailable */ }
      }
    } catch {
      answer = { md: '⚠️ Something went wrong. Please try again.' }
    }

    const memory = { ...get().memory, ...(answer.memory || {}) }
    const botMsg = { id: nextId(), role: 'assistant', md: answer.md, suggestions: answer.suggestions }
    set((s) => {
      const messages = [...s.messages, botMsg]
      persist(messages, memory)
      return { messages, memory, typing: false }
    })
  },
}))
