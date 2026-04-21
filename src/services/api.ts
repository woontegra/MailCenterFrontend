import axios from 'axios'
// import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// TODO: Auth token interceptor - veritabanı hazır olunca açılacak
// api.interceptors.request.use((config) => {
//   const token = useAuthStore.getState().token
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       useAuthStore.getState().logout()
//       window.location.href = '/login'
//     }
//     return Promise.reject(error)
//   }
// )

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, tenantName: string) =>
    api.post('/auth/register', { email, password, tenantName }),
}

export const mailApi = {
  getMails: (params?: any) => api.get('/mails', { params }),
  updateRead: (id: number, is_read: boolean) =>
    api.patch(`/mails/${id}/read`, { is_read }),
  updateStar: (id: number, is_starred: boolean) =>
    api.patch(`/mails/${id}/star`, { is_starred }),
  deleteMail: (id: number) => api.delete(`/mails/${id}`),
  sendMail: (data: any) => api.post('/send-mail', data),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
}

export const accountApi = {
  getAccounts: () => api.get('/accounts'),
  createAccount: (data: any) => api.post('/accounts', data),
  deleteAccount: (id: number) => api.delete(`/accounts/${id}`),
}

export const tagApi = {
  getTags: () => api.get('/tags'),
  createTag: (data: any) => api.post('/tags', data),
}
