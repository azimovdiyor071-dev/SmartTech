import { useMemo, useState } from 'react'
import { UserPlus, Users, ShieldCheck, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import DataTable from '../components/ui/DataTable.jsx'
import Badge from '../components/ui/Badge.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ROLES, BRANCHES } from '../data/db.js'
import { useCrmData } from '../stores/useCrmData.js'
import { money, number, initials, colorFrom } from '../lib/format.js'
import { useToast } from '../stores/useToast.js'
import { useT } from '../i18n/useI18n.js'
import { th, tRole, tStatus } from '../i18n/labels.js'

const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || '—'
const EMPTY = { name: '', role: 'Cashier', branch: 'b1', email: '', phone: '', status: 'Active', sales: '' }

export default function Employees() {
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const employees = useCrmData((s) => s.employees)
  const addEmployee = useCrmData((s) => s.addEmployee)
  const updateEmployee = useCrmData((s) => s.updateEmployee)
  const deleteEmployee = useCrmData((s) => s.deleteEmployee)

  const [role, setRole] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  const rows = useMemo(() => (role === 'All' ? employees : employees.filter((e) => e.role === role)), [role, employees])
  const active = employees.filter((e) => e.status === 'Active').length

  const openNew = () => { setForm(EMPTY); setErr(''); setEditing('new') }
  const openEdit = (e) => { setForm({ name: e.name, role: e.role, branch: e.branch, email: e.email || '', phone: e.phone || '', status: e.status, sales: e.sales }); setErr(''); setEditing(e) }
  const close = () => setEditing(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setErr(t('nameReq')); return }
    try {
      if (editing === 'new') { await addEmployee(form); push(t('created'), 'success') }
      else { await updateEmployee(editing.id, form); push(t('updated'), 'success') }
      close()
    } catch (e) { setErr(e.message) }
  }
  const remove = async () => {
    if (editing === 'new') return
    if (!window.confirm(t('confirmDelete'))) return
    try { await deleteEmployee(editing.id); push(t('deleted'), 'info'); close() } catch (e) { push(e.message, 'error') }
  }

  const columns = [
    { key: 'name', header: th(lang, 'employee'), sortable: true, render: (e) => (
      <div className="cell-media"><span className="avatar" style={{ background: colorFrom(e.name) }}>{initials(e.name)}</span>
        <div><div className="cell-strong">{e.name}</div><div className="cell-muted" style={{ fontSize: 12 }}>{e.email || '—'}</div></div></div>
    ) },
    { key: 'role', header: th(lang, 'role'), sortable: true, render: (e) => <span className="badge indigo" style={{ fontWeight: 600 }}><ShieldCheck size={11} /> {tRole(lang, e.role)}</span> },
    { key: 'branch', header: th(lang, 'branch'), sortable: true, render: (e) => branchName(e.branch) },
    { key: 'phone', header: th(lang, 'phone'), render: (e) => <span className="cell-muted">{e.phone || '—'}</span> },
    { key: 'sales', header: th(lang, 'sales'), sortable: true, align: 'right', render: (e) => <b>{money(e.sales)}</b> },
    { key: 'status', header: th(lang, 'status'), sortable: true, render: (e) => <Badge status={e.status} /> },
  ]

  return (
    <div className="page">
      <PageHeader
        title={t('employees')} subtitle={`${number(employees.length)} ${t('employeesSub1')} ${BRANCHES.length} ${t('branchesWord')} · ${ROLES.length} ${t('rolesWord')}`} breadcrumb={[{ label: t('employees') }]}
        actions={<button className="btn btn-primary" onClick={openNew}><UserPlus size={16} /> {t('addEmployee')}</button>}
      />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label={t('totalStaff')} value={number(employees.length)} icon={Users} tone="indigo" />
        <StatCard label={t('activeStat')} value={number(active)} icon={Users} tone="green" />
        <StatCard label={t('rolesStat')} value={number(ROLES.length)} icon={ShieldCheck} tone="violet" />
      </div>
      <DataTable
        columns={columns} rows={rows} searchKeys={['name', 'email', 'phone']} searchPlaceholder={t('searchEmployees')}
        onRowClick={openEdit}
        filters={
          <select className="select" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="All">{t('allRoles')}</option>
            {ROLES.map((r) => <option key={r} value={r}>{tRole(lang, r)}</option>)}
          </select>
        }
      />

      <Drawer
        open={!!editing}
        title={editing === 'new' ? t('addEmployee') : t('employees')}
        onClose={close}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>{editing === 'new' ? t('save') : t('saveChanges')}</button>
            {editing !== 'new' && <button className="btn btn-ghost" onClick={remove} style={{ color: 'var(--danger)' }}><Trash2 size={15} /> {t('deleteWord')}</button>}
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="field"><label>{th(lang, 'name')} *</label><input className={`input${err ? ' input-err' : ''}`} value={form.name} onChange={set('name')} autoFocus /></div>
          {err && <span className="err-text">{err}</span>}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>{th(lang, 'role')}</label>
              <select className="select" value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{tRole(lang, r)}</option>)}
              </select>
            </div>
            <div className="field"><label>{th(lang, 'branch')}</label>
              <select className="select" value={form.branch} onChange={set('branch')}>
                {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field"><label>{t('emailLabel')}</label><input className="input" value={form.email} onChange={set('email')} /></div>
            <div className="field"><label>{th(lang, 'phone')}</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div className="field"><label>{th(lang, 'sales')}</label><input className="input" type="number" min="0" value={form.sales} onChange={set('sales')} /></div>
            <div className="field"><label>{th(lang, 'status')}</label>
              <select className="select" value={form.status} onChange={set('status')}>
                {['Active', 'On leave', 'Inactive'].map((s) => <option key={s} value={s}>{tStatus(lang, s)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
