import { useCallback, useEffect, useRef, useState } from 'react'

// Browser speech: voice input (SpeechRecognition) + spoken replies
// (speechSynthesis). Both are free and run entirely in the browser.
const LANG = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Turn Markdown into something that reads naturally aloud.
function plain(md = '') {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\|/g, ' ').replace(/[#>*_`~-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ').trim()
}

export function useSpeech(lang = 'en') {
  const [listening, setListening] = useState(false)
  const [speakOn, setSpeakOn] = useState(() => {
    try { return localStorage.getItem('stc.speak') === '1' } catch { return false }
  })
  const recRef = useRef(null)
  const locale = LANG[lang] || LANG.en

  useEffect(() => {
    try { localStorage.setItem('stc.speak', speakOn ? '1' : '0') } catch { /* ignore */ }
    if (!speakOn && canSpeak) window.speechSynthesis.cancel()
  }, [speakOn])

  // Stop any live recognition / speech when the widget unmounts (e.g. on logout).
  useEffect(() => () => {
    try { recRef.current?.stop() } catch { /* noop */ }
    if (canSpeak) window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((md) => {
    if (!canSpeak) return
    const text = plain(md)
    if (!text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = locale
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  }, [locale])

  // Record one utterance and hand the transcript to onResult.
  const listen = useCallback((onResult) => {
    if (!SR) return false
    if (recRef.current) { try { recRef.current.stop() } catch { /* noop */ } }
    const rec = new SR()
    rec.lang = locale
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript?.trim()
      if (t) onResult(t)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
    return true
  }, [locale])

  const stopListening = useCallback(() => {
    try { recRef.current?.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  return {
    voiceSupported: !!SR,
    speakSupported: canSpeak,
    listening,
    speakOn,
    setSpeakOn,
    speak,
    listen,
    stopListening,
  }
}