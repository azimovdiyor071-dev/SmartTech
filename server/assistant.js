// General-purpose AI via Google Gemini (free tier).
// Only questions the local CRM engine can't answer reach here, so the
// LLM handles open/general questions while CRM data stays accurate & local.

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

const SYSTEM = `You are the SmartTech CRM Assistant — a friendly helper built into an
electronics-retail CRM used by ordinary shop owners, managers and cashiers.

- Answer helpfully and concisely. You may answer general questions too (not only CRM).
- Reply in the SAME language the user writes in (Uzbek, Russian or English).
- Keep it simple and clear for non-technical business users. Short paragraphs or bullet points.
- Use light Markdown (bold, lists) when helpful. Be warm and practical.`

export async function askGemini(query, history = []) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { md: '🤖 The AI is not configured yet. An administrator needs to add a Gemini API key.' }
  }

  const contents = [
    ...history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.md || '') }] })),
    { role: 'user', parts: [{ text: query }] },
  ]

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
      }),
    })
  } catch {
    return { md: '⚠️ Could not reach the AI service. Please try again.' }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Gemini error', res.status, detail.slice(0, 200))
    return { md: '⚠️ The AI service returned an error. Please try again in a moment.' }
  }

  const data = await res.json().catch(() => null)
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
  return { md: text || "Sorry, I couldn't come up with an answer." }
}
