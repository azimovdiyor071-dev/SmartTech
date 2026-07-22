import { useMemo, useState } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import { useT } from '../../i18n/useI18n.js'

/**
 * Reusable data table.
 * columns: [{ key, header, render?(row), sortable?, sortValue?(row), align?, className? }]
 * searchKeys: array of row keys to match the search box against
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  pageSize = 10,
  onRowClick,
  filters = null,
  emptyLabel,
}) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let out = rows
    if (query.trim() && searchKeys.length) {
      const q = query.toLowerCase()
      out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
    }
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key)
      const val = col?.sortValue || ((r) => r[sort.key])
      out = [...out].sort((a, b) => {
        const av = val(a)
        const bv = val(b)
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, query, sort, columns, searchKeys])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  const toggleSort = (key) => {
    setPage(1)
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const onSearch = (e) => { setQuery(e.target.value); setPage(1) }

  const pageWindow = () => {
    const nums = []
    const from = Math.max(1, current - 2)
    const to = Math.min(totalPages, from + 4)
    for (let i = from; i <= to; i++) nums.push(i)
    return nums
  }

  return (
    <div>
      <div className="toolbar">
        {searchKeys.length > 0 && (
          <div className="search-box">
            <Search size={16} />
            <input value={query} onChange={onSearch} placeholder={searchPlaceholder} />
          </div>
        )}
        {filters}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.sortable ? 'sortable' : ''}
                  style={{ textAlign: c.align || 'left' }}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                    {c.header}
                    {c.sortable && (
                      sort.key === c.key
                        ? (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                        : <ChevronsUpDown size={13} style={{ opacity: 0.5 }} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={row.id || i}
                className={onRowClick ? 'clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.className} style={{ textAlign: c.align || 'left' }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && <EmptyState title={emptyLabel} />}
      </div>

      {filtered.length > pageSize && (
        <div className="pagination">
          <span className="info">
            {t('showing')} {start + 1}–{Math.min(start + pageSize, filtered.length)} {t('of')} {filtered.length}
          </span>
          <div className="page-btns">
            <button className="page-btn" disabled={current === 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft size={15} />
            </button>
            {pageWindow().map((n) => (
              <button key={n} className={`page-btn${n === current ? ' is-active' : ''}`} onClick={() => setPage(n)}>
                {n}
              </button>
            ))}
            <button className="page-btn" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
