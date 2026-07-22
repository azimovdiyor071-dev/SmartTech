// Thin fetch wrapper for the backend API. Attaches the JWT and
// centralises error handling.
//   dev:        VITE_API_URL unset → '/api' (proxied to the server by Vite)
//   production: VITE_API_URL = https://your-api.onrender.com → absolute calls
const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'stc.token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the API running?')
  }

  // Session expired / invalid token → clear it and send the user to login.
  // (Skip for /auth/* where a 401 just means "wrong credentials".)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    setToken(null)
    try { localStorage.removeItem('stc.session') } catch { /* ignore */ }
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
}
