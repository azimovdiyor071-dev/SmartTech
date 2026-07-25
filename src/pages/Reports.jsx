import { FileBarChart, FileSpreadsheet, FileText, CalendarDays, CalendarRange, Calendar, Clock } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import LineChart from '../components/charts/LineChart.jsx'
import { getRevenueSeries, getKpis } from '../data/analytics.js'
import { ACTIVITY_LOG } from '../data/db.js'
import { compactMoney, timeAgo, money, number } from '../lib/format.js'
import { openPrintWindow, reportHtml, downloadCSV } from '../lib/exporters.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tAction } from '../i18n/labels.js'

export default function Reports() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const series = getRevenueSeries(90)

  const REPORTS = [
    { id: 'daily', label: t('dailyReport'), icon: CalendarDays, desc: t('dailyDesc') },
    { id: 'weekly', label: t('weeklyReport'), icon: CalendarRange, desc: t('weeklyDesc') },
    { id: 'monthly', label: t('monthlyReport'), icon: Calendar, desc: t('monthlyDesc') },
    { id: 'yearly', label: t('yearlyReport'), icon: FileBarChart, desc: t('yearlyDesc') },
  ]

  const reportRows = () => {
    const k = getKpis()
    const profitH = { en: 'Net profit', uz: 'Sof foyda', ru: 'Чистая прибыль' }[lang] || 'Net profit'
    return [
      [th(lang, 'revenue'), money(k.monthly.value)],
      [profitH, money(k.profit.value)],
      [t('expenses'), money(k.expenses.value)],
      ['AOV', money(k.avgOrderValue.value)],
      [th(lang, 'orders'), number(k.orders.value)],
      [t('newCustomers'), number(k.newCustomers)],
    ]
  }

  const exportAs = (report, fmt) => {
    const rows = reportRows()
    if (fmt === 'PDF') {
      const L = { metric: th(lang, 'metric'), value: th(lang, 'value'), generatedBy: t('generatedBy') }
      const ok = openPrintWindow(report, reportHtml(report, t('reportsSub'), rows, L))
      if (!ok) push(t('popupBlocked'), 'error')
      return
    }
    downloadCSV(`${report}.csv`, [th(lang, 'metric'), th(lang, 'value')], rows)
    push(t('downloaded'), 'success')
  }

  const logCols = [
    { key: 'user', header: th(lang, 'user'), sortable: true, render: (l) => <b>{l.user}</b> },
    { key: 'action', header: th(lang, 'action'), sortable: true, render: (l) => tAction(lang, l.action) },
    { key: 'target', header: th(lang, 'target'), render: (l) => <span className="cell-muted">{l.target}</span> },
    { key: 'ip', header: th(lang, 'ip'), render: (l) => <span className="cell-muted">{l.ip}</span> },
    { key: 'time', header: th(lang, 'when'), sortable: true, sortValue: (l) => new Date(l.time).getTime(), render: (l) => <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Clock size={12} /> {timeAgo(l.time)}</span> },
  ]

  return (
    <div className="page">
      <PageHeader title={t('reports')} subtitle={t('reportsSub')} breadcrumb={[{ label: t('reports') }]} />

      <div className="grid grid-2">
        {REPORTS.map((r) => (
          <div key={r.id} className="card card-pad">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="stat-icon" style={{ width: 44, height: 44, background: 'var(--primary-soft)', color: 'var(--primary)' }}><r.icon size={20} /></span>
              <div><h3 style={{ fontSize: 15 }}>{r.label}</h3><div className="cell-muted" style={{ fontSize: 12.5 }}>{r.desc}</div></div>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => exportAs(r.label, 'PDF')}><FileText size={14} /> PDF</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportAs(r.label, 'Excel')}><FileSpreadsheet size={14} /> Excel</button>
              <button className="btn btn-ghost btn-sm" onClick={() => exportAs(r.label, 'CSV')}><FileSpreadsheet size={14} /> CSV</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>{t('revenueTrend')}</h3><span className="muted">{t('last90')}</span></div>
        <div className="card-pad">
          <LineChart labels={series.map((s) => s.label)} formatY={(v) => compactMoney(v)}
            series={[{ name: th(lang, 'revenue'), color: '#4f46e5', data: series.map((s) => s.revenue) }]} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t('auditLog')}</h3>
        <DataTable columns={logCols} rows={ACTIVITY_LOG} searchKeys={['user', 'action', 'target']} searchPlaceholder={t('searchActivity')} pageSize={8} />
      </div>
    </div>
  )
}
