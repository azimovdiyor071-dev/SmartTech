import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, X, Trash2, Copy, Send, Bot, Maximize2, Minimize2, Check, ImagePlus,
} from 'lucide-react'
import Markdown from './Markdown.jsx'
import { useAssistant } from '../../ai/useAssistant.js'
import { useToast } from '../../stores/useToast.js'
import { useI18n } from '../../i18n/useI18n.js'

// [label, query] — the query is written in the widget language so
// language detection keeps replies in that language.
const QUICK_ACTIONS = {
  en: [
    ["Today's Sales", "today's sales"], ['Monthly Revenue', 'monthly revenue'], ['Orders', 'recent orders'],
    ['Low Stock', 'low stock products'], ['Customers', 'top customers'], ['Best Products', 'best selling products'],
    ['Pending Payments', 'orders awaiting payment'], ['Warranty', 'warranty expiring this week'],
    ['Best Branch', 'best branch'], ['Insights', 'what should i focus on'],
  ],
  uz: [
    ['Bugungi savdo', 'bugungi savdo'], ['Oylik daromad', 'oylik daromad'], ['Buyurtmalar', "so'nggi buyurtmalar"],
    ['Kam qoldiq', 'kam qolgan mahsulotlar'], ['Mijozlar', 'eng yaxshi mijozlar'], ['Eng ko\'p sotilgan', 'eng ko\'p sotilgan mahsulotlar'],
    ["To'lov kutayotgan", "to'lov kutayotgan buyurtmalar"], ['Kafolat', 'kafolat tugayapti'],
    ['Eng yaxshi filial', 'eng yaxshi filial'], ['Tahlil', 'menga tavsiya ber'],
  ],
  ru: [
    ['Продажи сегодня', 'продажи сегодня'], ['Выручка за месяц', 'выручка за месяц'], ['Заказы', 'последние заказы'],
    ['Низкий остаток', 'товары с низким остатком'], ['Клиенты', 'топ клиентов'], ['Хиты продаж', 'самые продаваемые товары'],
    ['Ждут оплаты', 'заказы ожидающие оплаты'], ['Гарантия', 'гарантия истекает на этой неделе'],
    ['Лучший филиал', 'лучший филиал'], ['Аналитика', 'что мне посоветуешь'],
  ],
}

const CHROME = {
  en: { title: 'CRM Assistant', online: 'Online · Local engine', typing: 'typing…', placeholder: 'Ask about sales, orders, stock…', clear: 'Clear conversation' },
  uz: { title: 'CRM Yordamchisi', online: 'Onlayn · Lokal tizim', typing: 'yozmoqda…', placeholder: 'Savdo, buyurtma, ombor haqida so\'rang…', clear: 'Suhbatni tozalash' },
  ru: { title: 'CRM Ассистент', online: 'Онлайн · Локальный движок', typing: 'печатает…', placeholder: 'Спросите о продажах, заказах, складе…', clear: 'Очистить диалог' },
}

export default function AssistantWidget() {
  const { open, maximized, typing, messages, toggleOpen, setOpen, toggleMax, clear, send } = useAssistant()
  const push = useToast((s) => s.push)
  const lang = useI18n((s) => s.lang)
  const c = CHROME[lang] || CHROME.en
  const quickActions = QUICK_ACTIONS[lang] || QUICK_ACTIONS.en
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(null)
  const [attached, setAttached] = useState(null) // { data, mimeType, preview }
  const bodyRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing, open])

  const onPickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 8 * 1024 * 1024) { push('Image too large (max 8MB).', 'error'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result // data:image/...;base64,XXXX
      setAttached({ data: String(url).split(',')[1], mimeType: file.type, preview: url })
    }
    reader.readAsDataURL(file)
  }

  const submit = (e) => {
    e?.preventDefault()
    if (!input.trim() && !attached) return
    send(input, attached)
    setInput('')
    setAttached(null)
  }

  const ask = (q) => send(q)

  const copy = (msg) => {
    navigator.clipboard?.writeText(msg.md).then(() => {
      setCopied(msg.id)
      push('Copied to clipboard', 'success')
      setTimeout(() => setCopied(null), 1500)
    })
  }

  if (!open) {
    return (
      <button className="ai-fab" onClick={toggleOpen} aria-label="Open AI Assistant">
        <Sparkles size={22} />
        <span className="ai-fab-pulse" />
      </button>
    )
  }

  return (
    <div className={`ai-panel${maximized ? ' is-max' : ''}`} role="dialog" aria-label="SmartTech CRM Assistant">
      <header className="ai-head">
        <div className="ai-head-title">
          <span className="ai-avatar"><Bot size={18} /></span>
          <div>
            <b>{c.title}</b>
            <span className="ai-status"><i className="ai-online" /> {typing ? c.typing : c.online}</span>
          </div>
        </div>
        <div className="ai-head-actions">
          <button className="ai-icon" onClick={clear} title={c.clear}><Trash2 size={16} /></button>
          <button className="ai-icon" onClick={toggleMax} title={maximized ? 'Restore' : 'Maximize'}>{maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button className="ai-icon" onClick={() => setOpen(false)} title="Close"><X size={17} /></button>
        </div>
      </header>

      <div className="ai-body" ref={bodyRef}>
        {messages.map((m) => (
          <div key={m.id} className={`ai-msg ${m.role}`}>
            {m.role === 'assistant' && <span className="ai-avatar sm"><Bot size={15} /></span>}
            <div className="ai-bubble">
              {m.image && <img src={m.image} alt="attachment" className="ai-msg-img" />}
              <Markdown text={m.md} />
              {m.role === 'assistant' && m.id !== 'welcome' && (
                <button className="ai-copy" onClick={() => copy(m)} title="Copy">
                  {copied === m.id ? <Check size={13} /> : <Copy size={13} />}
                </button>
              )}
              {m.suggestions?.length > 0 && (
                <div className="ai-chips" style={{ marginTop: 10 }}>
                  {m.suggestions.map((s) => <button key={s} className="ai-chip" onClick={() => ask(s)}>{s}</button>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="ai-msg assistant">
            <span className="ai-avatar sm"><Bot size={15} /></span>
            <div className="ai-bubble"><div className="ai-typing"><span /><span /><span /></div></div>
          </div>
        )}
      </div>

      <div className="ai-quick">
        {quickActions.map(([label, q]) => (
          <button key={label} className="ai-chip" onClick={() => ask(q)}>{label}</button>
        ))}
      </div>

      {attached && (
        <div className="ai-attach">
          <img src={attached.preview} alt="to send" />
          <button type="button" onClick={() => setAttached(null)} aria-label="Remove image"><X size={13} /></button>
        </div>
      )}

      <form className="ai-input" onSubmit={submit}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
        <button type="button" className="ai-icon" onClick={() => fileRef.current?.click()} title="Attach image" aria-label="Attach image"><ImagePlus size={18} /></button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.placeholder}
          aria-label="Message the assistant"
        />
        <button type="submit" className="ai-send" disabled={(!input.trim() && !attached) || typing} aria-label="Send"><Send size={17} /></button>
      </form>
    </div>
  )
}
