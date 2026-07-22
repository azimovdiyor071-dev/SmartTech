// ============================================================
// Lightweight NLU helpers — no external NLP library.
// Normalization, keyword matching and entity extraction used
// by the skill registry. Deterministic and dependency-free.
// ============================================================
import { BRANDS, CATEGORIES } from '../data/db.js'

export function normalize(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Does the query contain ANY of the given keywords/phrases?
export function has(q, ...keywords) {
  return keywords.some((k) => q.includes(k))
}

// Match a whole word (avoids "tv" matching inside "quantity").
export function hasWord(q, ...words) {
  return words.some((w) => new RegExp(`(^|\\W)${w}(\\W|$)`).test(q))
}

const CATEGORY_KEYWORDS = {
  smartphones: ['smartphone', 'phone', 'iphone', 'galaxy', 'redmi'],
  laptops: ['laptop', 'notebook', 'macbook', 'ultrabook'],
  tablets: ['tablet', 'ipad', 'matepad'],
  tvs: ['tv', 'television'],
  watches: ['watch', 'smartwatch'],
  accessories: ['accessory', 'accessories', 'earbud', 'headphone', 'buds', 'charger', 'cable', 'speaker', 'airpods'],
  printers: ['printer'],
  monitors: ['monitor', 'display'],
}

export function extractBrand(q) {
  const found = BRANDS.find((b) => q.includes(b.toLowerCase()))
  return found || null
}

export function extractCategory(q) {
  for (const cat of CATEGORIES) {
    if (q.includes(cat.name.toLowerCase())) return cat.id
    const kws = CATEGORY_KEYWORDS[cat.id] || []
    if (kws.some((k) => q.includes(k))) return cat.id
  }
  return null
}

// Extract a money amount from phrases like "$1,000", "1000 usd", "500 dollars".
export function extractAmount(q) {
  const m = q.match(/\$?\s?([\d,]+(?:\.\d+)?)\s?(?:usd|dollars?|\$)?/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function extractComparator(q) {
  if (has(q, 'more than', 'greater than', 'over', 'above', 'at least', '>')) return 'gt'
  if (has(q, 'less than', 'under', 'below', 'cheaper than', '<')) return 'lt'
  return null
}

// A "refinement" is a short follow-up like "only phones", "just black", "and available".
export function isRefinement(q) {
  return /^(only|just|and|also|filter|with|show only|now)\b/.test(q) || q.split(' ').length <= 3
}

const COLOR_WORDS = ['black', 'white', 'silver', 'gold', 'blue', 'red', 'green', 'gray', 'grey']
export function extractColor(q) {
  return COLOR_WORDS.find((c) => hasWord(q, c)) || null
}

// Build a Markdown table from columns + rows (arrays of cells).
export function mdTable(columns, rows) {
  if (rows.length === 0) return '_No matching records._'
  const header = `| ${columns.join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return `${header}\n${sep}\n${body}`
}
