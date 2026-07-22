// ============================================================
// Client-side document export — no libraries.
// - openPrintWindow(): opens a styled document and triggers the
//   browser print dialog, where the user picks "Save as PDF".
// - downloadCSV(): builds and downloads a real .csv file.
// ============================================================

const DOC_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; color: #0f172a; padding: 36px; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0; }
  .muted { color: #64748b; font-size: 13px; }
  .brand { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; }
  .logo { font-weight: 800; font-size: 20px; color: #4f46e5; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .right { text-align: right; }
  .totals { max-width: 300px; margin-left: auto; margin-top: 10px; }
  .totals td { border: none; padding: 5px 10px; }
  .tot td { font-weight: 800; font-size: 15px; border-top: 2px solid #0f172a; }
  .foot { margin-top: 28px; color: #64748b; font-size: 12px; }
  @media print { body { padding: 0; } @page { margin: 18mm; } }
`

export function openPrintWindow(title, bodyHtml) {
  const win = window.open('', '_blank', 'width=820,height=920')
  if (!win) return false
  win.document.write(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>`
    + `<title>${title}</title><style>${DOC_STYLES}</style></head>`
    + `<body>${bodyHtml}<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>`,
  )
  win.document.close()
  return true
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

// Build a printable invoice/order document.
// order: { id, customerName, createdAt, items[], subtotal, discount, tax, total, paymentMethod }
export function invoiceHtml(order, { money, formatDate, L, company = 'SmartTech CRM', address = 'Amir Temur Ave 12, Tashkent' }) {
  const rows = (order.items || []).map((it) =>
    `<tr><td>${esc(it.name)}</td><td class="right">${money(it.price)}</td><td class="right">${it.qty}</td><td class="right">${money(it.total)}</td></tr>`,
  ).join('')
  return `
    <div class="brand">
      <div><div class="logo">${company}</div><div class="muted">${address}</div></div>
      <div style="text-align:right"><h1>${L.invoice} ${esc(order.id)}</h1><div class="muted">${formatDate(order.createdAt)}</div></div>
    </div>
    <p class="muted"><b style="color:#0f172a">${L.customer}:</b> ${esc(order.customerName)} &nbsp;·&nbsp; <b style="color:#0f172a">${L.payment}:</b> ${esc(order.paymentMethod || '—')}</p>
    <table>
      <thead><tr><th>${L.product}</th><th class="right">${L.price}</th><th class="right">${L.qty}</th><th class="right">${L.total}</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">—</td></tr>`}</tbody>
    </table>
    <table class="totals"><tbody>
      <tr><td>${L.subtotal}</td><td class="right">${money(order.subtotal || 0)}</td></tr>
      <tr><td>${L.discount}</td><td class="right">-${money(order.discount || 0)}</td></tr>
      <tr><td>${L.tax}</td><td class="right">${money(order.tax || 0)}</td></tr>
      <tr class="tot"><td>${L.total}</td><td class="right">${money(order.total || 0)}</td></tr>
    </tbody></table>
    <p class="foot">${L.thanks}</p>`
}

// Build a printable report document from a title + rows [[label, value], …].
export function reportHtml(title, subtitle, rows, L) {
  const body = rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td class="right">${esc(value)}</td></tr>`).join('')
  return `
    <div class="brand">
      <div><div class="logo">SmartTech CRM</div><div class="muted">${esc(subtitle)}</div></div>
      <div style="text-align:right"><h1>${esc(title)}</h1></div>
    </div>
    <table>
      <thead><tr><th>${L.metric}</th><th class="right">${L.value}</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p class="foot">${L.generatedBy}</p>`
}

export function downloadCSV(filename, headerRow, rows) {
  const escCsv = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headerRow, ...rows].map((r) => r.map(escCsv).join(','))
  const csv = '﻿' + lines.join('\n') // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
