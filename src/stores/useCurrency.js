import { create } from 'zustand'

// Currency selection + conversion. Base amounts are stored in USD;
// display converts to the chosen currency. Rates are approximate and
// editable in one place.
const RATES = { USD: 1, UZS: 12650, RUB: 90 }
const SYMBOLS = { USD: '$', UZS: "so'm", RUB: '₽' }

function initial() {
  try {
    const saved = localStorage.getItem('stc.currency')
    if (saved && RATES[saved]) return saved
  } catch { /* ignore */ }
  return 'USD'
}

export const useCurrency = create((set) => ({
  currency: initial(),
  rates: RATES,
  symbols: SYMBOLS,
  setCurrency: (currency) => {
    if (!RATES[currency]) return
    try { localStorage.setItem('stc.currency', currency) } catch { /* ignore */ }
    set({ currency })
  },
}))

export const CURRENCIES = Object.keys(RATES)
