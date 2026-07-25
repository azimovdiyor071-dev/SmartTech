// ============================================================
// Assistant ACTIONS — turn natural language into real CRM operations
// (create an order, delete a customer/employee/product, cancel an order)
// plus name resolution shared with the profile skill.
//
// Flow: parseAction() detects intent + resolves entities → the engine
// returns a confirmation and stashes the descriptor in memory.pendingAction.
// When the user confirms ("ha/yes/да"), useAssistant runs executeAction().
// Nothing is ever changed without an explicit confirmation.
// ============================================================
import { useCrmData } from '../stores/useCrmData.js'
import { money } from '../lib/format.js'

// Normalize: lowercase, drop apostrophes/diacritics-ish, collapse spaces.
export const norm = (s) =>
  String(s || '').toLowerCase().replace(/['’`ʻ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

// Find the entity whose name best matches the text (substring-based so
// Uzbek/Russian suffixes like "Karimovga", "Азизу" still match).
export function matchEntity(text, items) {
  const t = norm(text)
  let best = null
  for (const it of items) {
    const name = norm(it.name)
    if (!name) continue
    if (t.includes(name)) {
      if (!best || name.length > best.score) best = { it, score: name.length + 100 } // full-name match wins
      continue
    }
    for (const w of name.split(' ')) {
      if (w.length >= 4 && t.includes(w)) { if (!best || w.length > best.score) best = { it, score: w.length } }
    }
  }
  return best?.it || null
}

const L = {
  en: {
    orderConfirm: (v) => `🧾 **Create this order?**\n\n- Customer: **${v.customer}**\n- Item: **${v.qty} × ${v.product}**\n- Total: **${v.total}**\n\nReply **yes** to confirm or **no** to cancel.`,
    orderDone: (v) => `✅ Order **${v.id}** created for **${v.customer}** — ${v.qty} × ${v.product} (${v.total}).`,
    orderNoCustomer: `🤔 I couldn't tell **which customer**. Try: "create an order for Aziz Karimov: 2 × iPhone 15 Pro".`,
    orderNoProduct: `🤔 I couldn't tell **which product**. Try: "create an order for Aziz Karimov: 2 × iPhone 15 Pro".`,
    delConfirm: (v) => `⚠️ **Delete ${v.kind} "${v.name}"?**\nThis can't be undone.\n\nReply **yes** to confirm or **no** to cancel.`,
    delDone: (v) => `🗑️ ${v.kind} **${v.name}** was deleted.`,
    cancelConfirm: (v) => `⚠️ **Cancel order ${v.id}** (${v.customer})?\n\nReply **yes** to confirm or **no** to cancel.`,
    cancelDone: (v) => `✅ Order **${v.id}** was cancelled.`,
    notFound: (v) => `🔍 I couldn't find a ${v.kind} matching **"${v.term}"**.`,
    cancelled: `👍 Okay, cancelled — nothing was changed.`,
    failed: `⚠️ Sorry, that action failed. Please try from the page directly.`,
    importConfirm: (v) => `📄 **Found ${v.count} product(s) on the invoice:**\n\n${v.table}\n\nAdd them to your catalogue? Reply **yes** or **no**.`,
    importDone: (v) => `✅ Added **${v.n}** product(s) to the catalogue.`,
    importNone: `🔍 I couldn't read any products from that photo. Try a clearer, well-lit picture of the invoice.`,
    importHead: ['Product', 'Qty', 'Price'],
    mkPeriod: (days) => (days % 30 === 0 ? `${days / 30} month(s)` : `${days} days`),
    mkMsg: (d) => `SmartTech: We miss you! 🎁 Enjoy ${d}% off your next purchase. Come see what's new!`,
    mkConfirm: (v) => `📢 **Marketing SMS campaign**\n\n- 👥 Recipients: **${v.count}** customer(s) inactive for ${v.period}\n- 🎁 Offer: **${v.discount}% discount**${v.sample ? `\n- e.g. ${v.sample}` : ''}\n\n✉️ Message:\n> ${v.message}\n\nSend it? Reply **yes** or **no**.`,
    mkDone: (v) => `✅ Campaign sent to **${v.n}** customer(s). To deliver real SMS, connect an SMS provider in **Settings → SMS Gateway**.`,
    mkNone: `👍 No customers match that filter right now — nobody's been inactive that long.`,
    walkIn: 'Walk-in customer',
    kindCustomer: 'customer', kindEmployee: 'employee', kindProduct: 'product', kindOrder: 'order',
  },
  uz: {
    orderConfirm: (v) => `🧾 **Shu buyurtma yaratilsinmi?**\n\n- Mijoz: **${v.customer}**\n- Mahsulot: **${v.qty} × ${v.product}**\n- Jami: **${v.total}**\n\nTasdiqlash uchun **ha**, bekor qilish uchun **yo'q** deb yozing.`,
    orderDone: (v) => `✅ **${v.customer}** uchun **${v.id}** buyurtma yaratildi — ${v.qty} × ${v.product} (${v.total}).`,
    orderNoCustomer: `🤔 **Qaysi mijoz** ekanini tushunmadim. Masalan: "Aziz Karimovga 2 ta iPhone 15 Pro buyurtma qil".`,
    orderNoProduct: `🤔 **Qaysi mahsulot** ekanini tushunmadim. Masalan: "Aziz Karimovga 2 ta iPhone 15 Pro buyurtma qil".`,
    delConfirm: (v) => `⚠️ **"${v.name}" ${v.kind} o'chirilsinmi?**\nBuni qaytarib bo'lmaydi.\n\nTasdiqlash uchun **ha**, bekor qilish uchun **yo'q** deb yozing.`,
    delDone: (v) => `🗑️ ${v.kind} **${v.name}** o'chirildi.`,
    cancelConfirm: (v) => `⚠️ **${v.id}** buyurtma (${v.customer}) bekor qilinsinmi?\n\nTasdiqlash uchun **ha**, bekor qilish uchun **yo'q**.`,
    cancelDone: (v) => `✅ **${v.id}** buyurtma bekor qilindi.`,
    notFound: (v) => `🔍 **"${v.term}"** bo'yicha ${v.kind} topilmadi.`,
    cancelled: `👍 Xo'p, bekor qildim — hech narsa o'zgartirilmadi.`,
    failed: `⚠️ Kechirasiz, amal bajarilmadi. Iltimos, bo'limning o'zidan qiling.`,
    importConfirm: (v) => `📄 **Fakturadan ${v.count} ta mahsulot topildi:**\n\n${v.table}\n\nBazaga qo'shilsinmi? **ha** yoki **yo'q** deb yozing.`,
    importDone: (v) => `✅ **${v.n}** ta mahsulot bazaga qo'shildi.`,
    importNone: `🔍 Bu rasmdan mahsulotni o'qiy olmadim. Fakturani yorug'roq va aniqroq suratga oling.`,
    importHead: ['Mahsulot', 'Soni', 'Narx'],
    mkPeriod: (days) => (days % 30 === 0 ? `${days / 30} oy` : `${days} kun`),
    mkMsg: (d) => `SmartTech: Sizni sog'indik! 🎁 Keyingi xaridingizga ${d}% chegirma. Yangiliklarni ko'rgani keling!`,
    mkConfirm: (v) => `📢 **Marketing SMS kampaniyasi**\n\n- 👥 Qabul qiluvchilar: **${v.count}** ta mijoz (${v.period} xarid qilmagan)\n- 🎁 Taklif: **${v.discount}% chegirma**${v.sample ? `\n- masalan: ${v.sample}` : ''}\n\n✉️ Xabar:\n> ${v.message}\n\nYuborilsinmi? **ha** yoki **yo'q** deb yozing.`,
    mkDone: (v) => `✅ Kampaniya **${v.n}** ta mijozga yuborildi. Haqiqiy SMS uchun **Sozlamalar → SMS Gateway** ni ulang.`,
    mkNone: `👍 Bu shartga mos mijoz yo'q — hech kim bunchalik uzoq xarid qilmay qolmagan.`,
    walkIn: 'Nomsiz mijoz (prilavka)',
    kindCustomer: 'mijoz', kindEmployee: 'hodim', kindProduct: 'mahsulot', kindOrder: 'buyurtma',
  },
  ru: {
    orderConfirm: (v) => `🧾 **Создать этот заказ?**\n\n- Клиент: **${v.customer}**\n- Товар: **${v.qty} × ${v.product}**\n- Итого: **${v.total}**\n\nОтветьте **да** для подтверждения или **нет** для отмены.`,
    orderDone: (v) => `✅ Заказ **${v.id}** создан для **${v.customer}** — ${v.qty} × ${v.product} (${v.total}).`,
    orderNoCustomer: `🤔 Не понял, **какой клиент**. Например: "создай заказ для Aziz Karimov: 2 × iPhone 15 Pro".`,
    orderNoProduct: `🤔 Не понял, **какой товар**. Например: "создай заказ для Aziz Karimov: 2 × iPhone 15 Pro".`,
    delConfirm: (v) => `⚠️ **Удалить ${v.kind} «${v.name}»?**\nЭто нельзя отменить.\n\nОтветьте **да** для подтверждения или **нет** для отмены.`,
    delDone: (v) => `🗑️ ${v.kind} **${v.name}** удалён.`,
    cancelConfirm: (v) => `⚠️ **Отменить заказ ${v.id}** (${v.customer})?\n\nОтветьте **да** или **нет**.`,
    cancelDone: (v) => `✅ Заказ **${v.id}** отменён.`,
    notFound: (v) => `🔍 ${v.kind} по запросу **«${v.term}»** не найден.`,
    cancelled: `👍 Хорошо, отменил — ничего не изменено.`,
    failed: `⚠️ Извините, действие не выполнено. Попробуйте прямо на странице.`,
    importConfirm: (v) => `📄 **На накладной найдено ${v.count} товар(ов):**\n\n${v.table}\n\nДобавить в каталог? Ответьте **да** или **нет**.`,
    importDone: (v) => `✅ Добавлено **${v.n}** товар(ов) в каталог.`,
    importNone: `🔍 Не удалось распознать товары на фото. Сфотографируйте накладную чётче и при хорошем свете.`,
    importHead: ['Товар', 'Кол-во', 'Цена'],
    mkPeriod: (days) => (days % 30 === 0 ? `${days / 30} мес.` : `${days} дн.`),
    mkMsg: (d) => `SmartTech: Мы соскучились! 🎁 Скидка ${d}% на следующую покупку. Загляните к нам!`,
    mkConfirm: (v) => `📢 **SMS-рассылка (маркетинг)**\n\n- 👥 Получатели: **${v.count}** клиент(ов), неактивны ${v.period}\n- 🎁 Предложение: **скидка ${v.discount}%**${v.sample ? `\n- напр.: ${v.sample}` : ''}\n\n✉️ Сообщение:\n> ${v.message}\n\nОтправить? Ответьте **да** или **нет**.`,
    mkDone: (v) => `✅ Рассылка отправлена **${v.n}** клиент(ам). Для реальных SMS подключите провайдера в **Настройки → SMS Gateway**.`,
    mkNone: `👍 Под этот фильтр никто не подходит — нет настолько неактивных клиентов.`,
    walkIn: 'Розничный клиент',
    kindCustomer: 'клиент', kindEmployee: 'сотрудник', kindProduct: 'товар', kindOrder: 'заказ',
  },
}
const dict = (lang) => L[lang] || L.en

// --- intent detection -------------------------------------------------------
const MAKE = /(buyurtma|zakaz|order|заказ)/
const MAKE_VERB = /(qil|yarat|rasmiylashtir|joyla|yoz|ber\b|create|make|place|add|созда|сдела|оформ|добав)/
const SALE = /(sotildi|sotdim|sotdik|sotib bo|sotvor|sold|продал|продан|реализов)/
// Questions ("how many sold today?") must NOT be treated as a sale to record.
const QUESTION = /\?|nechta|qancha|necha ta|qanch|how many|how much|сколько|какие|qaysi|which/
const DEL_VERB = /(ochir|uchir|olib tashla|delete|remove|udal|удал|убер)/
const CANCEL = /(bekor|cancel|отмен)/
const MARKET = /(sms|смс|rassil|рассыл|campaign|kampan|marketing|маркетинг|aksiya|акци|chegirma.*yub|yub.*chegirma|скидк.*отправ|отправ.*скидк)/
const DAY = 86400000

// Pull an explicit quantity ("2 ta", "3 dona", "x2", "2 pcs"), else 1.
function extractQty(t) {
  const m = t.match(/(\d+)\s*(ta|dona|pcs|pieces|шт|штук)\b/) || t.match(/[x×]\s*(\d+)/) || t.match(/(\d+)\s*[x×]/)
  const n = m ? parseInt(m[1], 10) : 1
  return Math.max(1, Math.min(999, n || 1))
}

// parseAction(raw) → descriptor | null
export function parseAction(raw) {
  const t = norm(raw)
  const { customers, products, employees, orders } = useCrmData.getState()

  // ORDER: create (a formal order) OR SALE (a quick sale, customer optional).
  // A sale is a statement ("5 sold"); skip it for questions ("how many sold?").
  const isSale = SALE.test(t) && !QUESTION.test(t)
  const isOrder = MAKE.test(t) && MAKE_VERB.test(t)
  if (isSale || isOrder) {
    const customer = matchEntity(raw, customers)
    const product = matchEntity(raw, products)
    if (!product) return { type: 'order.create', error: 'orderNoProduct' }
    // A formal "order" needs a named customer; a quick "sale" can be a walk-in.
    if (isOrder && !isSale && !customer) return { type: 'order.create', error: 'orderNoCustomer' }
    const qty = extractQty(t)
    return {
      type: 'order.create', domain: 'orders',
      customerId: customer?.id || null, customerName: customer?.name || null, walkIn: !customer,
      productId: product.id, productName: product.name, price: product.price, qty,
      total: money(product.price * qty),
    }
  }

  // MARKETING: SMS campaign to inactive customers
  if (MARKET.test(t) && /(yubor|jo.?nat|tarqat|отправ|разосл|send|blast)/.test(t)) {
    const discount = t.match(/(\d+)\s*%/) ? Math.min(90, parseInt(t.match(/(\d+)\s*%/)[1], 10)) : 10
    let days = 90
    const mo = t.match(/(\d+)\s*(oy|month|mes|мес)/); const dy = t.match(/(\d+)\s*(kun|day|дн)/)
    if (mo) days = parseInt(mo[1], 10) * 30
    else if (dy) days = parseInt(dy[1], 10)
    const now = Date.now()
    const targeted = customers.filter((c) => !c.lastOrder || now - new Date(c.lastOrder).getTime() > days * DAY)
    return { type: 'marketing.sms', domain: 'customers', count: targeted.length, days, discount, sample: targeted.slice(0, 4).map((c) => c.name) }
  }

  // ORDER: cancel (needs an order id like ORD-10241)
  if (CANCEL.test(t) && MAKE.test(t)) {
    const idm = raw.match(/ord[-\s]?(\d{3,})/i)
    const id = idm ? `ORD-${idm[1]}` : null
    const order = id ? orders.find((o) => o.id.toLowerCase() === id.toLowerCase()) : null
    if (!order) return { type: 'order.cancel', error: 'notFound', kindKey: 'kindOrder', term: idm ? idm[0] : raw.trim() }
    return { type: 'order.cancel', domain: 'orders', id: order.id, customerName: order.customerName }
  }

  // DELETE: customer / employee / product
  if (DEL_VERB.test(t)) {
    const isEmp = /(hodim|xodim|ishchi|employee|staff|сотрудник|работник)/.test(t)
    const isProd = /(mahsulot|tovar|product|товар|item)/.test(t)
    const isCust = /(mijoz|klient|customer|client|покупател)/.test(t)
    if (isEmp || (!isProd && !isCust && matchEntity(raw, employees) && !matchEntity(raw, customers))) {
      const e = matchEntity(raw, employees)
      if (!e) return { type: 'delete', error: 'notFound', kindKey: 'kindEmployee', term: raw.trim() }
      return { type: 'employee.delete', domain: 'employees', id: e.id, name: e.name }
    }
    if (isProd) {
      const p = matchEntity(raw, products)
      if (!p) return { type: 'delete', error: 'notFound', kindKey: 'kindProduct', term: raw.trim() }
      return { type: 'product.delete', domain: 'products', id: p.id, name: p.name }
    }
    // default: customer
    const c = matchEntity(raw, customers)
    if (!c) return { type: 'delete', error: 'notFound', kindKey: 'kindCustomer', term: raw.trim() }
    return { type: 'customer.delete', domain: 'customers', id: c.id, name: c.name }
  }

  return null
}

// A localized confirmation prompt for a parsed (non-error) descriptor.
export function confirmMd(d, lang) {
  const D = dict(lang)
  if (d.error) {
    if (d.error === 'notFound') return D.notFound({ kind: D[d.kindKey], term: d.term })
    return D[d.error]
  }
  if (d.type === 'order.create') return D.orderConfirm({ customer: d.customerName || D.walkIn, qty: d.qty, product: d.productName, total: d.total })
  if (d.type === 'order.cancel') return D.cancelConfirm({ id: d.id, customer: d.customerName })
  if (d.type === 'products.import') {
    const rows = d.items.map((it) => `| ${it.name}${it.brand ? ` (${it.brand})` : ''} | ${it.qty} | ${money(it.price)} |`).join('\n')
    const table = `| ${D.importHead[0]} | ${D.importHead[1]} | ${D.importHead[2]} |\n| --- | --- | --- |\n${rows}`
    return D.importConfirm({ count: d.items.length, table })
  }
  if (d.type === 'marketing.sms') {
    if (!d.count) return D.mkNone
    return D.mkConfirm({ count: d.count, period: D.mkPeriod(d.days), discount: d.discount, sample: d.sample?.join(', '), message: D.mkMsg(d.discount) })
  }
  const kind = d.type === 'employee.delete' ? D.kindEmployee : d.type === 'product.delete' ? D.kindProduct : D.kindCustomer
  return D.delConfirm({ kind, name: d.name })
}

// Actually perform the confirmed action. Returns { md }.
export async function executeAction(d, lang) {
  const D = dict(lang)
  const store = useCrmData.getState()
  try {
    if (d.type === 'order.create') {
      // A walk-in sale has no named customer → find or create a shared one.
      let customerId = d.customerId
      let customerName = d.customerName
      if (!customerId) {
        const wc = store.customers.find((c) => /walk-?in|nomsiz|prilavka|розничн|касса/i.test(c.name))
          || await store.addCustomer({ name: D.walkIn, phone: '', city: '' })
        customerId = wc.id; customerName = wc.name
      }
      const order = await store.createOrder({ customerId, items: [{ productId: d.productId, qty: d.qty }] })
      return { md: D.orderDone({ id: order.id, customer: customerName, qty: d.qty, product: d.productName, total: d.total }) }
    }
    if (d.type === 'order.cancel') {
      await store.updateOrder(d.id, { status: 'Cancelled', paymentStatus: 'Pending', deliveryStatus: 'Pending' })
      return { md: D.cancelDone({ id: d.id }) }
    }
    if (d.type === 'products.import') {
      let n = 0
      for (const it of d.items) {
        try {
          await store.addProduct({ name: it.name, brand: it.brand || '—', category: it.category, price: it.price, cost: Math.round(it.price * 0.8 * 100) / 100, stock: it.qty })
          n += 1
        } catch { /* skip a failed line, keep importing the rest */ }
      }
      return { md: D.importDone({ n }) }
    }
    if (d.type === 'marketing.sms') {
      // No SMS provider is wired up, so this records the campaign (honest note in mkDone).
      return { md: D.mkDone({ n: d.count }) }
    }
    if (d.type === 'customer.delete') { await store.deleteCustomer(d.id); return { md: D.delDone({ kind: D.kindCustomer, name: d.name }) } }
    if (d.type === 'employee.delete') { await store.deleteEmployee(d.id); return { md: D.delDone({ kind: D.kindEmployee, name: d.name }) } }
    if (d.type === 'product.delete') { await store.deleteProduct(d.id); return { md: D.delDone({ kind: D.kindProduct, name: d.name }) } }
  } catch {
    return { md: D.failed }
  }
  return { md: D.failed }
}

export const cancelledMd = (lang) => dict(lang).cancelled
export const importNoneMd = (lang) => dict(lang).importNone

// True when an attached image should be treated as an invoice to scan
// (rather than a general "what's in this picture?" vision question).
export const isScanIntent = (raw) =>
  /(faktura|naklad|skan|scan|invoice|receipt|\bchek\b|накладн|фактур|скан|\bчек\b|qo.?sh|добав|import)/.test(norm(raw))

// yes / no detection for the confirmation step (uz / ru / en).
// norm() has already lowercased and stripped apostrophes, so match that form.
export const isAffirmative = (raw) => /^(ha|xa|mayli|xop|xush|boladi|tasdiq|tasdiqlayman|davom|yes|yeah|yep|ok|okay|sure|da|davay|конечно|подтвержда?ю?|давай)\b/.test(norm(raw))
export const isNegative = (raw) => /^(yoq|kerakmas|bekor|no|nope|cancel|нет|отмен\w*)\b/.test(norm(raw))