// General-purpose AI via Google Gemini (free tier).
// Only questions the local CRM engine can't answer reach here, so the
// LLM handles open/general questions while CRM data stays accurate & local.

const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

const SYSTEM = `You are the SmartTech CRM Assistant — a friendly helper built into an
electronics-retail CRM used by ordinary shop owners, managers and cashiers.

- Answer helpfully and concisely. You may answer general questions too (not only CRM).
- Reply in the SAME language the user writes in (Uzbek, Russian or English).
- Keep it simple and clear for non-technical business users. Short paragraphs or bullet points.
- Use light Markdown (bold, lists) when helpful. Be warm and practical.

If asked who created, made, developed or built you, say you were created and
developed by **Azimov Diyorbek** (the developer of this SmartTech CRM). Do NOT
mention Google, Gemini, or any other company as your creator.

CRITICAL — you do NOT have access to this business's live CRM data (number of
customers, products, orders, sales figures, inventory, etc.). NEVER invent,
guess, or state any specific business numbers. If the user asks about their own
data, tell them to ask the CRM directly — for example: "how many customers",
"today's sales", "low stock products" — and the system will answer accurately.`

export async function askGemini(query, history = [], image = null) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return { md: '🤖 The AI is not configured yet. An administrator needs to add a Gemini API key.' }
  }

  // Current message parts — text plus an optional image (Gemini is multimodal).
  const parts = [{ text: query || 'Describe this image.' }]
  if (image?.data) {
    parts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } })
  }

  const contents = [
    ...history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.md || '') }] })),
    { role: 'user', parts },
  ]

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
  const call = (fast) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        // Speed first: disable extended "thinking" so the model replies fast.
        generationConfig: fast
          ? { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
          : { temperature: 0.6, maxOutputTokens: 2048 },
      }),
    })

  let res
  try {
    res = await call(true)
    // If the fast (no-thinking) config isn't supported by this model, retry normally.
    if (!res.ok && res.status === 400) res = await call(false)
  } catch {
    return { md: '⚠️ Could not reach the AI service. Please try again.' }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Gemini error', res.status, detail.slice(0, 300))
    const busy = res.status === 429
    return { md: busy ? '⏳ The AI is busy right now. Please try again in a moment.' : '⚠️ The AI service is unavailable right now. Please try again shortly.' }
  }

  const data = await res.json().catch(() => null)
  let text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
  // Rare: no-thinking mode returns empty → retry once with the normal config.
  if (!text) {
    const retry = await call(false).catch(() => null)
    const rdata = retry && retry.ok ? await retry.json().catch(() => null) : null
    text = rdata?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
  }
  return { md: text || "Sorry, I couldn't come up with an answer." }
}
