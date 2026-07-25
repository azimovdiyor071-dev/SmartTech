import { create } from 'zustand'
import { getProvider } from './provider.js'
import { useAuth } from '../stores/useAuth.js'
import { useI18n } from '../i18n/useI18n.js'
import { api } from '../services/api.js'
import { tt } from './localize.js'
import { executeAction, isAffirmative, isNegative, cancelledMd, isScanIntent, confirmMd, importNoneMd } from './actions.js'
import { can } from './permissions.js'

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
  // Drop attached image previews before saving (avoid localStorage bloat).
  const slim = messages.slice(-40).map((m) => (m.image ? { ...m, image: undefined } : m))
  try { localStorage.setItem(KEY, JSON.stringify({ messages: slim, memory })) } catch { /* ignore */ }
}

const saved = load()
const initialLang = (typeof localStorage !== 'undefined' && localStorage.getItem('stc.lang')) || 'uz'

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

  // Append a bot reply, persist, and clear the "typing" state. When `keepPending`
  // is false, any awaiting confirmation (memory.pendingAction) is dropped.
  finish: (md, suggestions, memory, keepPending) => {
    const mem = { ...memory }
    if (!keepPending) delete mem.pendingAction
    const botMsg = { id: nextId(), role: 'assistant', md, suggestions }
    set((s) => {
      const messages = [...s.messages, botMsg]
      persist(messages, mem)
      return { messages, memory: mem, typing: false }
    })
  },

  send: async (text, image = null) => {
    const query = (text || '').trim()
    if ((!query && !image) || get().typing) return

    const user = useAuth.getState().user || {}
    const appLang = useI18n.getState().lang
    const lang = get().memory.lang || appLang
    const userMsg = { id: nextId(), role: 'user', md: query || '📷', image: image?.preview }
    set((s) => ({ messages: [...s.messages, userMsg], typing: true }))

    // 1) Confirmation step — an action is waiting for a yes/no.
    const pending = get().memory.pendingAction
    if (pending && !image) {
      if (isAffirmative(query)) {
        let result
        try { result = await executeAction(pending, lang) } catch { result = { md: '⚠️ Something went wrong. Please try again.' } }
        get().finish(result.md, undefined, get().memory, false)
        return
      }
      if (isNegative(query)) {
        get().finish(cancelledMd(lang), undefined, get().memory, false)
        return
      }
      // Neither yes nor no → treat as a brand-new request (pending cleared below).
    }

    // 2) Normal flow: local engine (incl. action confirmations) → LLM fallback.
    let answer
    try {
      if (image && isScanIntent(query)) {
        // Invoice photo → extract line items, then confirm before adding them.
        if (!can(user.role, 'products')) {
          answer = { md: tt(lang, 'restricted', { role: user.role || '—', domain: 'product' }) }
        } else {
          const r = await api.post('/assistant/scan-invoice', { image: { data: image.data, mimeType: image.mimeType } })
          if (r?.items?.length) {
            const d = { type: 'products.import', domain: 'products', items: r.items }
            answer = { md: confirmMd(d, lang), memory: { pendingAction: d } }
          } else {
            answer = { md: importNoneMd(lang) }
          }
        }
      } else if (image) {
        // A general image question → send straight to the vision AI.
        const history = get().messages.slice(-6).map((m) => ({ role: m.role, md: m.md }))
        answer = await api.post('/assistant', { query, history, image: { data: image.data, mimeType: image.mimeType } })
      } else {
        answer = await getProvider().generate({ query, user, memory: get().memory, appLang, history: get().messages })
        // Hybrid: CRM questions answered locally; anything else → the real AI (Gemini).
        if (answer.isFallback) {
          try {
            const history = get().messages.slice(-6).map((m) => ({ role: m.role, md: m.md }))
            const ai = await api.post('/assistant', { query, history })
            if (ai?.md) answer = { md: ai.md }
          } catch { /* keep the local fallback message if the AI is unavailable */ }
        }
      }
    } catch {
      answer = { md: '⚠️ Something went wrong. Please try again.' }
    }

    const memory = { ...get().memory, ...(answer.memory || {}) }
    // Keep a freshly-requested action pending; otherwise clear any stale one.
    get().finish(answer.md, answer.suggestions, memory, !!answer.memory?.pendingAction)
  },
}))
