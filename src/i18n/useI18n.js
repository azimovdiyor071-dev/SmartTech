import { create } from 'zustand'
import { DICTS } from './dictionaries.js'

function initialLang() {
  if (typeof window === 'undefined') return 'uz'
  const saved = localStorage.getItem('stc.lang')
  return ['en', 'uz', 'ru'].includes(saved) ? saved : 'uz' // Uzbek-first product
}

export const useI18n = create((set, get) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try { localStorage.setItem('stc.lang', lang) } catch { /* ignore */ }
    set({ lang })
  },
  t: (key) => {
    const { lang } = get()
    return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key
  },
}))

// Convenience hook: subscribing to `lang` re-renders on language change;
// `t` reads the current language internally.
export function useT() {
  const lang = useI18n((s) => s.lang)
  const t = useI18n((s) => s.t)
  return { t, lang }
}
