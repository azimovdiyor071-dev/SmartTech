import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToast } from '../../stores/useToast.js'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

export default function Toasts() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)

  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        const color = t.type === 'error' ? 'var(--danger)' : t.type === 'info' ? 'var(--info)' : 'var(--success)'
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon size={18} style={{ color }} />
            <span style={{ flex: 1, fontSize: 13.5 }}>{t.message}</span>
            <button className="icon-btn" style={{ width: 26, height: 26, border: 'none', background: 'none' }} onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
