import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Bell, Menu, LogOut } from 'lucide-react'
import GlobalSearch from './GlobalSearch.jsx'
import { useTheme } from '../stores/useTheme.js'
import { useAuth } from '../stores/useAuth.js'
import { useI18n, useT } from '../i18n/useI18n.js'
import { useCurrency, CURRENCIES } from '../stores/useCurrency.js'
import { LANGS } from '../i18n/dictionaries.js'
import { initials, colorFrom } from '../lib/format.js'
import { useNotifications, selectUnread } from '../stores/useNotifications.js'

export default function Topbar({ onMenu }) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const { t } = useT()
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)
  const currency = useCurrency((s) => s.currency)
  const setCurrency = useCurrency((s) => s.setCurrency)
  const unread = useNotifications(selectUnread)

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu"><Menu size={18} /></button>

      <GlobalSearch />

      <div className="topbar-spacer" />

      <select className="lang-select" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>

      <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button className="icon-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="dot" />}
      </button>

      <div className="user-chip" onClick={() => navigate('/settings')} title={user?.email}>
        <span className="avatar" style={{ background: colorFrom(user?.name || 'U') }}>{initials(user?.name || 'U')}</span>
        <div className="user-meta">
          <b>{user?.name}</b>
          <span>{user?.role}</span>
        </div>
      </div>

      <button className="icon-btn" onClick={() => { logout(); navigate('/login') }} aria-label={t('logout')} title={t('logout')}>
        <LogOut size={18} />
      </button>
    </header>
  )
}
