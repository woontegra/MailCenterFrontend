import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, tenantName: string) =>
    api.post('/auth/register', { email, password, tenantName }),
  me: () => api.get('/auth/me'),
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

export const outboundApi = {
  list: () => api.get('/outbound-messages'),
  get: (id: number) => api.get(`/outbound-messages/${id}`),
  attempts: (id: number) => api.get(`/outbound-messages/${id}/attempts`),
  cancel: (id: number) => api.post(`/outbound-messages/${id}/cancel`),
  retry: (id: number) => api.post(`/outbound-messages/${id}/retry`),
}

export const draftApi = {
  list: () => api.get('/drafts'),
  get: (id: number) => api.get(`/drafts/${id}`),
  create: (data: any) => api.post('/drafts', data),
  update: (id: number, data: any) => api.patch(`/drafts/${id}`, data),
  remove: (id: number) => api.delete(`/drafts/${id}`),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
}

export const accountApi = {
  getAccounts: () => api.get('/accounts'),
  getAccount: (id: number) => api.get(`/accounts/${id}`),
  createAccount: (data: any) => api.post('/accounts', data),
  updateAccount: (id: number, data: any) => api.patch(`/accounts/${id}`, data),
  toggleAccount: (id: number) => api.patch(`/accounts/${id}/toggle`),
  testConnection: (data: any) => api.post('/accounts/test-connection', data),
  deleteAccount: (id: number) => api.delete(`/accounts/${id}`),
}

export const tagApi = {
  getTags: () => api.get('/tags'),
  createTag: (data: any) => api.post('/tags', data),
}

export const brandApi = {
  list: () => api.get('/brands'),
  create: (data: any) => api.post('/brands', data),
  update: (id: number, data: any) => api.patch(`/brands/${id}`, data),
  remove: (id: number) => api.delete(`/brands/${id}`),
}

export const deliverabilityApi = {
  get: (brandId: number) => api.get(`/brands/${brandId}/deliverability`),
  check: (brandId: number, data?: any) =>
    api.post(`/brands/${brandId}/deliverability/check`, data || {}),
  updateSettings: (brandId: number, data: any) =>
    api.patch(`/brands/${brandId}/deliverability/settings`, data),
}

export const channelConnectionApi = {
  list: (params?: any) => api.get('/channel-connections', { params }),
  create: (data: any) => api.post('/channel-connections', data),
  update: (id: number, data: any) => api.patch(`/channel-connections/${id}`, data),
  remove: (id: number) => api.delete(`/channel-connections/${id}`),
  test: (id: number) => api.post(`/channel-connections/${id}/test`),
  metaSetupStatus: () => api.get('/channel-connections/whatsapp/meta-setup-status'),
  completeEmbeddedSignup: (data: {
    brandId: number
    authorizationCode: string
    sessionInfo?: Record<string, unknown> | null
    onboardingMode?: 'WHATSAPP_BUSINESS_APP_ONBOARDING' | 'STANDARD'
  }) => api.post('/channel-connections/whatsapp/embedded-signup/complete', data),
  syncWhatsAppTemplates: (id: number) =>
    api.post(`/channel-connections/${id}/whatsapp/sync-templates`),
  verifyWhatsApp: (id: number) => api.post(`/channel-connections/${id}/whatsapp/verify`),
  disconnectWhatsApp: (id: number) =>
    api.post(`/channel-connections/${id}/whatsapp/disconnect`),
  testWhatsAppTemplate: (
    id: number,
    data: { to: string; templateName: string; language?: string; components?: unknown[] }
  ) => api.post(`/channel-connections/${id}/whatsapp/test-template`, data),
}

export const smsApi = {
  send: (data: any) => api.post('/send-sms', data),
  preview: (data: any) => api.post('/sms/preview', data),
}

export const whatsappApi = {
  send: (data: any) => api.post('/send-whatsapp', data),
  preview: (data: any) => api.post('/whatsapp/preview', data),
}

export const whatsappInboxApi = {
  list: (params?: any) => api.get('/inbox/whatsapp', { params }),
  get: (id: number) => api.get(`/inbox/whatsapp/${id}`),
}

export const conversationsApi = {
  list: (params?: any) => api.get('/conversations', { params }),
  get: (id: number) => api.get(`/conversations/${id}`),
  messages: (id: number) => api.get(`/conversations/${id}/messages`),
  setStatus: (id: number, data: any) => api.patch(`/conversations/${id}/status`, data),
  setPriority: (id: number, data: any) => api.patch(`/conversations/${id}/priority`, data),
  setAssignment: (id: number, data: any) =>
    api.patch(`/conversations/${id}/assignment`, data),
  setContact: (id: number, data: any) => api.patch(`/conversations/${id}/contact`, data),
  addNote: (id: number, data: any) => api.post(`/conversations/${id}/notes`, data),
  notes: (id: number) => api.get(`/conversations/${id}/notes`),
  markRead: (id: number) => api.post(`/conversations/${id}/mark-read`),
  archive: (id: number) => api.post(`/conversations/${id}/archive`),
}

export const teamApi = {
  list: () => api.get('/team'),
  get: (userId: number) => api.get(`/team/${userId}`),
  setRole: (userId: number, data: any) => api.patch(`/team/${userId}/role`, data),
  setPermissions: (userId: number, data: any) =>
    api.patch(`/team/${userId}/permissions`, data),
  setStatus: (userId: number, data: any) => api.patch(`/team/${userId}/status`, data),
  remove: (userId: number) => api.delete(`/team/${userId}`),
  listInvites: () => api.get('/team/invites'),
  createInvite: (data: any) => api.post('/team/invites', data),
  resendInvite: (id: number) => api.post(`/team/invites/${id}/resend`),
  revokeInvite: (id: number) => api.delete(`/team/invites/${id}`),
}

export const invitesApi = {
  validate: (token: string) => api.get(`/invites/validate/${token}`),
  accept: (data: any) => api.post('/invites/accept', data),
}

export const billingApi = {
  subscription: () => api.get('/billing/subscription'),
  usage: () => api.get('/billing/usage'),
}

export const automationApi = {
  list: (params?: any) => api.get('/automation', { params }),
  get: (id: number) => api.get(`/automation/${id}`),
  create: (data: any) => api.post('/automation', data),
  update: (id: number, data: any) => api.patch(`/automation/${id}`, data),
  archive: (id: number) => api.delete(`/automation/${id}`),
  activate: (id: number) => api.post(`/automation/${id}/activate`),
  pause: (id: number) => api.post(`/automation/${id}/pause`),
  duplicate: (id: number) => api.post(`/automation/${id}/duplicate`),
  test: (id: number, data: any) => api.post(`/automation/${id}/test`, data),
  manualRun: (id: number, data: any) => api.post(`/automation/${id}/manual-run`, data),
  executions: (id: number) => api.get(`/automation/${id}/executions`),
  execution: (executionId: number) => api.get(`/automation/executions/${executionId}`),
}

export const platformAdminApi = {
  overview: () => api.get('/platform-admin/overview'),
  tenants: (params?: any) => api.get('/platform-admin/tenants', { params }),
  tenant: (id: number) => api.get(`/platform-admin/tenants/${id}`),
  setTenantStatus: (id: number, data: any) =>
    api.patch(`/platform-admin/tenants/${id}/status`, data),
  setTenantPlan: (id: number, data: any) =>
    api.patch(`/platform-admin/tenants/${id}/plan`, data),
  setTenantLimits: (id: number, data: any) =>
    api.patch(`/platform-admin/tenants/${id}/limits`, data),
  tenantUsage: (id: number) => api.get(`/platform-admin/tenants/${id}/usage`),
  plans: () => api.get('/platform-admin/plans'),
  createPlan: (data: any) => api.post('/platform-admin/plans', data),
  updatePlan: (id: number, data: any) => api.patch(`/platform-admin/plans/${id}`, data),
  activity: (params?: any) => api.get('/platform-admin/activity', { params }),
}

export const senderIdentityApi = {
  list: (params?: any) => api.get('/sender-identities', { params }),
  create: (data: any) => api.post('/sender-identities', data),
  update: (id: number, data: any) => api.patch(`/sender-identities/${id}`, data),
  remove: (id: number) => api.delete(`/sender-identities/${id}`),
}

export const templateApi = {
  list: (params?: any) => api.get('/templates', { params }),
  get: (id: number) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: number, data: any) => api.patch(`/templates/${id}`, data),
  remove: (id: number) => api.delete(`/templates/${id}`),
  duplicate: (id: number) => api.post(`/templates/${id}/duplicate`),
  compile: (data: any) => api.post('/templates/compile', data),
  render: (data: any) => api.post('/templates/render', data),
}

export const templateMediaApi = {
  upload: (file: File, brandId?: number) => {
    const form = new FormData()
    form.append('file', file)
    if (brandId != null && Number.isFinite(brandId)) {
      form.append('brand_id', String(brandId))
    }
    return api.post('/templates/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const campaignApi = {
  list: (params?: any) => api.get('/campaigns', { params }),
  get: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: number, data: any) => api.patch(`/campaigns/${id}`, data),
  duplicate: (id: number) => api.post(`/campaigns/${id}/duplicate`),
  previewAudience: (data: any) => api.post('/campaigns/preview-audience', data),
  validate: (id: number) => api.post(`/campaigns/${id}/validate`),
  testSend: (id: number, data: any) => api.post(`/campaigns/${id}/test-send`, data),
  launch: (id: number, data: any) => api.post(`/campaigns/${id}/launch`, data),
  pause: (id: number) => api.post(`/campaigns/${id}/pause`),
  resume: (id: number) => api.post(`/campaigns/${id}/resume`),
  cancel: (id: number) => api.post(`/campaigns/${id}/cancel`),
  recipients: (id: number, params?: any) => api.get(`/campaigns/${id}/recipients`, { params }),
  previewImport: (id: number, formData: FormData) =>
    api.post(`/campaigns/${id}/imports/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  applyImport: (id: number, importId: number, data: any) =>
    api.post(`/campaigns/${id}/imports/${importId}/apply`, data),
}

export const segmentApi = {
  list: () => api.get('/segments'),
  get: (id: number) => api.get(`/segments/${id}`),
  create: (data: any) => api.post('/segments', data),
  update: (id: number, data: any) => api.patch(`/segments/${id}`, data),
  duplicate: (id: number) => api.post(`/segments/${id}/duplicate`),
  preview: (id: number) => api.post(`/segments/${id}/preview`),
  remove: (id: number) => api.delete(`/segments/${id}`),
}

export const suppressionApi = {
  list: (params?: any) => api.get('/suppressions', { params }),
  create: (data: any) => api.post('/suppressions', data),
  remove: (id: number) => api.delete(`/suppressions/${id}`),
}

export const contactApi = {
  list: (params?: any) => api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: number, data: any) => api.patch(`/contacts/${id}`, data),
  remove: (id: number) => api.delete(`/contacts/${id}`),
  addPoint: (id: number, data: any) => api.post(`/contacts/${id}/contact-points`, data),
  updatePoint: (id: number, pointId: number, data: any) =>
    api.patch(`/contacts/${id}/contact-points/${pointId}`, data),
  removePoint: (id: number, pointId: number) =>
    api.delete(`/contacts/${id}/contact-points/${pointId}`),
  linkBrand: (id: number, brandId: number) =>
    api.post(`/contacts/${id}/brands`, { brand_id: brandId }),
  unlinkBrand: (id: number, brandId: number) =>
    api.delete(`/contacts/${id}/brands/${brandId}`),
  preferences: (id: number) => api.get(`/contacts/${id}/preferences`),
  updatePreferences: (id: number, data: any) =>
    api.patch(`/contacts/${id}/preferences`, data),
  timeline: (id: number) => api.get(`/contacts/${id}/timeline`),
}
