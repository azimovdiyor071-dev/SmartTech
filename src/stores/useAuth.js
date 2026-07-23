import { create } from 'zustand'
import { api, getToken, setToken } from '../services/api.js'

const USER_KEY = 'stc.session'

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch { /* ignore */ }
}

// A session is valid only if we have both a token and a cached user.
const initialUser = getToken() ? loadUser() : null

export const useAuth = create((set) => ({
  user: initialUser,

  login: async ({ email, password }) => {
    const { token, user } = await api.post('/auth/login', { email, password })
    setToken(token)
    storeUser(user)
    set({ user })
    return user
  },

  register: async ({ name, email, password, role }) => {
    const { token, user } = await api.post('/auth/register', { name, email, password, role })
    setToken(token)
    storeUser(user)
    set({ user })
    return user
  },

  // Update the signed-in user's display name (shown across the control panel).
  updateProfile: async ({ name }) => {
    const { user } = await api.patch('/auth/me', { name })
    storeUser(user)
    set({ user })
    return user
  },

  logout: () => {
    setToken(null)
    storeUser(null)
    set({ user: null })
  },
}))
