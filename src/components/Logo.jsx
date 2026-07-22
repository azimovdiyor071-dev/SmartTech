import darkLogo from '../assets/Dark.png'
import lightLogo from '../assets/Light.png'
import { useTheme } from '../stores/useTheme.js'

// Swaps the brand image by theme: Dark.png in dark mode, Light.png in light mode.
export default function Logo({ className, style, alt = 'SmartTech CRM' }) {
  const theme = useTheme((s) => s.theme)
  const src = theme === 'dark' ? darkLogo : lightLogo
  return <img src={src} alt={alt} className={className} style={style} />
}
