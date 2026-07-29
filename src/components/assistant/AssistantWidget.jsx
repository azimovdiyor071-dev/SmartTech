import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, X, Trash2, Copy, Send, Bot, Maximize2, Minimize2, Check, ImagePlus, Mic, Volume2, VolumeX,
} from 'lucide-react'
import Markdown from './Markdown.jsx'
import { useAssistant } from '../../ai/useAssistant.js'
import { useToast } from '../../stores/useToast.js'
import { useI18n } from '../../i18n/useI18n.js'
import { useSpeech } from '../../hooks/useSpeech.js'

// [label, query] — the query is written in the widget language so
// language detection keeps replies in that language.
const QUICK_ACTIONS = {
  en: [
    ["Today's Sales", "today's sales"], ['Monthly Revenue', 'monthly revenue'], ['Orders', 'recent orders'],
    ['Low Stock', 'low stock products'], ['Customers', 'top customers'], ['Best Products', 'best selling products'],
    ['Pending Payments', 'orders awaiting payment'], ['Warranty', 'warranty expiring this week'],
    ['Best Branch', 'best branch'], ['Insights', 'give me business insights and advice'],
  ],
  uz: [
    ['Bugungi savdo', 'bugungi savdo'], ['Oylik daromad', 'oylik daromad'], ['Buyurtmalar', "so'nggi buyurtmalar"],
    ['Kam qoldiq', 'kam qolgan mahsulotlar'], ['Mijozlar', 'eng yaxshi mijozlar'], ['Eng ko\'p sotilgan', 'eng ko\'p sotilgan mahsulotlar'],
    ["To'lov kutayotgan", "to'lov kutayotgan buyurtmalar"], ['Kafolat', 'kafolat tugayapti'],
    ['Eng yaxshi filial', 'eng yaxshi filial'], ['Tahlil', 'menga tahlil va tavsiya ber'],
  ],
  ru: [
    ['Продажи сегодня', 'продажи сегодня'], ['Выручка за месяц', 'выручка за месяц'], ['Заказы', 'последние заказы'],
    ['Низкий остаток', 'товары с низким остатком'], ['Клиенты', 'топ клиентов'], ['Хиты продаж', 'самые продаваемые товары'],
    ['Ждут оплаты', 'заказы ожидающие оплаты'], ['Гарантия', 'гарантия истекает на этой неделе'],
    ['Лучший филиал', 'лучший филиал'], ['Аналитика', 'дай аналитику и совет'],
  ],
}

const CHROME = {
  en: { title: 'CRM Assistant', online: 'Online · Local engine', typing: 'typing…', placeholder: 'Ask about sales, orders, stock…', clear: 'Clear conversation', imgBig: 'Image too large (max 8MB).', copied: 'Copied to clipboard', voiceOn: 'Voice replies: on', voiceOff: 'Voice replies: off', restore: 'Restore', maximize: 'Maximize', close: 'Close', copy: 'Copy', attach: 'Attach image', listening: 'Listening… tap to stop', speak: 'Speak', listeningPh: 'Listening…', noVoice: 'Voice input not supported in this browser.' },
  uz: { title: 'CRM Yordamchisi', online: 'Onlayn · Lokal tizim', typing: 'yozmoqda…', placeholder: 'Savdo, buyurtma, ombor haqida so\'rang…', clear: 'Suhbatni tozalash', imgBig: 'Rasm juda katta (maks. 8MB).', copied: 'Nusxa olindi', voiceOn: 'Ovozli javob: yoniq', voiceOff: 'Ovozli javob: o\'chiq', restore: 'Tiklash', maximize: 'Kattalashtirish', close: 'Yopish', copy: 'Nusxa olish', attach: 'Rasm biriktirish', listening: 'Tinglayapman… to\'xtatish uchun bosing', speak: 'Gapiring', listeningPh: 'Tinglayapman…', noVoice: 'Brauzeringiz ovozni qo\'llab-quvvatlamaydi.' },
  ru: { title: 'CRM Ассистент', online: 'Онлайн · Локальный движок', typing: 'печатает…', placeholder: 'Спросите о продажах, заказах, складе…', clear: 'Очистить диалог', imgBig: 'Изображение слишком большое (макс. 8МБ).', copied: 'Скопировано', voiceOn: 'Голосовые ответы: вкл', voiceOff: 'Голосовые ответы: выкл', restore: 'Свернуть', maximize: 'Развернуть', close: 'Закрыть', copy: 'Копировать', attach: 'Прикрепить изображение', listening: 'Слушаю… нажмите, чтобы остановить', speak: 'Говорите', listeningPh: 'Слушаю…', noVoice: 'Браузер не поддерживает голосовой ввод.' },
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
  const spokenRef = useRef(null)
  const { voiceSupported, speakSupported, listening, speakOn, setSpeakOn, speak, listen, stopListening } = useSpeech(lang)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing, open])

  // On mount, mark the last restored message as already "spoken" so persisted
  // history isn't read aloud on reload and toggling voice on doesn't re-read it.
  useEffect(() => {
    const last = messages[messages.length - 1]
    spokenRef.current = last ? last.id : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Read only genuinely NEW assistant replies aloud when voice output is on.
  useEffect(() => {
    if (!speakOn || typing) return
    const last = messages[messages.length - 1]
    if (last && last.role === 'assistant' && last.id !== 'welcome' && last.id !== spokenRef.current) {
      spokenRef.current = last.id
      speak(last.md)
    }
  }, [messages, typing, speakOn, speak])

  // Tap the mic → transcribe speech → send it (and hear the reply back).
  const onMic = () => {
    if (listening) { stopListening(); return }
    const started = listen((transcript) => {
      setSpeakOn(true)
      send(transcript)
    })
    if (!started) push(c.noVoice, 'error')
  }

  const onPickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 8 * 1024 * 1024) { push(c.imgBig, 'error'); return }
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
      push(c.copied, 'success')
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
          {speakSupported && (
            <button className={`ai-icon${speakOn ? ' is-on' : ''}`} onClick={() => setSpeakOn(!speakOn)} title={speakOn ? c.voiceOn : c.voiceOff} aria-label="Toggle voice replies">
              {speakOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
          <button className="ai-icon" onClick={clear} title={c.clear}><Trash2 size={16} /></button>
          <button className="ai-icon" onClick={toggleMax} title={maximized ? c.restore : c.maximize}>{maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button className="ai-icon" onClick={() => setOpen(false)} title={c.close}><X size={17} /></button>
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
                <button className="ai-copy" onClick={() => copy(m)} title={c.copy}>
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
        <button type="button" className="ai-icon" onClick={() => fileRef.current?.click()} title={c.attach} aria-label={c.attach}><ImagePlus size={18} /></button>
        {voiceSupported && (
          <button type="button" className={`ai-icon${listening ? ' is-rec' : ''}`} onClick={onMic} title={listening ? c.listening : c.speak} aria-label={c.speak}><Mic size={18} /></button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? c.listeningPh : c.placeholder}
          aria-label="Message the assistant"
        />
        <button type="submit" className="ai-send" disabled={(!input.trim() && !attached) || typing} aria-label="Send"><Send size={17} /></button>
      </form>
    </div>
  )
}
