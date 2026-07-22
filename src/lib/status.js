// Maps a status string to a badge color variant (see index.css badge classes).
const MAP = {
  // orders
  New: 'blue', Confirmed: 'indigo', Preparing: 'amber', Ready: 'violet',
  Shipped: 'blue', Delivered: 'green', Cancelled: 'red', Refunded: 'gray',
  // payments
  Paid: 'green', Pending: 'amber', Partial: 'blue', Unpaid: 'red',
  // stock / products
  Active: 'green', 'Low stock': 'amber', 'Out of stock': 'red', Inactive: 'gray',
  // delivery
  'In transit': 'blue', Assigned: 'indigo',
  // service
  Received: 'gray', Diagnosing: 'amber', 'In repair': 'blue', Completed: 'green',
  // warranty
  Expired: 'red',
  // customers
  VIP: 'violet', Regular: 'blue', 'At risk': 'amber',
  // employees
  'On leave': 'amber',
}

export function statusVariant(status) {
  return MAP[status] || 'gray'
}
