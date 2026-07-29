// ============================================================
// Multilingual understanding for the AI Assistant.
//   detectLang()      — uz | ru | en with a confidence flag
//   toCanonical()     — rewrites uz/ru business terms into the
//                       English tokens the skill matchers expect
//   extractSearchTerm — pulls a name/keyword out of a query in
//                       any of the three languages
// ============================================================

const CYRILLIC = /[а-яё]/i

// Uzbek written in Cyrillic (rare here, but disambiguates from Russian)
const UZ_CYRILLIC = ['савдо', 'буюртма', 'харид', 'мижоз', 'омбор', 'фойда', 'ҳисобот', 'филиал']

// Strong Uzbek (Latin) markers
const UZ_MARKERS = [
  'bugun', 'kecha', 'savdo', 'sotuv', 'sotil', 'zakaz', 'buyurtma', 'ombor', 'sklad',
  'mijoz', 'klient', 'telefon', "ko'rsat", 'korsat', 'hisobot', 'solishtir', 'taqqosla',
  'filial', 'nechta', 'qancha', 'necha', 'qoldi', 'qoldiq', 'xodim', 'ishchi', 'mahsulot',
  'tovar', 'foyda', 'daromad', 'tushum', 'kafolat', 'yetkaz', 'mavjud', 'faqat',
  'yaxshi', 'oylik', 'haftalik', 'yillik', 'qidir', 'izla', 'arzon', 'qimmat', "to'lov",
  'tolov', 'soni', 'ismli', 'nomli', 'zo\'r', 'tugab',
]

// Short Uzbek words that are substrings of common English words ("eng" in
// length/engine, "pul" in popular/pull, "kam" in camera). Match as whole words.
const UZ_EXACT = /(^|\s)(eng|pul|kam|zor)(\s|$)/

// Common Uzbek stems matched at a WORD START (so suffixes like "qilaman",
// "nimalar" still hit) without false positives inside English words
// ("minimal" must NOT look like "nima"). Kept separate from the substring list.
const UZ_PREFIX = new RegExp('(^|\\s)(' + [
  'nima', 'qanday', 'qanaqa', 'qaysi', 'kerak', 'kere', 'yordam', 'salom', 'rahmat',
  'qil', 'goya', "g'oya", 'fikr', 'maslahat', 'tavsiya', 'tahlil', 'bashorat',
  'ochir', "o'chir", 'yarat', 'qosh', "qo'sh", 'boladi', "bo'ladi", 'haqida',
  'kimlar', 'kimni', 'sotildi', 'sotdim', 'bekor', 'royxat', "ro'yxat", 'hamma', 'barcha',
].join('|') + ')')

function fold(text = '') {
  return text.toLowerCase().replace(/[ʻʼ'`ʾ]/g, "'").replace(/\s+/g, ' ').trim()
}

export function detectLang(text = '') {
  const t = fold(text)
  if (!t) return { lang: 'en', confident: false }

  if (CYRILLIC.test(t)) {
    if (UZ_CYRILLIC.some((w) => t.includes(w))) return { lang: 'uz', confident: true }
    return { lang: 'ru', confident: true }
  }

  const uzHits = UZ_MARKERS.filter((w) => t.includes(w)).length
  if (uzHits > 0) return { lang: 'uz', confident: true }
  if (UZ_PREFIX.test(t) || UZ_EXACT.test(t)) return { lang: 'uz', confident: true }

  // Latin, no Uzbek markers → English. Low confidence for very short inputs
  const words = t.split(' ').length
  return { lang: 'en', confident: words > 2 }
}

// Ordered longest-first: multi-word phrases before single stems.
const PHRASES = [
  // uz
  ["to'lov kutayotgan", 'awaiting payment'], ["to'lovsiz", 'unpaid'], ["to'lanmagan", 'unpaid'],
  ['eng ko\'p sotilgan', 'best selling'], ['eng yaxshi', 'best'], ['tugab qolgan', 'out of stock'],
  ['tugab qolayotgan', 'running out'], ['kam qolgan', 'low stock'], ['omborda qancha', 'inventory how many'],
  ['nechta zakaz', 'how many orders'], ['nechta buyurtma', 'how many orders'],
  // ru
  ['ожидающие оплаты', 'awaiting payment'], ['ожидает оплаты', 'awaiting payment'], ['ждут оплаты', 'awaiting payment'],
  ['не оплачен', 'unpaid'], ['неоплаченные', 'unpaid'], ['лучшие продажи', 'best selling'], ['самый продаваемый', 'best selling'],
  ['заканчивается на складе', 'running out'], ['нет в наличии', 'out of stock'], ['в наличии', 'available'],
  ['сколько заказов', 'how many orders'], ['лучший филиал', 'best branch'],
]

// Single stems (substring match handles inflections like продаж/продажи).
const STEMS = [
  // ---- Uzbek ----
  ['bugungi', 'today'], ['bugun', 'today'], ['kechagi', 'yesterday'], ['kecha', 'yesterday'],
  ['savdo', 'sales'], ['sotuv', 'sales'], ['sotilgan', 'sold'], ['sotildi', 'sold'],
  ['daromad', 'revenue'], ['tushum', 'revenue'], ['foyda', 'profit'], ['xarajat', 'expenses'], ['chiqim', 'expenses'],
  ['buyurtma', 'orders'], ['zakaz', 'orders'], ['nechta', 'how many'], ['qancha', 'how many'], ['necha', 'how many'],
  ['ombor', 'inventory'], ['sklad', 'inventory'], ['qoldiq', 'remaining'], ['qoldi', 'remaining'],
  ['mijoz', 'customer'], ['klient', 'customer'], ['telefon', 'phone'], ['noutbuk', 'laptop'], ['planshet', 'tablet'],
  ['televizor', 'tv'], ['printer', 'printer'], ['monitor', 'monitor'], ['soat', 'watch'],
  ["ko'rsat", 'show'], ['korsat', 'show'], ['qidir', 'find'], ['izla', 'find'], ['topib', 'find'], ['top ', 'find '],
  ['hisobot', 'report'], ['solishtir', 'compare'], ['taqqosla', 'compare'], ['filial', 'branch'],
  ['xodim', 'employee'], ['ishchi', 'employee'], ['mahsulot', 'product'], ['tovar', 'product'],
  ["to'lov", 'payment'], ['tolov', 'payment'], ['kafolat', 'warranty'], ['yetkaz', 'delivery'], ['dostavka', 'delivery'],
  ['mavjud', 'available'], ['faqat', 'only'], ['arzon', 'cheap'], ['qimmat', 'expensive'],
  ['oylik', 'month'], ['oyda', 'month'], [' oy', ' month'], ['haftalik', 'week'], ['hafta', 'week'],
  ['yillik', 'year'], [' yil', ' year'], ['eng yaxshi', 'best'], ['yaxshi', 'best'], ['kam', 'low stock'], ['tugab', 'running out'],
  ['kutayotgan', 'pending'], ['bekor', 'cancelled'], ['vip', 'vip'], ['faol', 'active'],
  // ---- Russian ----
  ['сегодня', 'today'], ['вчера', 'yesterday'], ['продаж', 'sales'], ['выручка', 'revenue'], ['доход', 'revenue'],
  ['прибыль', 'profit'], ['расход', 'expenses'], ['заказ', 'orders'], ['сколько', 'how many'],
  ['склад', 'inventory'], ['остаток', 'remaining'], ['осталось', 'remaining'], ['остатк', 'remaining'],
  ['клиент', 'customer'], ['покупател', 'customer'], ['телефон', 'phone'], ['ноутбук', 'laptop'], ['планшет', 'tablet'],
  ['телевизор', 'tv'], ['принтер', 'printer'], ['монитор', 'monitor'], ['часы', 'watch'],
  ['покажи', 'show'], ['показать', 'show'], ['найди', 'find'], ['найти', 'find'], ['поиск', 'find'], ['ищи', 'find'],
  ['отчет', 'report'], ['отчёт', 'report'], ['сравн', 'compare'], ['филиал', 'branch'],
  ['сотрудник', 'employee'], ['работник', 'employee'], ['зарплат', 'payroll'], ['оклад', 'payroll'],
  ['товар', 'product'], ['продукт', 'product'], ['оплат', 'payment'], ['платеж', 'payment'], ['платёж', 'payment'],
  ['гарант', 'warranty'], ['доставк', 'delivery'], ['доступн', 'available'], ['только', 'only'],
  ['дешев', 'cheap'], ['дорог', 'expensive'], ['месяц', 'month'], ['недел', 'week'], ['год', 'year'], ['года', 'year'],
  ['лучш', 'best'], ['мало', 'low stock'], ['заканчива', 'running out'], ['ожида', 'pending'], ['отмен', 'cancelled'],
  ['продано', 'sold'], ['возврат', 'refund'], ['накладн', 'invoice'], ['счет', 'invoice'], ['счёт', 'invoice'],
]

export function toCanonical(text = '') {
  let s = ` ${fold(text)} `
  for (const [needle, repl] of PHRASES) s = s.split(needle).join(` ${repl} `)
  for (const [needle, repl] of STEMS) if (s.includes(needle)) s = s.split(needle).join(` ${repl} `)
  return s.replace(/\s+/g, ' ').trim()
}

// Words to strip when isolating a searched name/keyword (all languages).
const STOPWORDS = new Set([
  'find', 'search', 'show', 'look', 'up', 'for', 'me', 'the', 'a', 'an', 'please', 'get',
  'customer', 'client', 'clients', 'product', 'products', 'order', 'orders', 'employee', 'by', 'name', 'named',
  'top', 'qidir', 'izla', 'topib', "ko'rsat", 'korsat', 'ismli', 'nomli', 'degan', 'mijoz', 'mijozni',
  'klient', 'klientni', 'mahsulot', 'tovar', 'buyurtma', 'zakaz', 'nomli',
  'найди', 'найти', 'покажи', 'показать', 'поиск', 'ищи', 'клиент', 'клиента', 'клиентов',
  'товар', 'заказ', 'по', 'имени', 'сотрудник',
])

export function extractSearchTerm(text = '') {
  return fold(text)
    .replace(/[#№.,!?]/g, ' ')
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ')
    .trim()
}
