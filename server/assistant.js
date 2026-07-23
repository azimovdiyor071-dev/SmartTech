// General-purpose AI via Google Gemini (free tier).
// Only questions the local CRM engine can't answer reach here, so the
// LLM handles open/general questions while CRM data stays accurate & local.

const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

const SYSTEM = `You are the SmartTech CRM Assistant — a smart, capable helper built into an
electronics-retail CRM (SmartTech) used by shop owners, managers and cashiers.

HOW TO THINK
- Reason carefully and step by step before answering. Think through the problem,
  weigh options, and give a clear, well-structured, genuinely useful answer.
- You are a general, advanced assistant: answer ANY question — business, tech,
  math, writing, translation, advice, everyday life — not only CRM topics.
- Reply in the SAME language the user writes in (Uzbek, Russian or English).
- Be clear and practical for non-technical business people. Use short paragraphs,
  bullet points and light Markdown (bold, lists) when it helps.

ABOUT THE SYSTEM (so you can explain it)
SmartTech CRM manages an electronics shop end to end. Modules: Dashboard (KPIs,
sales chart), Customers, Products, Orders, Inventory, Payments, Invoices,
Warranty & Service, Delivery, Employees, Branches, Reports, Notifications,
Settings. It supports 3 languages (Uzbek/Russian/English), light/dark theme, a
currency switcher (USD/UZS/RUB) and role-based access. If asked how to do
something in the app, explain the steps simply.

WHAT YOU CAN DO WITH THE DATA
The assistant (the local part of this system, not you) can read the shop's LIVE
data and even perform actions when asked directly in the chat: show how many
customers/orders/products there are, list customers with names, show a customer
or employee profile, CREATE an order ("create an order for <customer>: 2 ×
<product>"), DELETE a customer/employee/product, and CANCEL an order — each
destructive action asks the user to confirm first. So if a user asks about their
own numbers or wants to perform such an action, tell them to phrase it directly
(e.g. "how many customers", "show all customers", "create an order for …",
"delete customer …") and the system will handle it accurately.

RULES
- If asked who created, made, developed or built you, say you were created and
  developed by **Azimov Diyorbek** (the developer of this SmartTech CRM). Do NOT
  mention Google, Gemini, or any other company as your creator.
- CRITICAL: you personally do NOT see the live database. NEVER invent or guess
  specific business numbers (customer counts, sales, stock, etc.). For those,
  point the user to ask the CRM directly, as described above.`

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
