// ============================================================
// Assistant localization (uz | ru | en).
// - LABELS: statuses, categories, table headers
// - T: response templates (prose) per language
// Skills build tables with localized headers/labels, then wrap
// them in a localized sentence via tt(lang, key, vars).
// ============================================================

// ---- statuses -------------------------------------------------------------
const STATUS = {
  // Plain-language English words for ordinary shop owners.
  en: { Pending: 'Waiting', Partial: 'Partly paid', Unpaid: 'Not paid', 'In transit': 'On the way', Preparing: 'Being prepared' },
  uz: {
    New: 'Yangi', Confirmed: 'Tasdiqlangan', Preparing: 'Tayyorlanmoqda', Ready: 'Tayyor',
    Shipped: "Jo'natilgan", Delivered: 'Yetkazilgan', Cancelled: 'Bekor qilingan', Refunded: 'Qaytarilgan',
    Paid: "To'langan", Pending: 'Kutilmoqda', Partial: 'Qisman', Unpaid: "To'lanmagan",
    Active: 'Faol', 'Low stock': 'Kam qoldi', 'Out of stock': 'Tugagan', Inactive: 'Nofaol',
    'In transit': "Yo'lda", Assigned: 'Tayinlangan', Received: 'Qabul qilindi', Diagnosing: 'Tekshirilmoqda',
    'In repair': "Ta'mirda", Completed: 'Bajarildi', Expired: 'Muddati tugagan',
    VIP: 'VIP', Regular: 'Oddiy', 'At risk': 'Xavf ostida', 'On leave': "Ta'tilda",
  },
  ru: {
    New: 'Новый', Confirmed: 'Подтверждён', Preparing: 'Готовится', Ready: 'Готов',
    Shipped: 'Отправлен', Delivered: 'Доставлен', Cancelled: 'Отменён', Refunded: 'Возврат',
    Paid: 'Оплачен', Pending: 'Ожидает', Partial: 'Частично', Unpaid: 'Не оплачен',
    Active: 'Активен', 'Low stock': 'Мало на складе', 'Out of stock': 'Нет в наличии', Inactive: 'Неактивен',
    'In transit': 'В пути', Assigned: 'Назначен', Received: 'Принят', Diagnosing: 'Диагностика',
    'In repair': 'В ремонте', Completed: 'Завершён', Expired: 'Истёк',
    VIP: 'VIP', Regular: 'Обычный', 'At risk': 'В зоне риска', 'On leave': 'В отпуске',
  },
}

const CATEGORY = {
  en: {},
  uz: { smartphones: 'Smartfonlar', laptops: 'Noutbuklar', tablets: 'Planshetlar', tvs: 'Televizorlar', watches: 'Aqlli soatlar', accessories: 'Aksessuarlar', printers: 'Printerlar', monitors: 'Monitorlar' },
  ru: { smartphones: 'Смартфоны', laptops: 'Ноутбуки', tablets: 'Планшеты', tvs: 'Телевизоры', watches: 'Умные часы', accessories: 'Аксессуары', printers: 'Принтеры', monitors: 'Мониторы' },
}

const HEADER = {
  en: {
    product: 'Product', brand: 'Brand', category: 'Category', price: 'Price', cost: 'Cost', stock: 'Stock',
    reorder: 'Reorder', status: 'Status', sold: 'Sold', revenue: 'Total Sales', customer: 'Customer', city: 'City',
    segment: 'Segment', spent: 'Spent', orders: 'Orders', loyalty: 'Loyalty', phone: 'Phone', order: 'Order',
    total: 'Total', payment: 'Payment', amount: 'Amount', invoice: 'Invoice', warranty: 'Warranty', expires: 'Expires',
    request: 'Request', issue: 'Issue', employee: 'Employee', role: 'Role', sales: 'Sales', branch: 'Branch',
    courier: 'Courier', delivery: 'Delivery', metric: 'Metric', value: 'Value',
  },
  uz: {
    product: 'Mahsulot', brand: 'Brend', category: 'Toifa', price: 'Narx', cost: 'Tannarx', stock: 'Qoldiq',
    reorder: 'Minimal', status: 'Holat', sold: 'Sotilgan', revenue: 'Daromad', customer: 'Mijoz', city: 'Shahar',
    segment: 'Segment', spent: 'Sarflagan', orders: 'Buyurtma', loyalty: 'Ballar', phone: 'Telefon', order: 'Buyurtma',
    total: 'Jami', payment: "To'lov", amount: 'Summa', invoice: 'Faktura', warranty: 'Kafolat', expires: 'Tugaydi',
    request: 'So\'rov', issue: 'Muammo', employee: 'Xodim', role: 'Lavozim', sales: 'Savdo', branch: 'Filial',
    courier: 'Kuryer', delivery: 'Yetkazish', metric: 'Ko\'rsatkich', value: 'Qiymat',
  },
  ru: {
    product: 'Товар', brand: 'Бренд', category: 'Категория', price: 'Цена', cost: 'Себестоим.', stock: 'Остаток',
    reorder: 'Минимум', status: 'Статус', sold: 'Продано', revenue: 'Выручка', customer: 'Клиент', city: 'Город',
    segment: 'Сегмент', spent: 'Потрачено', orders: 'Заказы', loyalty: 'Баллы', phone: 'Телефон', order: 'Заказ',
    total: 'Итого', payment: 'Оплата', amount: 'Сумма', invoice: 'Счёт', warranty: 'Гарантия', expires: 'Истекает',
    request: 'Заявка', issue: 'Проблема', employee: 'Сотрудник', role: 'Роль', sales: 'Продажи', branch: 'Филиал',
    courier: 'Курьер', delivery: 'Доставка', metric: 'Показатель', value: 'Значение',
  },
}

export const sLabel = (lang, status) => STATUS[lang]?.[status] || status
export const cLabel = (lang, catId, fallback) => CATEGORY[lang]?.[catId] || fallback || catId
export const H = (lang, keys) => keys.map((k) => HEADER[lang]?.[k] || HEADER.en[k] || k)

// ---- response templates ---------------------------------------------------
const T = {
  en: {
    greeting: (v) => `👋 Hello **${v.name}** — I'm the **SmartTech CRM Assistant**. Ask me about sales, orders, inventory, customers and reports, or tap a quick action below.`,
    refusal: () => "I'm the **SmartTech CRM Assistant** — I only help with CRM data and usage: sales, reports, customers, products, orders, employees, inventory, payments, warranty, delivery and analytics.",
    restricted: (v) => `🔒 **Access restricted.** Your role (**${v.role}**) can't view ${v.domain} data. Contact an administrator if you need access.`,
    security: () => "🔒 **For security reasons I can't share** passwords, API keys, tokens or system details. To *reset* your password, ask \"How do I reset my password?\".",
    'sales.today': (v) => `💰 **Today's sales:** ${v.rev}\n\n- ${v.arrow} **${v.pct}** vs yesterday (${v.prev})\n- Orders today: **${v.orders}** · Profit: **${v.profit}**`,
    'sales.yesterday': (v) => `📅 **Yesterday's revenue:** ${v.v}.`,
    'sales.weekly': (v) => `📅 **Weekly revenue:** ${v.v} — ${v.arrow} ${v.pct} vs last week.`,
    'sales.monthly': (v) => `📅 **Monthly revenue:** ${v.v} — ${v.arrow} ${v.pct} vs last month.`,
    'sales.yearly': (v) => `📅 **Yearly revenue:** ${v.v} (trailing 12 months).`,
    'sales.profit': (v) => `📈 **Net profit (30 days):** ${v.v} — ${v.arrow} ${v.pct}. Today: **${v.today}**.`,
    'sales.expenses': (v) => `💸 **Expenses (30 days):** ${v.v} — ${v.arrow} ${v.pct} vs prior period.`,
    'sales.units': (v) => `📦 **Products sold (30 days):** ${v.v} units — ${v.arrow} ${v.pct}.`,
    'sales.aov': (v) => `🧾 **Average order value:** ${v.v} — ${v.arrow} ${v.pct} vs last month.`,
    compare: (v) => `📊 **${v.label}**\n\n- Current: **${v.cur}**\n- Previous: ${v.prev}\n- Change: **${v.arrow} ${v.pct}**`,
    'products.top': (v) => `🏆 **Top selling products:**\n\n${v.table}`,
    'products.list': (v) => `📦 **Products** — ${v.count} match${v.count === 1 ? '' : 'es'}${v.filters ? ` (${v.filters})` : ''}\n\n${v.table}${v.more ? `\n\n_Showing 8 of ${v.count}. Refine e.g. "only available" or "under $500"._` : ''}${v.colorNote ? `\n\n> ℹ️ Color (**${v.colorNote}**) isn't tracked in the catalog.` : ''}`,
    'inventory.out': (v) => `⚠️ **Out of stock:** ${v.count} products\n\n${v.table}`,
    'inventory.low': (v) => `📉 **${v.count} products at or below reorder level:**\n\n${v.table}\n\n👉 Open **Inventory → Stock Transfer** to restock.`,
    'customers.active': (v) => `👥 **Active customers:** ${v.v} of ${v.total} total.`,
    'customers.new': (v) => `🆕 **New customers (30 days):** ${v.v}.`,
    'customers.returning': (v) => `🔁 **Returning customers:** ${v.v} (more than one order).`,
    'customers.spent': (v) => `🧑‍💼 **${v.count} customers who spent ${v.cmp} ${v.amount}:**\n\n${v.table}`,
    'customers.searchNone': (v) => `I couldn't find any customer matching **"${v.term}"**.`,
    'customers.search': (v) => `🔎 **${v.count} customer(s) matching "${v.term}":**\n\n${v.table}`,
    'customers.vip': (v) => `⭐ **VIP customers:** ${v.count}\n\n${v.table}`,
    'customers.top': (v) => `👥 **Top customers by lifetime spend:**\n\n${v.table}`,
    'customers.list': (v) => `👥 **All customers (${v.count}):**\n\n${v.table}`,
    'orders.found': (v) => `🧾 **${v.id}** — ${v.customer}\n\n- Total: **${v.total}**\n- Status: **${v.status}** · Payment: **${v.payment}**\n- Date: ${v.date}`,
    'orders.notFound': (v) => `I couldn't find an order matching **#${v.digits}**.`,
    'orders.today': (v) => `🛒 **Orders today:** ${v.v}. Total on record: **${v.total}**.`,
    'orders.awaiting': (v) => `💳 **${v.count} orders awaiting payment:**\n\n${v.table}`,
    'orders.cancelled': (v) => `❌ **Cancelled orders:** ${v.count}\n\n${v.table}`,
    'orders.refund': (v) => `↩️ **Refunded orders:** ${v.count} · ${v.amount} total refunded.`,
    'orders.pending': (v) => `⏳ **${v.count} pending orders:**\n\n${v.table}`,
    'orders.recent': (v) => `🛒 **Recent orders:**\n\n${v.table}`,
    'payments.pending': (v) => `💳 **${v.count} payments pending/partial:**\n\n${v.table}`,
    'payments.summary': (v) => `💰 **Total collected:** ${v.collected} across ${v.count} transactions. Refunds: ${v.refunds}.`,
    'invoices.unpaid': (v) => `📄 **${v.count} unpaid invoices** (${v.amount}):\n\n${v.table}`,
    'invoices.summary': (v) => `📄 **Invoices:** ${v.count} generated · ${v.paid} paid. Export via **Invoices → PDF**.`,
    'warranty.expiring': (v) => `🛡️ **${v.count} warranties expiring within 30 days:**\n\n${v.table}`,
    'warranty.summary': (v) => `🛡️ **Warranties:** ${v.active} active · ${v.expired} expired. Search by IMEI in **Warranty & Service**.`,
    'service.open': (v) => `🔧 **${v.count} open service requests:**\n\n${v.table}`,
    'delivery.summary': (v) => `🚚 **Deliveries:** ${v.transit} in transit · ${v.delivered} delivered.\n\n${v.table}`,
    'employees.payroll': () => `👔 Payroll figures aren't stored in this module. Ask for "best employees" to see sales performance.`,
    'employees.top': (v) => `🏅 **Top employees by sales:**\n\n${v.table}`,
    'branches.comparison': (v) => `🏢 **Branch comparison (by revenue):**\n\n${v.table}\n\n**${v.top}** is the top performer.`,
    'reports.summary': (v) => `📑 **${v.period} report — summary**\n\n${v.table}\n\n👉 Export as **PDF / Excel / CSV** from the **Reports** page.`,
    'suggestions.header': () => `💡 **Smart insights for you:**`,
    'help.createOrder': () => '🧭 **Create an order**\n1. Go to **Orders**.\n2. Click **Create Order**.\n3. Pick the customer, add products & quantities.\n4. Apply discount/tax, choose payment method.\n5. Save — an invoice can be generated.',
    'help.addCustomer': () => '🧭 **Add a customer**\n1. Open **Customers**.\n2. Click **Add Customer**.\n3. Fill in name, phone, email, city.\n4. Save.',
    'help.addProduct': () => '🧭 **Add a product**\n1. Open **Products**.\n2. Click **Add Product**.\n3. Enter name, category, brand, SKU, prices, stock, warranty.\n4. Save.',
    'help.invoice': () => '🧭 **Print / export an invoice**\n1. Open **Invoices** (or an order → **Invoice PDF**).\n2. Use **Print** or **PDF** on the row.',
    'help.password': () => '🧭 **Reset your password**\n1. Log out.\n2. Click **Forgot password?** on the login screen.\n3. A reset link is emailed to you.',
    'help.inventoryWhere': () => '🧭 **Inventory** is under **Operations → Inventory** in the sidebar — stock levels, low-stock alerts and transfers.',
    'help.navigate': () => '🧭 Use the left sidebar — modules are grouped into **Sales**, **Operations**, **Organization** and **System**.',
    'help.generic': () => '🧭 **I can guide you.** Try: "How do I create an order?", "How do I add a customer?", "Where is inventory?", "How do I reset my password?".',
  },

  uz: {
    greeting: (v) => `👋 Salom **${v.name}** — men **SmartTech CRM Yordamchisi**man. Savdo, buyurtma, ombor, mijoz va hisobotlar haqida so'rang yoki quyidagi tugmalardan foydalaning.`,
    refusal: () => "Men **SmartTech CRM Yordamchisi**man — faqat CRM ma'lumotlari bo'yicha yordam beraman: savdo, hisobot, mijoz, mahsulot, buyurtma, xodim, ombor, to'lov, kafolat, yetkazish va tahlil.",
    restricted: (v) => `🔒 **Ruxsat cheklangan.** Sizning rolingiz (**${v.role}**) ${v.domain} ma'lumotlarini ko'ra olmaydi. Kerak bo'lsa administrator bilan bog'laning.`,
    security: () => "🔒 **Xavfsizlik yuzasidan** parol, API kalit, token yoki tizim ma'lumotlarini ko'rsata olmayman. Parolni tiklash uchun \"Parolni qanday tiklayman?\" deb so'rang.",
    'sales.today': (v) => `💰 **Bugungi savdo:** ${v.rev}\n\n- ${v.arrow} **${v.pct}** kechagiga nisbatan (${v.prev})\n- Bugungi buyurtmalar: **${v.orders}** · Foyda: **${v.profit}**`,
    'sales.yesterday': (v) => `📅 **Kechagi daromad:** ${v.v}.`,
    'sales.weekly': (v) => `📅 **Haftalik daromad:** ${v.v} — ${v.arrow} ${v.pct} o'tgan haftaga nisbatan.`,
    'sales.monthly': (v) => `📅 **Oylik daromad:** ${v.v} — ${v.arrow} ${v.pct} o'tgan oyga nisbatan.`,
    'sales.yearly': (v) => `📅 **Yillik daromad:** ${v.v} (so'nggi 12 oy).`,
    'sales.profit': (v) => `📈 **Sof foyda (30 kun):** ${v.v} — ${v.arrow} ${v.pct}. Bugun: **${v.today}**.`,
    'sales.expenses': (v) => `💸 **Xarajatlar (30 kun):** ${v.v} — ${v.arrow} ${v.pct} oldingi davrga nisbatan.`,
    'sales.units': (v) => `📦 **Sotilgan mahsulot (30 kun):** ${v.v} dona — ${v.arrow} ${v.pct}.`,
    'sales.aov': (v) => `🧾 **O'rtacha buyurtma qiymati:** ${v.v} — ${v.arrow} ${v.pct} o'tgan oyga nisbatan.`,
    compare: (v) => `📊 **${v.label}**\n\n- Hozirgi: **${v.cur}**\n- Oldingi: ${v.prev}\n- O'zgarish: **${v.arrow} ${v.pct}**`,
    'products.top': (v) => `🏆 **Eng ko'p sotilgan mahsulotlar:**\n\n${v.table}`,
    'products.list': (v) => `📦 **Mahsulotlar** — ${v.count} ta topildi${v.filters ? ` (${v.filters})` : ''}\n\n${v.table}${v.more ? `\n\n_${v.count} tadan 8 tasi ko'rsatildi. "faqat mavjud" yoki "500$ dan arzon" deб aniqlashtiring._` : ''}${v.colorNote ? `\n\n> ℹ️ Rang (**${v.colorNote}**) katalogda saqlanmaydi.` : ''}`,
    'inventory.out': (v) => `⚠️ **Tugagan mahsulotlar:** ${v.count} ta\n\n${v.table}`,
    'inventory.low': (v) => `📉 **Minimal darajadagi ${v.count} ta mahsulot:**\n\n${v.table}\n\n👉 To'ldirish uchun **Ombor → Zaxira transferi**.`,
    'customers.active': (v) => `👥 **Faol mijozlar:** ${v.total} tadan ${v.v} ta.`,
    'customers.new': (v) => `🆕 **Yangi mijozlar (30 kun):** ${v.v}.`,
    'customers.returning': (v) => `🔁 **Qaytgan mijozlar:** ${v.v} (bir nechta buyurtma bergan).`,
    'customers.spent': (v) => `🧑‍💼 **${v.amount} ${v.cmp} sarflagan ${v.count} ta mijoz:**\n\n${v.table}`,
    'customers.searchNone': (v) => `**"${v.term}"** bo'yicha mijoz topilmadi.`,
    'customers.search': (v) => `🔎 **"${v.term}" bo'yicha ${v.count} ta mijoz:**\n\n${v.table}`,
    'customers.vip': (v) => `⭐ **VIP mijozlar:** ${v.count}\n\n${v.table}`,
    'customers.top': (v) => `👥 **Eng ko'p xarid qilgan mijozlar:**\n\n${v.table}`,
    'customers.list': (v) => `👥 **Barcha mijozlar (${v.count} ta):**\n\n${v.table}`,
    'orders.found': (v) => `🧾 **${v.id}** — ${v.customer}\n\n- Jami: **${v.total}**\n- Holat: **${v.status}** · To'lov: **${v.payment}**\n- Sana: ${v.date}`,
    'orders.notFound': (v) => `**#${v.digits}** bo'yicha buyurtma topilmadi.`,
    'orders.today': (v) => `🛒 **Bugungi buyurtmalar:** ${v.v}. Jami: **${v.total}**.`,
    'orders.awaiting': (v) => `💳 **To'lov kutayotgan ${v.count} ta buyurtma:**\n\n${v.table}`,
    'orders.cancelled': (v) => `❌ **Bekor qilingan buyurtmalar:** ${v.count}\n\n${v.table}`,
    'orders.refund': (v) => `↩️ **Qaytarilgan buyurtmalar:** ${v.count} · jami ${v.amount} qaytarildi.`,
    'orders.pending': (v) => `⏳ **${v.count} ta kutilayotgan buyurtma:**\n\n${v.table}`,
    'orders.recent': (v) => `🛒 **So'nggi buyurtmalar:**\n\n${v.table}`,
    'payments.pending': (v) => `💳 **Kutilayotgan/qisman ${v.count} ta to'lov:**\n\n${v.table}`,
    'payments.summary': (v) => `💰 **Jami yig'ilgan:** ${v.collected}, ${v.count} ta tranzaksiya. Qaytarishlar: ${v.refunds}.`,
    'invoices.unpaid': (v) => `📄 **To'lanmagan ${v.count} ta faktura** (${v.amount}):\n\n${v.table}`,
    'invoices.summary': (v) => `📄 **Fakturalar:** ${v.count} ta · ${v.paid} to'langan. **Fakturalar → PDF** orqali eksport qiling.`,
    'warranty.expiring': (v) => `🛡️ **30 kun ichida tugaydigan ${v.count} ta kafolat:**\n\n${v.table}`,
    'warranty.summary': (v) => `🛡️ **Kafolatlar:** ${v.active} faol · ${v.expired} tugagan. IMEI bo'yicha **Kafolat va Xizmat**da qidiring.`,
    'service.open': (v) => `🔧 **${v.count} ta ochiq xizmat so'rovi:**\n\n${v.table}`,
    'delivery.summary': (v) => `🚚 **Yetkazishlar:** ${v.transit} yo'lda · ${v.delivered} yetkazilgan.\n\n${v.table}`,
    'employees.payroll': () => `👔 Oylik ma'lumotlari bu modulda saqlanmaydi. Savdo natijalari uchun "eng yaxshi xodimlar" deb so'rang.`,
    'employees.top': (v) => `🏅 **Savdo bo'yicha eng yaxshi xodimlar:**\n\n${v.table}`,
    'branches.comparison': (v) => `🏢 **Filiallar taqqoslovi (daromad bo'yicha):**\n\n${v.table}\n\n**${v.top}** — eng yaxshi filial.`,
    'reports.summary': (v) => `📑 **${v.period} hisobot — qisqacha**\n\n${v.table}\n\n👉 **Hisobotlar** sahifasidan **PDF / Excel / CSV** yuklab oling.`,
    'suggestions.header': () => `💡 **Siz uchun tavsiyalar:**`,
    'help.createOrder': () => '🧭 **Buyurtma yaratish**\n1. **Buyurtmalar**ga o\'ting.\n2. **Buyurtma yaratish** ni bosing.\n3. Mijoz tanlang, mahsulot va sonini qo\'shing.\n4. Chegirma/soliq, to\'lov turini belgilang.\n5. Saqlang — faktura yaratilishi mumkin.',
    'help.addCustomer': () => '🧭 **Mijoz qo\'shish**\n1. **Mijozlar**ni oching.\n2. **Mijoz qo\'shish** ni bosing.\n3. Ism, telefon, email, shaharni kiriting.\n4. Saqlang.',
    'help.addProduct': () => '🧭 **Mahsulot qo\'shish**\n1. **Mahsulotlar**ni oching.\n2. **Mahsulot qo\'shish** ni bosing.\n3. Nomi, toifa, brend, SKU, narx, qoldiq, kafolatni kiriting.\n4. Saqlang.',
    'help.invoice': () => '🧭 **Fakturani chop etish / eksport**\n1. **Fakturalar**ni oching (yoki buyurtma → **Faktura PDF**).\n2. Qatordagi **Chop etish** yoki **PDF** ni bosing.',
    'help.password': () => '🧭 **Parolni tiklash**\n1. Tizimdan chiqing.\n2. Kirish oynasida **Parolni unutdingizmi?** ni bosing.\n3. Tiklash havolasi emailingizga yuboriladi.',
    'help.inventoryWhere': () => '🧭 **Ombor** yon menyuda **Operations → Inventory** ostida — qoldiqlar, kam zaxira ogohlantirishlari va transferlar.',
    'help.navigate': () => '🧭 Chapdagi yon menyudan foydalaning — modullar **Savdo**, **Operatsiyalar**, **Tashkilot** va **Tizim** bo\'limlariga bo\'lingan.',
    'help.generic': () => '🧭 **Men yo\'l ko\'rsata olaman.** Masalan: "Buyurtma qanday yarataman?", "Mijoz qanday qo\'shaman?", "Ombor qayerda?", "Parolni qanday tiklayman?".',
  },

  ru: {
    greeting: (v) => `👋 Здравствуйте, **${v.name}** — я **ассистент SmartTech CRM**. Спрашивайте о продажах, заказах, складе, клиентах и отчётах, или используйте кнопки ниже.`,
    refusal: () => 'Я **ассистент SmartTech CRM** — помогаю только по данным CRM: продажи, отчёты, клиенты, товары, заказы, сотрудники, склад, платежи, гарантия, доставка и аналитика.',
    restricted: (v) => `🔒 **Доступ ограничен.** Ваша роль (**${v.role}**) не может просматривать данные раздела «${v.domain}». Обратитесь к администратору.`,
    security: () => '🔒 **В целях безопасности** я не показываю пароли, API-ключи, токены и системные данные. Чтобы *сбросить* пароль, спросите «Как сбросить пароль?».',
    'sales.today': (v) => `💰 **Продажи сегодня:** ${v.rev}\n\n- ${v.arrow} **${v.pct}** ко вчера (${v.prev})\n- Заказов сегодня: **${v.orders}** · Прибыль: **${v.profit}**`,
    'sales.yesterday': (v) => `📅 **Выручка вчера:** ${v.v}.`,
    'sales.weekly': (v) => `📅 **Выручка за неделю:** ${v.v} — ${v.arrow} ${v.pct} к прошлой неделе.`,
    'sales.monthly': (v) => `📅 **Выручка за месяц:** ${v.v} — ${v.arrow} ${v.pct} к прошлому месяцу.`,
    'sales.yearly': (v) => `📅 **Выручка за год:** ${v.v} (последние 12 месяцев).`,
    'sales.profit': (v) => `📈 **Чистая прибыль (30 дней):** ${v.v} — ${v.arrow} ${v.pct}. Сегодня: **${v.today}**.`,
    'sales.expenses': (v) => `💸 **Расходы (30 дней):** ${v.v} — ${v.arrow} ${v.pct} к прошлому периоду.`,
    'sales.units': (v) => `📦 **Продано товаров (30 дней):** ${v.v} шт. — ${v.arrow} ${v.pct}.`,
    'sales.aov': (v) => `🧾 **Средний чек:** ${v.v} — ${v.arrow} ${v.pct} к прошлому месяцу.`,
    compare: (v) => `📊 **${v.label}**\n\n- Текущий: **${v.cur}**\n- Прошлый: ${v.prev}\n- Изменение: **${v.arrow} ${v.pct}**`,
    'products.top': (v) => `🏆 **Самые продаваемые товары:**\n\n${v.table}`,
    'products.list': (v) => `📦 **Товары** — найдено ${v.count}${v.filters ? ` (${v.filters})` : ''}\n\n${v.table}${v.more ? `\n\n_Показано 8 из ${v.count}. Уточните: «только в наличии» или «дешевле $500»._` : ''}${v.colorNote ? `\n\n> ℹ️ Цвет (**${v.colorNote}**) не хранится в каталоге.` : ''}`,
    'inventory.out': (v) => `⚠️ **Нет в наличии:** ${v.count} товаров\n\n${v.table}`,
    'inventory.low': (v) => `📉 **${v.count} товаров на уровне минимума или ниже:**\n\n${v.table}\n\n👉 Пополните через **Склад → Перемещение склада**.`,
    'customers.active': (v) => `👥 **Активные клиенты:** ${v.v} из ${v.total}.`,
    'customers.new': (v) => `🆕 **Новые клиенты (30 дней):** ${v.v}.`,
    'customers.returning': (v) => `🔁 **Вернувшиеся клиенты:** ${v.v} (более одного заказа).`,
    'customers.spent': (v) => `🧑‍💼 **${v.count} клиентов, потративших ${v.cmp} ${v.amount}:**\n\n${v.table}`,
    'customers.searchNone': (v) => `Не нашёл клиента по запросу **«${v.term}»**.`,
    'customers.search': (v) => `🔎 **${v.count} клиент(ов) по «${v.term}»:**\n\n${v.table}`,
    'customers.vip': (v) => `⭐ **VIP-клиенты:** ${v.count}\n\n${v.table}`,
    'customers.top': (v) => `👥 **Топ клиентов по сумме покупок:**\n\n${v.table}`,
    'customers.list': (v) => `👥 **Все клиенты (${v.count}):**\n\n${v.table}`,
    'orders.found': (v) => `🧾 **${v.id}** — ${v.customer}\n\n- Итого: **${v.total}**\n- Статус: **${v.status}** · Оплата: **${v.payment}**\n- Дата: ${v.date}`,
    'orders.notFound': (v) => `Заказ по **#${v.digits}** не найден.`,
    'orders.today': (v) => `🛒 **Заказов сегодня:** ${v.v}. Всего: **${v.total}**.`,
    'orders.awaiting': (v) => `💳 **${v.count} заказов ожидают оплаты:**\n\n${v.table}`,
    'orders.cancelled': (v) => `❌ **Отменённые заказы:** ${v.count}\n\n${v.table}`,
    'orders.refund': (v) => `↩️ **Возвраты:** ${v.count} · всего возвращено ${v.amount}.`,
    'orders.pending': (v) => `⏳ **${v.count} заказов в обработке:**\n\n${v.table}`,
    'orders.recent': (v) => `🛒 **Последние заказы:**\n\n${v.table}`,
    'payments.pending': (v) => `💳 **${v.count} платежей ожидают/частичные:**\n\n${v.table}`,
    'payments.summary': (v) => `💰 **Всего собрано:** ${v.collected} по ${v.count} транзакциям. Возвраты: ${v.refunds}.`,
    'invoices.unpaid': (v) => `📄 **${v.count} неоплаченных счетов** (${v.amount}):\n\n${v.table}`,
    'invoices.summary': (v) => `📄 **Счета:** ${v.count} создано · ${v.paid} оплачено. Экспорт через **Счета → PDF**.`,
    'warranty.expiring': (v) => `🛡️ **${v.count} гарантий истекают в течение 30 дней:**\n\n${v.table}`,
    'warranty.summary': (v) => `🛡️ **Гарантии:** ${v.active} активных · ${v.expired} истёкших. Поиск по IMEI в **Гарантия и Сервис**.`,
    'service.open': (v) => `🔧 **${v.count} открытых заявок на сервис:**\n\n${v.table}`,
    'delivery.summary': (v) => `🚚 **Доставки:** ${v.transit} в пути · ${v.delivered} доставлено.\n\n${v.table}`,
    'employees.payroll': () => `👔 Данные о зарплате в этом модуле не хранятся. Спросите «лучшие сотрудники» — покажу результаты продаж.`,
    'employees.top': (v) => `🏅 **Лучшие сотрудники по продажам:**\n\n${v.table}`,
    'branches.comparison': (v) => `🏢 **Сравнение филиалов (по выручке):**\n\n${v.table}\n\n**${v.top}** — лучший филиал.`,
    'reports.summary': (v) => `📑 **${v.period} отчёт — сводка**\n\n${v.table}\n\n👉 Экспорт в **PDF / Excel / CSV** на странице **Отчёты**.`,
    'suggestions.header': () => `💡 **Рекомендации для вас:**`,
    'help.createOrder': () => '🧭 **Создать заказ**\n1. Откройте **Заказы**.\n2. Нажмите **Создать заказ**.\n3. Выберите клиента, добавьте товары и количество.\n4. Скидка/налог, способ оплаты.\n5. Сохраните — можно создать счёт.',
    'help.addCustomer': () => '🧭 **Добавить клиента**\n1. Откройте **Клиенты**.\n2. Нажмите **Добавить клиента**.\n3. Укажите имя, телефон, email, город.\n4. Сохраните.',
    'help.addProduct': () => '🧭 **Добавить товар**\n1. Откройте **Товары**.\n2. Нажмите **Добавить товар**.\n3. Введите название, категорию, бренд, SKU, цены, остаток, гарантию.\n4. Сохраните.',
    'help.invoice': () => '🧭 **Печать / экспорт счёта**\n1. Откройте **Счета** (или заказ → **Счёт PDF**).\n2. Нажмите **Печать** или **PDF** в строке.',
    'help.password': () => '🧭 **Сброс пароля**\n1. Выйдите из системы.\n2. Нажмите **Забыли пароль?** на экране входа.\n3. Ссылка для сброса придёт на email.',
    'help.inventoryWhere': () => '🧭 **Склад** находится в **Operations → Inventory** в боковом меню — остатки, оповещения и перемещения.',
    'help.navigate': () => '🧭 Используйте боковое меню — модули сгруппированы в **Продажи**, **Операции**, **Организация** и **Система**.',
    'help.generic': () => '🧭 **Я могу подсказать.** Например: «Как создать заказ?», «Как добавить клиента?», «Где склад?», «Как сбросить пароль?».',
  },
}

// ---- beginner-friendly additions & overrides ------------------------------
// Plain-language concept explanations, a "how to sell" guide, friendlier
// empty states, and softer wording. Merged in (overrides existing keys).
const EXTRA = {
  en: {
    // softer sales wording
    'sales.yesterday': (v) => `📅 **Yesterday's sales:** ${v.v}.`,
    'sales.weekly': (v) => `📅 **This week's sales:** ${v.v} — ${v.arrow} ${v.pct} vs last week.`,
    'sales.monthly': (v) => `📅 **This month's sales:** ${v.v} — ${v.arrow} ${v.pct} vs last month.`,
    'sales.yearly': (v) => `📅 **This year's sales:** ${v.v} (last 12 months).`,
    // friendlier empties + a helpful next step
    'customers.searchNone': (v) => `🔍 I couldn't find a customer named **"${v.term}"**.\n\nWould you like to add a new customer?`,
    'orders.notFound': (v) => `🔍 I couldn't find order **#${v.digits}**.\n\nPlease double-check the number, or open the **Orders** page to browse.`,
    'products.none': () => "🔍 I couldn't find any products for that.\n\nTry searching by product name or barcode.",
    // sell guide
    'help.sell': () => "🧭 **To sell a product:**\n1. Open **Orders**.\n2. Click **Create Order**.\n3. Choose the customer.\n4. Add the product (for example, a phone).\n5. Pick how they pay — cash, card, Payme…\n6. Click **Save**.\n\nThat's it — the sale is saved! 🎉",
    // concepts
    'concept.customer': () => "👤 **A customer** is a person who buys from your shop.\n\nIn the CRM you save their name and phone, and see everything they've bought.\n\nWould you like to know how to add one?",
    'concept.order': () => "🧾 **An order** is one sale — the products a customer buys at one time.\n\nEach order shows the products, the total price, and whether it's paid.\n\nWant to know how to create one?",
    'concept.inventory': () => '📦 **Inventory** shows how many products you have in your warehouse right now.\n\nWhen something is running low, the CRM warns you so you can order more.',
    'concept.profit': () => '💵 **Profit** is the money you keep after costs.\n\nExample: you buy a phone for $400 and sell it for $500 — your profit is **$100**.',
    'concept.revenue': () => '💰 **Total sales** is all the money you received from sales, before costs.\n\nExample: you sold 10 phones at $500 each → total sales = **$5,000**.',
    'concept.warranty': () => '🛡️ **A warranty** is a promise to repair or replace a product for free if it breaks within a set time.\n\nExample: a phone with a 12-month warranty is fixed free during that year.',
    'concept.report': () => '📊 **Reports** are simple summaries of how your business is doing — sales, profit and more — for a day, week, month or year.\n\nYou can download them as PDF or Excel.',
    'concept.invoice': () => '🧾 **An invoice** is the bill you give a customer — it lists what they bought and how much to pay.\n\nYou can print it or save it as a PDF.',
    'concept.generic': () => '😊 I can explain things in simple words. Ask me:\n- What is a customer?\n- What is an order?\n- What is inventory?\n- What is profit?\n- What is a warranty?',
  },
  uz: {
    'customers.searchNone': (v) => `🔍 **"${v.term}"** ismli mijoz topilmadi.\n\nYangi mijoz qo'shasizmi?`,
    'orders.notFound': (v) => `🔍 **#${v.digits}** raqamli buyurtma topilmadi.\n\nRaqamni tekshiring yoki **Buyurtmalar** sahifasini oching.`,
    'products.none': () => "🔍 Bunga mos mahsulot topilmadi.\n\nMahsulot nomi yoki shtrix-kod bo'yicha qidiring.",
    'help.sell': () => "🧭 **Mahsulot sotish uchun:**\n1. **Buyurtmalar**ni oching.\n2. **Buyurtma yaratish** ni bosing.\n3. Mijozni tanlang.\n4. Mahsulotni qo'shing (masalan, telefon).\n5. To'lov turini tanlang — naqd, karta, Payme…\n6. **Saqlash** ni bosing.\n\nTamom — savdo saqlandi! 🎉",
    'concept.customer': () => "👤 **Mijoz** — bu do'koningizdan xarid qiladigan odam.\n\nCRM'da uning ismi va telefonini saqlaysiz hamda nima sotib olganini ko'rasiz.\n\nQanday qo'shishni bilmoqchimisiz?",
    'concept.order': () => "🧾 **Buyurtma** — bu bitta savdo, ya'ni mijoz bir vaqtda sotib olgan mahsulotlar.\n\nHar bir buyurtmada mahsulotlar, umumiy narx va to'langan-to'lanmagani ko'rinadi.\n\nQanday yaratishni ko'rsataymi?",
    'concept.inventory': () => "📦 **Ombor** — hozir omboringizda nechta mahsulot borligini ko'rsatadi.\n\nBiror narsa kamayganda, CRM ogohlantiradi — shunda yangi partiya buyurtma qilasiz.",
    'concept.profit': () => "💵 **Foyda** — xarajatlardan keyin qo'lingizda qolgan pul.\n\nMisol: telefonni 400$ ga olib, 500$ ga sotdingiz — foydangiz **100$**.",
    'concept.revenue': () => '💰 **Umumiy savdo** — sotuvdan olgan barcha pulingiz (xarajatlardan oldin).\n\nMisol: 10 ta telefonni 500$ dan sotdingiz → umumiy savdo = **5,000$**.',
    'concept.warranty': () => "🛡️ **Kafolat** — mahsulot belgilangan muddatda buzilsa, uni bepul ta'mirlash yoki almashtirish va'dasi.\n\nMisol: 12 oylik kafolatli telefon shu yil ichida bepul tuzatiladi.",
    'concept.report': () => '📊 **Hisobotlar** — biznesingiz qanday ketayotganini ko\'rsatadigan oddiy xulosalar: savdo, foyda va boshqalar — kun, hafta, oy yoki yil bo\'yicha.\n\nPDF yoki Excel\'da yuklab olasiz.',
    'concept.invoice': () => "🧾 **Faktura** — mijozga beradigan hisob varag'i: u nima sotib olgani va qancha to'lashi yozilgan.\n\nUni chop etasiz yoki PDF qilib saqlaysiz.",
    'concept.generic': () => '😊 Men hammasini oddiy so\'zlar bilan tushuntiraman. So\'rang:\n- Mijoz nima?\n- Buyurtma nima?\n- Ombor nima?\n- Foyda nima?\n- Kafolat nima?',
  },
  ru: {
    'customers.searchNone': (v) => `🔍 Клиент **«${v.term}»** не найден.\n\nХотите добавить нового клиента?`,
    'orders.notFound': (v) => `🔍 Заказ **#${v.digits}** не найден.\n\nПроверьте номер или откройте страницу **Заказы**.`,
    'products.none': () => '🔍 Товары не найдены.\n\nПопробуйте поиск по названию товара или штрих-коду.',
    'help.sell': () => '🧭 **Чтобы продать товар:**\n1. Откройте **Заказы**.\n2. Нажмите **Создать заказ**.\n3. Выберите клиента.\n4. Добавьте товар (например, телефон).\n5. Выберите оплату — наличные, карта, Payme…\n6. Нажмите **Сохранить**.\n\nГотово — продажа сохранена! 🎉',
    'concept.customer': () => '👤 **Клиент** — это человек, который покупает в вашем магазине.\n\nВ CRM вы сохраняете имя и телефон и видите все его покупки.\n\nПоказать, как добавить клиента?',
    'concept.order': () => '🧾 **Заказ** — это одна продажа, товары, купленные клиентом за один раз.\n\nВ заказе видны товары, общая сумма и оплачен ли он.\n\nПоказать, как создать заказ?',
    'concept.inventory': () => '📦 **Склад** показывает, сколько товаров сейчас у вас в наличии.\n\nКогда что-то заканчивается, CRM предупреждает — и вы заказываете ещё.',
    'concept.profit': () => '💵 **Прибыль** — деньги, которые остаются после расходов.\n\nПример: купили телефон за $400, продали за $500 — прибыль **$100**.',
    'concept.revenue': () => '💰 **Общие продажи** — все деньги от продаж (до вычета расходов).\n\nПример: продали 10 телефонов по $500 → общие продажи = **$5,000**.',
    'concept.warranty': () => '🛡️ **Гарантия** — обещание бесплатно починить или заменить товар, если он сломается в течение срока.\n\nПример: телефон с гарантией 12 месяцев чинят бесплатно в этот год.',
    'concept.report': () => '📊 **Отчёты** — простые сводки о делах бизнеса: продажи, прибыль и другое — за день, неделю, месяц или год.\n\nМожно скачать в PDF или Excel.',
    'concept.invoice': () => '🧾 **Счёт** — документ для клиента: что он купил и сколько заплатить.\n\nМожно распечатать или сохранить в PDF.',
    'concept.generic': () => '😊 Я объясню простыми словами. Спросите:\n- Что такое клиент?\n- Что такое заказ?\n- Что такое склад?\n- Что такое прибыль?\n- Что такое гарантия?',
  },
}
for (const l of ['en', 'uz', 'ru']) Object.assign(T[l], EXTRA[l])

// Exact-count answers (live data), so the AI never guesses these numbers.
const COUNTS = {
  en: {
    'count.customers': (v) => `👥 You currently have **${v.n}** customers.`,
    'count.products': (v) => `📦 There are **${v.n}** products in the catalog.`,
    'count.orders': (v) => `🛒 There are **${v.n}** orders in total.`,
    'count.employees': (v) => `👔 You have **${v.n}** employees.`,
  },
  uz: {
    'count.customers': (v) => `👥 Hozirda sizda **${v.n}** ta mijoz bor.`,
    'count.products': (v) => `📦 Katalogda **${v.n}** ta mahsulot bor.`,
    'count.orders': (v) => `🛒 Jami **${v.n}** ta buyurtma bor.`,
    'count.employees': (v) => `👔 Sizda **${v.n}** ta xodim bor.`,
  },
  ru: {
    'count.customers': (v) => `👥 Сейчас у вас **${v.n}** клиентов.`,
    'count.products': (v) => `📦 В каталоге **${v.n}** товаров.`,
    'count.orders': (v) => `🛒 Всего **${v.n}** заказов.`,
    'count.employees': (v) => `👔 У вас **${v.n}** сотрудников.`,
  },
}
for (const l of ['en', 'uz', 'ru']) Object.assign(T[l], COUNTS[l])

// "Who made you?" — always credits the developer.
const IDENTITY = {
  en: { identity: (v) => `🤖 I'm the **SmartTech CRM Assistant**, created and developed by **${v.by}**.` },
  uz: { identity: (v) => `🤖 Men **SmartTech CRM Yordamchisi**man. Meni **${v.by}** yaratgan va ishlab chiqqan.` },
  ru: { identity: (v) => `🤖 Я **ассистент SmartTech CRM**. Меня создал и разработал **${v.by}**.` },
}
for (const l of ['en', 'uz', 'ru']) Object.assign(T[l], IDENTITY[l])

export function tt(lang, key, vars = {}) {
  const fn = T[lang]?.[key] || T.en[key]
  return typeof fn === 'function' ? fn(vars) : key
}
