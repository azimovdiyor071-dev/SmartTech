// ============================================================
// Shared label translations for the app UI (uz | ru | en).
// Statuses, segments, roles, categories, payment methods and
// table headers. English falls back to the raw value.
// ============================================================

const STATUS = {
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
    Active: 'Активен', 'Low stock': 'Мало', 'Out of stock': 'Нет в наличии', Inactive: 'Неактивен',
    'In transit': 'В пути', Assigned: 'Назначен', Received: 'Принят', Diagnosing: 'Диагностика',
    'In repair': 'В ремонте', Completed: 'Завершён', Expired: 'Истёк',
    VIP: 'VIP', Regular: 'Обычный', 'At risk': 'В зоне риска', 'On leave': 'В отпуске',
  },
}

const CATEGORY = {
  uz: { smartphones: 'Smartfonlar', laptops: 'Noutbuklar', tablets: 'Planshetlar', tvs: 'Televizorlar', watches: 'Aqlli soatlar', accessories: 'Aksessuarlar', printers: 'Printerlar', monitors: 'Monitorlar' },
  ru: { smartphones: 'Смартфоны', laptops: 'Ноутбуки', tablets: 'Планшеты', tvs: 'Телевизоры', watches: 'Умные часы', accessories: 'Аксессуары', printers: 'Принтеры', monitors: 'Мониторы' },
}

const ROLE = {
  uz: {
    'Super Admin': 'Bosh administrator', CEO: 'Direktor', 'Branch Manager': 'Filial rahbari',
    'Sales Manager': 'Sotuv menejeri', Cashier: 'Kassir', 'Warehouse Manager': 'Ombor menejeri',
    'Service Technician': 'Xizmat ustasi', 'Delivery Staff': 'Yetkazuvchi', Accountant: 'Buxgalter',
  },
  ru: {
    'Super Admin': 'Главный админ', CEO: 'Директор', 'Branch Manager': 'Руководитель филиала',
    'Sales Manager': 'Менеджер продаж', Cashier: 'Кассир', 'Warehouse Manager': 'Менеджер склада',
    'Service Technician': 'Сервисный техник', 'Delivery Staff': 'Курьер', Accountant: 'Бухгалтер',
  },
}

const PAYMENT = {
  uz: { Cash: 'Naqd', Card: 'Karta', 'Bank Transfer': "Bank o'tkazmasi" },
  ru: { Cash: 'Наличные', Card: 'Карта', 'Bank Transfer': 'Банковский перевод' },
}

// Table headers and short field labels reused across pages.
const HEADER = {
  en: {
    customer: 'Customer', city: 'City', segment: 'Segment', orders: 'Orders', totalSpent: 'Total Spent',
    loyalty: 'Loyalty', status: 'Status', product: 'Product', category: 'Category', price: 'Price',
    cost: 'Cost', stock: 'Stock', inStock: 'In Stock', reorder: 'Reorder', stockValue: 'Stock Value',
    sold: 'Sold', order: 'Order', items: 'Items', total: 'Total', payment: 'Payment', date: 'Date',
    method: 'Method', amount: 'Amount', invoice: 'Invoice', issued: 'Issued', actions: 'Actions', adjust: 'Adjust',
    warranty: 'Warranty', imei: 'IMEI', term: 'Term', expires: 'Expires', request: 'Request', issue: 'Issue',
    technician: 'Technician', delivery: 'Delivery', courier: 'Courier', address: 'Address', eta: 'ETA',
    employee: 'Employee', role: 'Role', branch: 'Branch', phone: 'Phone', sales: 'Sales', revenue: 'Revenue',
    user: 'User', action: 'Action', target: 'Target', ip: 'IP Address', when: 'When', name: 'Name', company: 'Company',
    brand: 'Brand', metric: 'Metric', value: 'Value',
  },
  uz: {
    customer: 'Mijoz', city: 'Shahar', segment: 'Segment', orders: 'Buyurtmalar', totalSpent: 'Jami sarflagan',
    loyalty: 'Ballar', status: 'Holat', product: 'Mahsulot', category: 'Toifa', price: 'Narx',
    cost: 'Tannarx', stock: 'Qoldiq', inStock: 'Omborda', reorder: 'Minimal', stockValue: 'Qoldiq qiymati',
    sold: 'Sotilgan', order: 'Buyurtma', items: 'Dona', total: 'Jami', payment: "To'lov", date: 'Sana',
    method: 'Usul', amount: 'Summa', invoice: 'Faktura', issued: 'Berilgan', actions: 'Amallar', adjust: "O'zgartirish",
    warranty: 'Kafolat', imei: 'IMEI', term: 'Muddat', expires: 'Tugaydi', request: "So'rov", issue: 'Muammo',
    technician: 'Usta', delivery: 'Yetkazish', courier: 'Kuryer', address: 'Manzil', eta: 'Muddat',
    employee: 'Xodim', role: 'Lavozim', branch: 'Filial', phone: 'Telefon', sales: 'Savdo', revenue: 'Daromad',
    user: 'Foydalanuvchi', action: 'Amal', target: 'Obyekt', ip: 'IP manzil', when: 'Qachon', name: 'Ism', company: 'Kompaniya',
    brand: 'Brend', metric: 'Ko\'rsatkich', value: 'Qiymat',
  },
  ru: {
    customer: 'Клиент', city: 'Город', segment: 'Сегмент', orders: 'Заказы', totalSpent: 'Всего потрачено',
    loyalty: 'Баллы', status: 'Статус', product: 'Товар', category: 'Категория', price: 'Цена',
    cost: 'Себестоим.', stock: 'Остаток', inStock: 'На складе', reorder: 'Минимум', stockValue: 'Стоимость',
    sold: 'Продано', order: 'Заказ', items: 'Позиции', total: 'Итого', payment: 'Оплата', date: 'Дата',
    method: 'Способ', amount: 'Сумма', invoice: 'Счёт', issued: 'Выдан', actions: 'Действия', adjust: 'Изменить',
    warranty: 'Гарантия', imei: 'IMEI', term: 'Срок', expires: 'Истекает', request: 'Заявка', issue: 'Проблема',
    technician: 'Мастер', delivery: 'Доставка', courier: 'Курьер', address: 'Адрес', eta: 'Срок',
    employee: 'Сотрудник', role: 'Роль', branch: 'Филиал', phone: 'Телефон', sales: 'Продажи', revenue: 'Выручка',
    user: 'Пользователь', action: 'Действие', target: 'Объект', ip: 'IP адрес', when: 'Когда', name: 'Имя', company: 'Компания',
    brand: 'Бренд', metric: 'Показатель', value: 'Значение',
  },
}

// Audit-log action verbs — the log stores canonical English; show it localized.
const ACTION = {
  en: {
    'created order': 'created order', 'updated product': 'updated product', 'processed payment': 'processed payment',
    'added customer': 'added customer', 'adjusted inventory': 'adjusted inventory', 'assigned courier': 'assigned courier',
    'logged in': 'logged in', 'generated invoice': 'generated invoice',
  },
  uz: {
    'created order': 'buyurtma yaratdi', 'updated product': 'mahsulotni yangiladi', 'processed payment': "to'lovni qabul qildi",
    'added customer': "mijoz qo'shdi", 'adjusted inventory': 'omborni o\'zgartirdi', 'assigned courier': 'kuryer biriktirdi',
    'logged in': 'tizimga kirdi', 'generated invoice': 'hisob-faktura yaratdi',
  },
  ru: {
    'created order': 'создал заказ', 'updated product': 'обновил товар', 'processed payment': 'принял оплату',
    'added customer': 'добавил клиента', 'adjusted inventory': 'изменил склад', 'assigned courier': 'назначил курьера',
    'logged in': 'вошёл в систему', 'generated invoice': 'создал счёт',
  },
}
export const tAction = (lang, a) => ACTION[lang]?.[a] || a

export const tStatus = (lang, s) => STATUS[lang]?.[s] || s
export const tCategory = (lang, id, fallback) => CATEGORY[lang]?.[id] || fallback || id
export const tRole = (lang, r) => ROLE[lang]?.[r] || r
export const tPayment = (lang, p) => PAYMENT[lang]?.[p] || p
export const th = (lang, key) => HEADER[lang]?.[key] || HEADER.en[key] || key
export const headers = (lang, keys) => keys.map((k) => th(lang, k))
