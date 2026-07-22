// Initial data for the CRM database (generated once, then persisted).
import bcrypt from 'bcryptjs'

const CATEGORIES = ['smartphones', 'laptops', 'tablets', 'tvs', 'watches', 'accessories', 'printers', 'monitors']
const ICONS = { smartphones: '📱', laptops: '💻', tablets: '📲', tvs: '📺', watches: '⌚', accessories: '🎧', printers: '🖨️', monitors: '🖥️' }
const BRANCHES = ['b1', 'b2', 'b3', 'b4']
const PAYMENT_METHODS = ['Cash', 'Card', 'Click', 'Payme', 'Uzum Bank', 'Visa', 'Mastercard', 'Bank Transfer']

const MODELS = {
  smartphones: ['iPhone 15 Pro', 'Galaxy S24 Ultra', 'Redmi Note 13 Pro'],
  laptops: ['MacBook Pro 14"', 'Dell XPS 13', 'Lenovo ThinkPad X1'],
  tablets: ['iPad Pro 12.9"', 'Galaxy Tab S9'],
  tvs: ['Samsung Neo QLED 65"', 'LG OLED C4 55"'],
  watches: ['Apple Watch S9', 'Galaxy Watch6'],
  accessories: ['AirPods Pro 2', 'JBL Flip 6', 'Anker Power Bank'],
  printers: ['Canon PIXMA G3420', 'HP LaserJet M15w'],
  monitors: ['Dell UltraSharp 27"', 'LG UltraGear 24"'],
}
const brandFor = (m) => (m.match(/iPhone|MacBook|iPad|AirPods|Apple/) ? 'Apple' : m.match(/Galaxy|Neo QLED/) ? 'Samsung' : m.match(/Redmi/) ? 'Xiaomi' : m.match(/LG/) ? 'LG' : m.match(/Dell/) ? 'Dell' : m.match(/HP/) ? 'HP' : m.match(/Lenovo/) ? 'Lenovo' : m.match(/Canon/) ? 'Canon' : m.match(/JBL/) ? 'JBL' : 'Anker')

const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const money2 = (n) => Math.round(n * 100) / 100
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString()

// Gender-aware names: female surnames take the "-a" suffix (Karimov → Karimova).
const MALE_FIRST = ['Aziz', 'Jasur', 'Sardor', 'Bekzod', 'Timur', 'Rustam', 'Oybek', 'Shoxrux', 'Diyorbek', 'Sanjar', 'Otabek', 'Akmal']
const FEMALE_FIRST = ['Dilnoza', 'Malika', 'Nigora', 'Kamola', 'Sevara', 'Zarina', 'Feruza', 'Gulnora', 'Madina', 'Nodira', 'Sabina', 'Shahnoza']
const SURNAME = ['Karimov', 'Yusupov', 'Rashidov', 'Ismoilov', 'Tursunov', 'Abdullaev', 'Nazarov', 'Saidov', 'Ergashev', 'Xolmatov', 'Aliyev', 'Rahimov']
const fullName = () => {
  const female = Math.random() < 0.5
  const first = pick(female ? FEMALE_FIRST : MALE_FIRST)
  return `${first} ${pick(SURNAME)}${female ? 'a' : ''}`
}

function productStatus(p) {
  if (p.stock === 0) return 'Out of stock'
  if (p.stock <= p.reorderLevel) return 'Low stock'
  return 'Active'
}

export async function buildSeed() {
  // products
  const products = []
  let n = 1
  for (const cat of CATEGORIES) {
    for (const model of MODELS[cat]) {
      const base = { smartphones: 700, laptops: 1200, tablets: 500, tvs: 900, watches: 320, accessories: 90, printers: 180, monitors: 350 }[cat]
      const cost = money2(base * (0.6 + Math.random() * 0.4))
      const price = money2(cost * (1.15 + Math.random() * 0.35))
      const stock = rint(0, 50)
      const hasImei = ['smartphones', 'tablets', 'watches'].includes(cat)
      const p = {
        id: `P${String(n).padStart(3, '0')}`,
        name: model, category: cat, brand: brandFor(model),
        sku: `${cat.slice(0, 3).toUpperCase()}-${String(n).padStart(4, '0')}`,
        barcode: `48${rint(10000000, 99999999)}`,
        imei: hasImei ? `35${rint(1000000000000, 9999999999999)}` : null,
        cost, price, stock, reorderLevel: 8, warrantyMonths: pick([12, 24, 36]),
        variants: 1, status: 'Active', icon: ICONS[cat], sold: rint(20, 400),
      }
      p.status = productStatus(p)
      products.push(p)
      n++
    }
  }

  // customers
  const customers = []
  for (let i = 1; i <= 14; i++) {
    const spent = money2(rint(0, 40000))
    const orders = rint(0, 30)
    customers.push({
      id: `C${String(i).padStart(3, '0')}`,
      name: fullName(), email: `customer${i}@mail.uz`,
      phone: `+998 9${rint(0, 9)} ${rint(100, 999)} ${rint(10, 99)} ${rint(10, 99)}`,
      city: pick(['Tashkent', 'Samarkand', 'Bukhara', 'Andijan']), branch: pick(BRANCHES),
      totalSpent: spent, orders, loyaltyPoints: Math.round(spent / 10),
      segment: spent > 20000 ? 'VIP' : orders === 0 ? 'New' : spent < 2000 ? 'At risk' : 'Regular',
      status: Math.random() > 0.15 ? 'Active' : 'Inactive',
      lastOrder: orders ? daysAgo(rint(0, 120)) : null, joined: daysAgo(rint(5, 900)), notes: '',
    })
  }

  // orders
  const orders = []
  for (let i = 1; i <= 18; i++) {
    const customer = pick(customers)
    const itemCount = rint(1, 3)
    const items = []
    for (let j = 0; j < itemCount; j++) {
      const p = pick(products)
      const qty = rint(1, 2)
      items.push({ productId: p.id, name: p.name, price: p.price, qty, total: money2(p.price * qty) })
    }
    const subtotal = money2(items.reduce((s, it) => s + it.total, 0))
    const discount = Math.random() > 0.7 ? money2(subtotal * (Math.random() * 0.1)) : 0
    const tax = money2((subtotal - discount) * 0.12)
    const total = money2(subtotal - discount + tax)
    const status = pick(['Delivered', 'Delivered', 'Shipped', 'Preparing', 'New', 'Confirmed', 'Cancelled'])
    const paymentStatus = status === 'Cancelled' ? 'Pending' : ['Delivered', 'Shipped'].includes(status) ? 'Paid' : pick(['Paid', 'Pending', 'Partial'])
    orders.push({
      id: `ORD-${10240 + i}`, customerId: customer.id, customerName: customer.name,
      branch: pick(BRANCHES), repName: 'You', items, subtotal, discount, tax, total,
      status, paymentStatus, paymentMethod: pick(PAYMENT_METHODS),
      deliveryStatus: status === 'Delivered' ? 'Delivered' : status === 'Shipped' ? 'In transit' : 'Pending',
      createdAt: daysAgo(rint(0, 60)), notes: '',
    })
  }
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // employees
  const employees = [
    { id: 'E001', name: 'Azimov Diyorbek', role: 'Super Admin', branch: 'b1' },
    { id: 'E002', name: fullName(), role: 'CEO', branch: 'b1' },
  ].map((e) => ({ ...e, email: `${e.id.toLowerCase()}@smarttech.uz`, phone: `+998 9${rint(0, 9)} ${rint(100, 999)} ${rint(10, 99)} ${rint(10, 99)}`, status: 'Active', sales: money2(rint(20000, 90000)), joined: daysAgo(rint(400, 1200)) }))
  const ROLES_PER_BRANCH = ['Branch Manager', 'Sales Manager', 'Cashier', 'Cashier', 'Warehouse Manager', 'Service Technician', 'Delivery Staff', 'Accountant']
  let en = employees.length + 1
  for (const b of BRANCHES) {
    for (const role of ROLES_PER_BRANCH) {
      employees.push({
        id: `E${String(en).padStart(3, '0')}`,
        name: fullName(), role, branch: b,
        email: `emp${en}@smarttech.uz`,
        phone: `+998 9${rint(0, 9)} ${rint(100, 999)} ${rint(10, 99)} ${rint(10, 99)}`,
        status: Math.random() > 0.1 ? 'Active' : 'On leave',
        sales: money2(rint(8000, 90000)), joined: daysAgo(rint(60, 1200)),
      })
      en++
    }
  }

  // default admin user
  const users = [{
    id: 'U001',
    name: 'Azimov Diyorbek',
    email: 'admin@smarttech.uz',
    role: 'Super Admin',
    passwordHash: await bcrypt.hash('demo1234', 10),
    createdAt: new Date().toISOString(),
  }]

  return { users, customers, products, orders, employees }
}
