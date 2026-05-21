// Global auth state. Source of truth for the logged-in user.
import { create } from 'zustand'
import { authApi, tokenStore } from './api'

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  hydrate: async () => {
    if (!tokenStore.getAccess()) {
      set({ loading: false })
      return
    }
    try {
      const { data } = await authApi.me()
      set({ user: data, loading: false })
    } catch (e) {
      tokenStore.clear()
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      await authApi.login(email, password)
      const { data } = await authApi.me()
      set({ user: data })
      return data
    } catch (e) {
      const msg = e.response?.data?.detail || 'Невалидни податоци за најава.'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  register: async (payload) => {
    set({ error: null })
    try {
      await authApi.register(payload)
      // Auto-login after registration
      await authApi.login(payload.email, payload.password)
      const { data } = await authApi.me()
      set({ user: data })
      return data
    } catch (e) {
      const err = e.response?.data
      let msg = 'Регистрацијата не успеа.'
      if (err && typeof err === 'object') {
        msg = Object.values(err).flat().join(' ') || msg
      }
      set({ error: msg })
      throw new Error(msg)
    }
  },

  logout: () => {
    authApi.logout()
    set({ user: null })
  },

  isInstructor: () => {
    const u = get().user
    return u && (u.role === 'instructor' || u.role === 'admin')
  },
  isModerator: () => {
    const u = get().user
    return u && (u.role === 'moderator' || u.role === 'admin')
  },
  isAdmin: () => {
    const u = get().user
    return u && u.role === 'admin'
  },
}))
