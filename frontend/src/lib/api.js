// API client. JWT-based, with refresh-token handling.
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const STORAGE = {
  access: 'fink_access',
  refresh: 'fink_refresh',
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(STORAGE.access),
  getRefresh: () => localStorage.getItem(STORAGE.refresh),
  set: (access, refresh) => {
    if (access) localStorage.setItem(STORAGE.access, access)
    if (refresh) localStorage.setItem(STORAGE.refresh, refresh)
  },
  clear: () => {
    localStorage.removeItem(STORAGE.access)
    localStorage.removeItem(STORAGE.refresh)
  },
}

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try to refresh once
let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retry &&
      tokenStore.getRefresh() &&
      !original.url.includes('/auth/token')
    ) {
      original._retry = true
      try {
        refreshing = refreshing || axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: tokenStore.getRefresh(),
        })
        const resp = await refreshing
        refreshing = null
        tokenStore.set(resp.data.access, resp.data.refresh)
        original.headers.Authorization = `Bearer ${resp.data.access}`
        return api(original)
      } catch (e) {
        refreshing = null
        tokenStore.clear()
        // Don't auto-redirect — let the page handle the error.
        // Auto-redirect during a long-running request (like AI generation) can lose user work.
      }
    }
    return Promise.reject(error)
  }
)

// === Auth ===
export const authApi = {
  login: async (email, password) => {
    const { data } = await axios.post(`${BASE_URL}/auth/token/`, {
      email, password,
    })
    tokenStore.set(data.access, data.refresh)
    return data
  },
  register: (payload) => api.post('/accounts/register/', payload),
  me: () => api.get('/accounts/me/'),
  updateMe: (payload) => {
    if (payload instanceof FormData) {
      return api.patch('/accounts/me/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.patch('/accounts/me/', payload)
  },
  logout: () => tokenStore.clear(),
  publicProfile: (id) => api.get(`/accounts/users/${id}/profile/`),

  // Friends
  myFriendRequests: () => api.get('/accounts/me/friend-requests/'),
  userFriends: (id) => api.get(`/accounts/users/${id}/friends/`),
  sendFriendRequest: (id) => api.post(`/accounts/users/${id}/friend-request/`),
  respondFriendRequest: (id, action) =>
    api.post(`/accounts/friend-requests/${id}/respond/`, { action }),
  removeFriend: (id) => api.delete(`/accounts/users/${id}/friend/`),
  searchUsers: (q) => api.get('/accounts/search/', { params: { q } }),
}

// === Subjects ===
export const subjectsApi = {
  list: (params) => api.get('/materials/subjects/', { params }),
  detail: (id) => api.get(`/materials/subjects/${id}/`),
  create: (payload) => api.post('/materials/subjects/', payload),
}

// === My taken subjects ===
export const mySubjectsApi = {
  list: () => api.get('/accounts/me/subjects/'),
  add: (subjectId, status = 'current', grade = '') =>
    api.post('/accounts/me/subjects/', { subject: subjectId, status, grade }),
  update: (id, patch) => api.patch(`/accounts/me/subjects/${id}/`, patch),
  remove: (id) => api.delete(`/accounts/me/subjects/${id}/`),
}

// === Materials ===
export const materialsApi = {
  list: () => api.get('/materials/'),
  upload: (formData) =>
    api.post('/materials/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  detail: (id) => api.get(`/materials/${id}/`),
  reExtract: (id) => api.post(`/materials/${id}/re-extract/`),
  delete: (id) => api.delete(`/materials/${id}/`),

  // Public catalog (databases page)
  publicList: (params) => api.get('/materials/databases/', { params }),
  byUser: (userId) => api.get(`/materials/databases/by-user/${userId}/`),

  // Engagement
  toggleLike: (id) => api.post(`/materials/${id}/like/`),
  toggleSave: (id) => api.post(`/materials/${id}/save/`),
  download: (id) => api.post(`/materials/${id}/download/`),
  saved: () => api.get('/materials/saved/'),
}

// === Quizzes ===
export const quizzesApi = {
  list: (params) => api.get('/quizzes/', { params }),
  mine: (params) => api.get('/quizzes/mine/', { params }),
  saved: (params) => api.get('/quizzes/saved/', { params }),
  detail: (id) => api.get(`/quizzes/${id}/`),
  create: (payload) => api.post('/quizzes/create/', payload),
  generate: (payload) => api.post('/quizzes/generate/', payload),
  update: (id, payload) => api.patch(`/quizzes/${id}/`, payload),
  delete: (id) => api.delete(`/quizzes/${id}/`),
  publish: (id) => api.post(`/quizzes/${id}/publish/`),
  toggleLike: (id) => api.post(`/quizzes/${id}/like/`),
  toggleSave: (id) => api.post(`/quizzes/${id}/save/`),
  play: (id) => api.get(`/quizzes/${id}/play/`),
  submit: (id, answers) => api.post(`/quizzes/${id}/submit/`, { answers }),
  myAttempts: () => api.get('/quizzes/attempts/'),
}

// === Moderation ===
export const moderationApi = {
  fileReport: (payload) => api.post('/moderation/reports/', payload),
  queue: (params) => api.get('/moderation/reports/queue/', { params }),
  detail: (id) => api.get(`/moderation/reports/${id}/`),
  action: (id, payload) => api.post(`/moderation/reports/${id}/action/`, payload),
}

// === Analytics ===
export const analyticsApi = {
  leaderboard: (params) => api.get('/analytics/leaderboard/', { params }),
  me: () => api.get('/analytics/me/'),
  quiz: (id) => api.get(`/analytics/quiz/${id}/`),
  platform: () => api.get('/analytics/platform/'),
}

// === Admin (users) ===
export const adminApi = {
  listUsers: (params) => api.get('/accounts/admin/users/', { params }),
  updateRole: (id, role) => api.patch(`/accounts/admin/users/${id}/role/`, { role }),
}
