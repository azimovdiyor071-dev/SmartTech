// ============================================================
// Assistant engine — language detection → NLU normalization →
// permission gate → skill. Pure function; returns a structured,
// localized answer.
// ============================================================
import { SKILLS } from './skills.js'
import { detectLang, toCanonical } from './lang.js'
import { tt } from './localize.js'
import { DOMAIN_LABEL } from './permissions.js'
import { can } from './permissions.js'

// Resolve the reply language: a confident detection wins; otherwise
// keep the running conversation language, then the app UI language.
function resolveLang(raw, memory, appLang) {
  const d = detectLang(raw)
  if (d.confident) return d.lang
  return memory?.lang || appLang || d.lang || 'en'
}

export function runEngine(rawQuery, ctx = {}) {
  const raw = (rawQuery || '').trim()
  const memory = ctx.memory || {}
  const user = ctx.user || {}
  const lang = resolveLang(raw, memory, ctx.appLang)

  // `fallback` flags an unhandled question — the UI may route it to the LLM.
  const refusal = (fallback = false) => ({ md: tt(lang, 'refusal'), suggestions: skillSuggest(lang), memory: { lang }, isFallback: fallback })

  if (!raw) return refusal(false)

  const q = toCanonical(raw)
  const skillCtx = { user, memory: { ...memory, lang }, lang, raw }

  const skill = SKILLS.find((s) => {
    try { return s.test(q, skillCtx) } catch { return false }
  })

  if (!skill) return refusal(true)

  if (!can(user.role, skill.domain)) {
    const label = DOMAIN_LABEL[skill.domain] || skill.domain
    return { md: tt(lang, 'restricted', { role: user.role || '—', domain: label }), memory: { lang } }
  }

  const answer = skill.run(q, skillCtx)
  // Always carry the resolved language forward in memory.
  return { ...answer, skill: skill.id, memory: { ...(answer.memory || {}), lang } }
}

// Localized default suggestion chips for the refusal/fallback message.
function skillSuggest(lang) {
  const M = {
    en: ["Today's sales", 'Best products', 'Pending payments', 'How do I create an order?'],
    uz: ['Bugungi savdo', 'Eng yaxshi mahsulotlar', "To'lov kutayotgan buyurtmalar", 'Buyurtma qanday yarataman?'],
    ru: ['Продажи сегодня', 'Лучшие товары', 'Ожидают оплаты', 'Как создать заказ?'],
  }
  return M[lang] || M.en
}
