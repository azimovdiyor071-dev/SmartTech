import { useState } from 'react'
import { Building2, Coins, Languages, Bell, Plug, KeyRound, Database } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useI18n, useT } from '../i18n/useI18n.js'
import { LANGS } from '../i18n/dictionaries.js'
import { th } from '../i18n/labels.js'
import { useToast } from '../stores/useToast.js'

export default function Settings() {
  const push = useToast((s) => s.push)
  const { t } = useT()
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)
  const [tab, setTab] = useState('company')
  const save = () => push(t('settingsSaved'), 'success')

  const TABS = [
    { id: 'company', label: t('tabCompany'), icon: Building2 },
    { id: 'localization', label: t('tabLocalization'), icon: Languages },
    { id: 'finance', label: t('tabFinance'), icon: Coins },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'integrations', label: t('tabIntegrations'), icon: Plug },
    { id: 'system', label: t('tabSystem'), icon: KeyRound },
  ]

  return (
    <div className="page">
      <PageHeader title={t('settings')} subtitle={t('settingsSub')} breadcrumb={[{ label: t('settings') }]} />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card" style={{ padding: 8 }}>
          {TABS.map((tb) => (
            <button key={tb.id} className={`nav-item${tab === tb.id ? ' is-active' : ''}`} style={{ width: '100%' }} onClick={() => setTab(tb.id)}>
              <tb.icon size={17} /> {tb.label}
            </button>
          ))}
        </div>

        <div className="card card-pad" style={{ display: 'grid', gap: 16 }}>
          {tab === 'company' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('companyProfile')}</h3>
              <div className="grid grid-2" style={{ gap: 14 }}>
                <div className="field"><label>{t('companyName')}</label><input className="input" defaultValue="SmartTech Electronics LLC" /></div>
                <div className="field"><label>{t('supportEmail')}</label><input className="input" defaultValue="support@smarttech.uz" /></div>
                <div className="field"><label>{th(lang, 'phone')}</label><input className="input" defaultValue="+998 71 200 10 10" /></div>
                <div className="field"><label>{t('website')}</label><input className="input" defaultValue="smarttech.uz" /></div>
              </div>
              <div className="field"><label>{t('addressField')}</label><textarea className="input" rows={2} defaultValue="Amir Temur Ave 12, Tashkent, Uzbekistan" /></div>
            </>
          )}
          {tab === 'localization' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('tabLocalization')}</h3>
              <div className="grid grid-2" style={{ gap: 14 }}>
                <div className="field"><label>{t('interfaceLang')}</label>
                  <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
                    {LANGS.map((l) => <option key={l.code} value={l.code}>{l.code === 'en' ? 'English' : l.code === 'uz' ? "O'zbek" : 'Русский'}</option>)}
                  </select>
                </div>
                <div className="field"><label>{t('timezone')}</label><select className="select" defaultValue="Asia/Tashkent"><option>Asia/Tashkent</option><option>UTC</option></select></div>
                <div className="field"><label>{t('dateFormat')}</label><select className="select"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
              </div>
            </>
          )}
          {tab === 'finance' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('financeTax')}</h3>
              <div className="grid grid-2" style={{ gap: 14 }}>
                <div className="field"><label>{t('currency')}</label><select className="select"><option>USD ($)</option><option>UZS (soʻm)</option><option>EUR (€)</option></select></div>
                <div className="field"><label>{t('taxRate')}</label><input className="input" type="number" defaultValue={12} /></div>
                <div className="field"><label>{t('invoicePrefix')}</label><input className="input" defaultValue="INV-" /></div>
                <div className="field"><label>{t('fiscalYear')}</label><select className="select"><option>January</option><option>April</option></select></div>
              </div>
            </>
          )}
          {tab === 'notifications' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('notifChannels')}</h3>
              {[t('taskNewOrders'), t('todaysSales'), t('lowStockKpi'), t('taskWarranty')].map((n) => (
                <label key={n} className="kv" style={{ cursor: 'pointer' }}><span>{n}</span><input type="checkbox" defaultChecked /></label>
              ))}
            </>
          )}
          {tab === 'integrations' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('tabIntegrations')}</h3>
              {['Telegram Bot', 'SMS Gateway', 'Email (SMTP)', 'Payme / Click'].map((name) => (
                <div key={name} className="kv"><span style={{ color: 'var(--text)' }}><b>{name}</b></span><button className="btn btn-ghost btn-sm" onClick={() => push(`${name} ${t('connectedDemo')}`, 'success')}>{t('connect')}</button></div>
              ))}
            </>
          )}
          {tab === 'system' && (
            <>
              <h3 style={{ fontSize: 16 }}>{t('systemApi')}</h3>
              <div className="field"><label>{t('apiKey')}</label><input className="input" defaultValue="stc_live_9f2a•••••••••••••4b7c" readOnly /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => push(t('keyGenerated'), 'success')}><KeyRound size={15} /> {t('regenKey')}</button>
                <button className="btn btn-ghost" onClick={() => push(t('backupStarted'), 'info')}><Database size={15} /> {t('backupNow')}</button>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button className="btn btn-primary" onClick={save}>{t('saveChanges')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
