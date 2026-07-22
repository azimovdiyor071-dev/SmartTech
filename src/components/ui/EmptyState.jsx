import { Inbox } from 'lucide-react'
import { useT } from '../../i18n/useI18n.js'

export default function EmptyState({ title, sub, icon: Icon = Inbox }) {
  const { t } = useT()
  return (
    <div className="state">
      <div className="state-icon"><Icon size={26} /></div>
      <h4>{title || t('noData')}</h4>
      <p>{sub || t('noDataSub')}</p>
    </div>
  )
}
