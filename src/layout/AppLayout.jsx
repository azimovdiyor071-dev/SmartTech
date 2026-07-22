import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Toasts from '../components/ui/Toasts.jsx'
import AssistantWidget from '../components/assistant/AssistantWidget.jsx'
import { useAuth } from '../stores/useAuth.js'
import { useCrmData } from '../stores/useCrmData.js'

export default function AppLayout() {
  const user = useAuth((s) => s.user)
  const status = useCrmData((s) => s.status)
  const error = useCrmData((s) => s.error)
  const load = useCrmData((s) => s.load)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (user && status === 'idle') load()
  }, [user, status, load])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
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
          <Outlet />
        )}
      </div>
      <Toasts />
      <AssistantWidget />
    </div>
  )
}
