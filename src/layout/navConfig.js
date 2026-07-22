import {
  LayoutDashboard, Users, Package, ShoppingCart, Warehouse, CreditCard,
  FileText, Wrench, Truck, UserCog, Building2, BarChart3, Bell, Settings,
} from 'lucide-react'

// Sidebar navigation, grouped into sections. `labelKey` maps to i18n.
export const NAV_SECTIONS = [
  {
    labelKey: 'nav.main',
    items: [
      { to: '/', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    labelKey: 'nav.sales',
    items: [
      { to: '/orders', labelKey: 'orders', icon: ShoppingCart },
      { to: '/products', labelKey: 'products', icon: Package },
      { to: '/customers', labelKey: 'customers', icon: Users },
      { to: '/payments', labelKey: 'payments', icon: CreditCard },
      { to: '/invoices', labelKey: 'invoices', icon: FileText },
    ],
  },
  {
    labelKey: 'nav.operations',
    items: [
      { to: '/inventory', labelKey: 'inventory', icon: Warehouse },
      { to: '/warranty', labelKey: 'warranty', icon: Wrench },
      { to: '/delivery', labelKey: 'delivery', icon: Truck },
    ],
  },
  {
    labelKey: 'nav.organization',
    items: [
      { to: '/employees', labelKey: 'employees', icon: UserCog },
      { to: '/branches', labelKey: 'branches', icon: Building2 },
      { to: '/reports', labelKey: 'reports', icon: BarChart3 },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [
      { to: '/notifications', labelKey: 'notifications', icon: Bell, notifBadge: true },
      { to: '/settings', labelKey: 'settings', icon: Settings },
    ],
  },
]
