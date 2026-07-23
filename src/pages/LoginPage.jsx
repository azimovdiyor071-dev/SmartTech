import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Cpu, ShieldCheck, BarChart3, Zap, Mail, Lock, User } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../stores/useAuth.js'
import { useToast } from '../stores/useToast.js'
import { useI18n, useT } from '../i18n/useI18n.js'
import { LANGS } from '../i18n/dictionaries.js'
import { tRole } from '../i18n/labels.js'
import { ROLES } from '../data/db.js'

const emailForRole = (role) => (role === 'Super Admin' ? 'admin@smarttech.uz' : `${role.toLowerCase().replace(/[^a-z]+/g, '')}@smarttech.uz`)

const NAME_LABEL = { uz: 'Ismingiz', ru: 'Ваше имя', en: 'Your name' }
const NAME_PLACEHOLDER = { uz: 'Ism familiyangiz', ru: 'Имя и фамилия', en: 'Full name' }

export default function LoginPage() {
  const { user, login, register, updateProfile } = useAuth()
  const navigate = useNavigate()
  const push = useToast((s) => s.push)
  const { t, lang } = useT()
  const setLang = useI18n((s) => s.setLang)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('admin@smarttech.uz')
  const [password, setPassword] = useState('demo1234')
  const [role, setRole] = useState('Super Admin')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const chooseRole = (r) => { setRole(r); setEmail(emailForRole(r)) }

  const submit = async (e) => {
    e.preventDefault()
    // Mobile keyboards often add a stray space or capital → trim so login just works.
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    const cleanName = name.trim().replace(/\s+/g, ' ')
    setEmail(cleanEmail)
    setPassword(cleanPassword)
    const errs = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) errs.email = t('emailLabel')
    if (cleanPassword.length < 6) errs.password = t('passwordLabel')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true)
    try {
      let account
      try {
        account = await login({ email: cleanEmail, password: cleanPassword })
      } catch {
        // No account yet → create one using the entered name (falls back to the role).
        account = await register({ name: cleanName || tRole(lang, role), email: cleanEmail, password: cleanPassword, role })
      }
      // If the user typed a name, make sure the control panel shows exactly that.
      if (cleanName && account?.name !== cleanName) {
        try { account = await updateProfile({ name: cleanName }) } catch { /* keep existing name */ }
      }
      push(`${t('welcomeToast')}, ${account?.name || tRole(lang, role)}!`, 'success')
      navigate('/')
    } catch (err) {
      setErrors({ password: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-aside">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 20 }}>
          <span className="sidebar-logo" style={{ background: 'rgba(255,255,255,0.2)' }}><Cpu size={22} /></span>
          SmartTech CRM
        </div>
        <div>
          <h2>{t('heroTitle')}</h2>
          <div className="auth-feature"><span className="af-ico"><BarChart3 size={18} /></span><div><b>{t('feat1t')}</b><div style={{ opacity: 0.85, fontSize: 13 }}>{t('feat1d')}</div></div></div>
          <div className="auth-feature"><span className="af-ico"><Zap size={18} /></span><div><b>{t('feat2t')}</b><div style={{ opacity: 0.85, fontSize: 13 }}>{t('feat2d')}</div></div></div>
          <div className="auth-feature"><span className="af-ico"><ShieldCheck size={18} /></span><div><b>{t('feat3t')}</b><div style={{ opacity: 0.85, fontSize: 13 }}>{t('feat3d')}</div></div></div>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>© 2026 SmartTech. {t('rights')}</div>
      </div>

      <div className="auth-main">
        <form className="auth-card card card-pad" onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <Logo className="auth-logo-img" />
            <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <h1>{t('signIn')}</h1>
            <p className="page-sub">{t('signInSub')}</p>
          </div>

          <div className="field">
            <label>{NAME_LABEL[lang] || NAME_LABEL.en}</label>
            <div className="search-box" style={{ background: 'var(--surface)' }}>
              <User size={16} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={NAME_PLACEHOLDER[lang] || NAME_PLACEHOLDER.en} />
            </div>
          </div>

          <div className="field">
            <label>{t('emailLabel')}</label>
            <div className="search-box" style={{ background: 'var(--surface)' }}>
              <Mail size={16} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            {errors.email && <span className="err-text">{errors.email}</span>}
          </div>

          <div className="field">
            <label>{t('passwordLabel')}</label>
            <div className="search-box" style={{ background: 'var(--surface)' }}>
              <Lock size={16} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {errors.password && <span className="err-text">{errors.password}</span>}
          </div>

          <div className="field">
            <label>{t('signInAs')}</label>
            <div className="role-grid">
              {ROLES.map((r) => (
                <button type="button" key={r} className={`role-opt${role === r ? ' is-active' : ''}`} onClick={() => chooseRole(r)}>
                  {tRole(lang, r)}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', padding: 11 }}>{submitting ? '…' : t('signIn')}</button>
          <div style={{ textAlign: 'center' }}>
            <a href="#forgot" onClick={(e) => { e.preventDefault(); push(t('resetSent'), 'info') }} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
              {t('forgotPassword')}
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
