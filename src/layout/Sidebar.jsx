import { NavLink } from 'react-router-dom'
import { NAV_SECTIONS } from './navConfig.js'
import { useT } from '../i18n/useI18n.js'
import { useNotifications, selectUnread } from '../stores/useNotifications.js'
import Logo from '../components/Logo.jsx'

export default function Sidebar({ open, onNavigate }) {
  const { t } = useT()
  const unread = useNotifications(selectUnread)

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <Logo className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey}>
            <div className="nav-section-label">{t(section.labelKey)}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
              >
                <item.icon size={18} />
                <span>{t(item.labelKey)}</span>
                {item.notifBadge && unread > 0 && <span className="nav-badge">{unread}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
