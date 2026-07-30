import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Toasts from '../components/ui/Toasts.jsx'
import AssistantWidget from '../components/assistant/AssistantWidget.jsx'
import { useAuth } from '../stores/useAuth.js'
import { useCrmData } from '../stores/useCrmData.js'
import { useCurrency } from '../stores/useCurrency.js'
import { warmUp } from '../services/api.js'

export default function AppLayout() {
  const user = useAuth((s) => s.user)
  const status = useCrmData((s) => s.status)
  const error = useCrmData((s) => s.error)
  const load = useCrmData((s) => s.load)
  // Subscribe so the whole page subtree re-renders when the currency changes.
  const currency = useCurrency((s) => s.currency)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (user && status === 'idle') load()
  }, [user, status, load])

  // While the app is open, ping the backend every 10 min so it stays awake
  // (a second layer alongside the scheduled keep-alive) — keeps the CRM snappy
  // during the working day.
  useEffect(() => {
    const id = setInterval(() => warmUp(), 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell" data-currency={currency}>
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="main-col">
        <Topbar onMenu={() => setMenuOpen((o) => !o)} />
        {status === 'error' ? (
          <div className="page">
            <div className="card state">
              <div className="state-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><AlertTriangle size={26} /></div>
              <h4>Cannot reach the server</h4>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={load}>Retry</button>
            </div>
          </div>
        ) : status === 'loading' || status === 'idle' ? (
          <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <div className="spinner" />
          </div>
        ) : (
          // Key by currency: React Router preserves the Outlet's element across
          // re-renders, so without this the page keeps the old currency. Remounting
          // on change re-reads money() with the new rate. (Data lives in the store,
          // so a remount is cheap and loses no data.)
          <Outlet key={currency} />
        )}
      </div>
      <Toasts />
      <AssistantWidget />
    </div>
  )
}
