// ============================================================
// SmartTech CRM — mock database
// Deterministic (seeded) so data is stable across reloads.
// This is the single source of truth the app reads from.
// ============================================================

// --- seeded RNG (mulberry32) ------------------------------------------------
function rng(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260722)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const money2 = (n) => Math.round(n * 100) / 100
const daysAgoISO = (d) => new Date(Date.now() - d * 86400000).toISOString()

// --- static reference data --------------------------------------------------
export const CATEGORIES = [
  { id: 'smartphones', name: 'Smartphones', icon: '📱' },
  { id: 'laptops', name: 'Laptops', icon: '💻' },
  { id: 'tablets', name: 'Tablets', icon: '📲' },
  { id: 'tvs', name: 'TVs', icon: '📺' },
  { id: 'watches', name: 'Smart Watches', icon: '⌚' },
  { id: 'accessories', name: 'Accessories', icon: '🎧' },
  { id: 'printers', name: 'Printers', icon: '🖨️' },
  { id: 'monitors', name: 'Monitors', icon: '🖥️' },
]

export const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Sony', 'LG', 'Asus', 'Dell', 'HP', 'Lenovo', 'Huawei', 'Canon', 'JBL']

export const PAYMENT_METHODS = ['Cash', 'Card', 'Click', 'Payme', 'Uzum Bank', 'Visa', 'Mastercard', 'Bank Transfer']

export const ORDER_STATUSES = ['New', 'Confirmed', 'Preparing', 'Ready', 'Shipped', 'Delivered', 'Cancelled', 'Refunded']

export const ROLES = [
  'Super Admin', 'CEO', 'Branch Manager', 'Sales Manager', 'Cashier',
  'Warehouse Manager', 'Service Technician', 'Delivery Staff', 'Accountant',
]

export const BRANCHES = [
  { id: 'b1', name: 'Tashkent Central', city: 'Tashkent', address: 'Amir Temur Ave 12', phone: '+998 71 200 10 10' },
  { id: 'b2', name: 'Samarkand Plaza', city: 'Samarkand', address: 'Registon St 4', phone: '+998 66 233 22 22' },
  { id: 'b3', name: 'Bukhara Store', city: 'Bukhara', address: 'Bahouddin Naqshband 8', phone: '+998 65 224 33 33' },
  { id: 'b4', name: 'Andijan Tech', city: 'Andijan', address: 'Navoi St 21', phone: '+998 74 223 44 44' },
]

// --- product catalog --------------------------------------------------------
const PRODUCT_MODELS = {
  smartphones: ['iPhone 15 Pro', 'iPhone 15', 'Galaxy S24 Ultra', 'Galaxy A55', 'Redmi Note 13 Pro', 'Xiaomi 14', 'Huawei P60'],
  laptops: ['MacBook Pro 14"', 'MacBook Air M3', 'Galaxy Book4', 'ASUS ZenBook', 'Dell XPS 13', 'HP Pavilion 15', 'Lenovo ThinkPad X1'],
  tablets: ['iPad Pro 12.9"', 'iPad Air', 'Galaxy Tab S9', 'Xiaomi Pad 6', 'Huawei MatePad'],
  tvs: ['Samsung Neo QLED 65"', 'LG OLED C4 55"', 'Sony Bravia 75"', 'Xiaomi TV A2 43"'],
  watches: ['Apple Watch S9', 'Galaxy Watch6', 'Xiaomi Watch S3', 'Huawei Watch GT4'],
  accessories: ['AirPods Pro 2', 'JBL Flip 6', 'Galaxy Buds2 Pro', 'Anker Power Bank', 'USB-C Cable', 'Wireless Charger'],
  printers: ['Canon PIXMA G3420', 'HP LaserJet M15w', 'Epson L3250'],
  monitors: ['Dell UltraSharp 27"', 'LG UltraGear 24"', 'ASUS ProArt 32"', 'Samsung Odyssey G5'],
}
const brandForModel = (m) =>
  BRANDS.find((b) => m.toLowerCase().includes(b.toLowerCase())) ||
  (m.includes('iPhone') || m.includes('MacBook') || m.includes('iPad') || m.includes('AirPods') || m.includes('Apple') ? 'Apple' :
   m.includes('Galaxy') ? 'Samsung' :
   m.includes('Redmi') || m.includes('Xiaomi') ? 'Xiaomi' :
   m.includes('Huawei') || m.includes('MatePad') ? 'Huawei' :
   m.includes('Bravia') ? 'Sony' :
   m.includes('PIXMA') ? 'Canon' : pick(BRANDS))

function buildProducts() {
  const list = []
  let n = 1
  for (const cat of CATEGORIES) {
    for (const model of PRODUCT_MODELS[cat.id]) {
      const base = { smartphones: 700, laptops: 1200, tablets: 500, tvs: 900, watches: 320, accessories: 90, printers: 180, monitors: 350 }[cat.id]
      const cost = money2(base * (0.6 + rand() * 0.4))
      const price = money2(cost * (1.15 + rand() * 0.35))
      const stock = int(0, 60)
      const hasImei = cat.id === 'smartphones' || cat.id === 'tablets' || cat.id === 'watches'
      list.push({
        id: `P${String(n).padStart(3, '0')}`,
        name: model,
        category: cat.id,
        brand: brandForModel(model),
        sku: `${cat.id.slice(0, 3).toUpperCase()}-${String(n).padStart(4, '0')}`,
        barcode: `48${int(10000000, 99999999)}`,
        imei: hasImei ? `35${int(1000000000000, 9999999999999)}` : null,
        cost,
        price,
        stock,
        reorderLevel: 8,
        warrantyMonths: pick([6, 12, 12, 24, 24, 36]),
        variants: pick([1, 1, 2, 3]),
        status: stock === 0 ? 'Out of stock' : stock <= 8 ? 'Low stock' : 'Active',
        icon: cat.icon,
        sold: int(20, 480),
      })
      n++
    }
  }
  return list
}
export const PRODUCTS = buildProducts()

// --- employees --------------------------------------------------------------
// Gender-aware names: female surnames take the "-a" suffix (Karimov → Karimova).
const MALE_FIRST = ['Aziz', 'Jasur', 'Sardor', 'Bekzod', 'Timur', 'Rustam', 'Oybek', 'Shoxrux', 'Diyorbek', 'Sanjar', 'Otabek', 'Akmal']
const FEMALE_FIRST = ['Dilnoza', 'Malika', 'Nigora', 'Kamola', 'Sevara', 'Zarina', 'Feruza', 'Gulnora', 'Madina', 'Nodira', 'Sabina', 'Shahnoza']
const SURNAME = ['Karimov', 'Yusupov', 'Rashidov', 'Ismoilov', 'Tursunov', 'Abdullaev', 'Nazarov', 'Saidov', 'Ergashev', 'Xolmatov', 'Aliyev', 'Rahimov']
const fullName = () => {
  const female = rand() < 0.5
  const first = pick(female ? FEMALE_FIRST : MALE_FIRST)
  return `${first} ${pick(SURNAME)}${female ? 'a' : ''}`
}

function buildEmployees() {
  const seed = [
    { name: 'Azimov Diyorbek', role: 'Super Admin' },
    { name: 'Dilnoza Yusupova', role: 'CEO' },
  ]
  const list = seed.map((s, i) => ({ ...s, branch: 'b1', id: `E${String(i + 1).padStart(3, '0')}` }))
  let n = list.length + 1
  for (const b of BRANCHES) {
    const roles = ['Branch Manager', 'Sales Manager', 'Cashier', 'Cashier', 'Warehouse Manager', 'Service Technician', 'Delivery Staff', 'Accountant']
    for (const role of roles) {
      list.push({
        id: `E${String(n).padStart(3, '0')}`,
        name: fullName(),
        role,
        branch: b.id,
        email: `emp${n}@smarttech.uz`,
        phone: `+998 9${int(0, 9)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
        status: rand() > 0.1 ? 'Active' : 'On leave',
        sales: money2(int(8000, 90000)),
        joined: daysAgoISO(int(60, 1200)),
      })
      n++
    }
  }
  return list
}
export const EMPLOYEES = buildEmployees()
const SALES_REPS = EMPLOYEES.filter((e) => ['Sales Manager', 'Cashier'].includes(e.role))

// --- customers --------------------------------------------------------------
function buildCustomers() {
  const list = []
  for (let i = 1; i <= 46; i++) {
    const spent = money2(int(0, 42000))
    const orders = int(0, 38)
    list.push({
      id: `C${String(i).padStart(3, '0')}`,
      name: fullName(),
      email: `customer${i}@mail.uz`,
      phone: `+998 9${int(0, 9)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
      city: pick(BRANCHES).city,
      branch: pick(BRANCHES).id,
      totalSpent: spent,
      orders,
      loyaltyPoints: Math.round(spent / 10),
      segment: spent > 20000 ? 'VIP' : orders === 0 ? 'New' : spent < 2000 ? 'At risk' : 'Regular',
      status: rand() > 0.15 ? 'Active' : 'Inactive',
      lastOrder: orders ? daysAgoISO(int(0, 120)) : null,
      joined: daysAgoISO(int(5, 900)),
      notes: '',
    })
  }
  return list
}
export const CUSTOMERS = buildCustomers()

// --- orders -----------------------------------------------------------------
function buildOrders() {
  const list = []
  for (let i = 1; i <= 120; i++) {
    const customer = pick(CUSTOMERS)
    const branch = pick(BRANCHES)
    const rep = pick(SALES_REPS)
    const itemCount = int(1, 4)
    const items = []
    for (let j = 0; j < itemCount; j++) {
      const p = pick(PRODUCTS)
      const qty = int(1, 3)
      items.push({ productId: p.id, name: p.name, price: p.price, qty, total: money2(p.price * qty) })
    }
    const subtotal = money2(items.reduce((s, it) => s + it.total, 0))
    const discount = rand() > 0.6 ? money2(subtotal * (rand() * 0.12)) : 0
    const tax = money2((subtotal - discount) * 0.12)
    const total = money2(subtotal - discount + tax)
    const daysBack = int(0, 380)
    const status = pick(['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Preparing', 'Confirmed', 'New', 'Ready', 'Cancelled', 'Refunded'])
    const payStatus =
      status === 'Refunded' ? 'Refunded' :
      status === 'Cancelled' ? 'Pending' :
      ['Delivered', 'Shipped'].includes(status) ? 'Paid' : pick(['Paid', 'Pending', 'Partial'])
    list.push({
      id: `ORD-${String(10240 + i)}`,
      customerId: customer.id,
      customerName: customer.name,
      branch: branch.id,
      repId: rep?.id,
      repName: rep?.name || '—',
      items,
      subtotal,
      discount,
      tax,
      total,
      status,
      paymentStatus: payStatus,
      paymentMethod: pick(PAYMENT_METHODS),
      deliveryStatus: status === 'Delivered' ? 'Delivered' : status === 'Shipped' ? 'In transit' : 'Pending',
      createdAt: daysAgoISO(daysBack),
      notes: '',
    })
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
export const ORDERS = buildOrders()

// --- payments ---------------------------------------------------------------
export const PAYMENTS = ORDERS.filter((o) => o.paymentStatus !== 'Pending').map((o, i) => ({
  id: `PAY-${String(5001 + i)}`,
  orderId: o.id,
  customerName: o.customerName,
  method: o.paymentMethod,
  amount: o.paymentStatus === 'Partial' ? money2(o.total * 0.5) : o.total,
  status: o.paymentStatus,
  date: o.createdAt,
}))

// --- invoices ---------------------------------------------------------------
export const INVOICES = ORDERS.filter((o) => ['Delivered', 'Shipped', 'Ready'].includes(o.status)).map((o, i) => ({
  id: `INV-${String(2026000 + i)}`,
  orderId: o.id,
  customerName: o.customerName,
  amount: o.total,
  status: o.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
  issued: o.createdAt,
}))

// --- warranty & service -----------------------------------------------------
const SERVICE_ISSUES = ['Screen replacement', 'Battery issue', 'Software error', 'Charging port', 'Water damage', 'Speaker fault']
export const WARRANTIES = PRODUCTS.filter((p) => p.imei).slice(0, 30).map((p, i) => ({
  id: `WR-${String(3001 + i)}`,
  product: p.name,
  imei: p.imei,
  customerName: pick(CUSTOMERS).name,
  months: p.warrantyMonths,
  registered: daysAgoISO(int(10, 400)),
  expires: daysAgoISO(int(10, 400) - p.warrantyMonths * 30),
  status: rand() > 0.25 ? 'Active' : 'Expired',
}))
export const SERVICE_REQUESTS = Array.from({ length: 24 }, (_, i) => {
  const p = pick(PRODUCTS)
  const tech = pick(EMPLOYEES.filter((e) => e.role === 'Service Technician'))
  const status = pick(['Received', 'Diagnosing', 'In repair', 'Ready', 'Completed', 'Completed'])
  return {
    id: `SRV-${String(4001 + i)}`,
    product: p.name,
    imei: p.imei || '—',
    customerName: pick(CUSTOMERS).name,
    issue: pick(SERVICE_ISSUES),
    technician: tech?.name || 'Unassigned',
    branch: pick(BRANCHES).id,
    status,
    cost: money2(int(20, 400)),
    createdAt: daysAgoISO(int(0, 90)),
  }
})

// --- deliveries -------------------------------------------------------------
export const DELIVERIES = ORDERS.filter((o) => ['Shipped', 'Delivered', 'Ready'].includes(o.status)).slice(0, 40).map((o, i) => ({
  id: `DLV-${String(6001 + i)}`,
  orderId: o.id,
  customerName: o.customerName,
  courier: pick(EMPLOYEES.filter((e) => e.role === 'Delivery Staff'))?.name || 'Courier',
  address: `${pick(BRANCHES).city}, St ${int(1, 90)}`,
  status: o.status === 'Delivered' ? 'Delivered' : o.status === 'Shipped' ? 'In transit' : 'Assigned',
  eta: o.status === 'Delivered' ? '—' : `${int(1, 3)} days`,
  date: o.createdAt,
}))

// --- notifications ----------------------------------------------------------
export const NOTIFICATIONS = [
  { id: 'n1', type: 'order', titleKey: 'notif.newOrder', bodyKey: 'notif.newOrderBody', time: daysAgoISO(0), read: false },
  { id: 'n2', type: 'payment', titleKey: 'notif.payment', bodyKey: 'notif.paymentBody', time: daysAgoISO(0), read: false },
  { id: 'n3', type: 'stock', titleKey: 'notif.lowStock', bodyKey: 'notif.lowStockBody', time: daysAgoISO(0), read: false },
  { id: 'n4', type: 'warranty', titleKey: 'notif.warranty', bodyKey: 'notif.warrantyBody', time: daysAgoISO(1), read: true },
  { id: 'n5', type: 'service', titleKey: 'notif.service', bodyKey: 'notif.serviceBody', time: daysAgoISO(1), read: true },
  { id: 'n6', type: 'order', titleKey: 'notif.delivered', bodyKey: 'notif.deliveredBody', time: daysAgoISO(2), read: true },
]

// --- activity / audit log ---------------------------------------------------
const ACTIONS = ['created order', 'updated product', 'processed payment', 'added customer', 'adjusted inventory', 'assigned courier', 'logged in', 'generated invoice']
export const ACTIVITY_LOG = Array.from({ length: 40 }, (_, i) => ({
  id: `LOG-${i + 1}`,
  user: pick(EMPLOYEES).name,
  action: pick(ACTIONS),
  target: pick([...ORDERS.slice(0, 20).map((o) => o.id), ...PRODUCTS.slice(0, 10).map((p) => p.sku)]),
  ip: `192.168.${int(0, 5)}.${int(2, 250)}`,
  time: daysAgoISO(int(0, 14) + rand()),
}))

// --- daily revenue series (for charts + comparisons) ------------------------
// One entry per day for the last 400 days, keyed by offset (0 = today).
function buildDailySeries() {
  const series = []
  for (let d = 400; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000)
    const weekday = date.getDay()
    const seasonal = 1 + 0.25 * Math.sin((d / 400) * Math.PI * 2)
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.25 : 1
    const noise = 0.75 + rand() * 0.5
    const revenue = money2(3200 * seasonal * weekendBoost * noise)
    const orders = int(8, 34)
    series.push({
      date: date.toISOString().slice(0, 10),
      revenue,
      profit: money2(revenue * (0.22 + rand() * 0.08)),
      expenses: money2(revenue * (0.12 + rand() * 0.05)),
      orders,
      units: orders * int(1, 3),
    })
  }
  return series
}
export const DAILY = buildDailySeries()
