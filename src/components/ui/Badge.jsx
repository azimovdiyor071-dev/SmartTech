import { statusVariant } from '../../lib/status.js'
import { useI18n } from '../../i18n/useI18n.js'
import { tStatus } from '../../i18n/labels.js'

export default function Badge({ status, variant, children, dot = true }) {
  const lang = useI18n((s) => s.lang)
  const v = variant || statusVariant(status)
  // Color mapping stays keyed on the raw English status; only the text is localized.
  const text = children ?? tStatus(lang, status)
  return (
    <span className={`badge ${v}`}>
      {dot && <span className="badge-dot" />}
      {text}
    </span>
  )
}
