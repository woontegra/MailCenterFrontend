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
    preferredPhone?: string
  }) => api.post('/channel-connections/whatsapp/embedded-signup/complete', data),
  syncWhatsAppTemplates: (id: number, brandId?: number) =>
    api.post(`/channel-connections/${id}/whatsapp/sync-templates`, brandId ? { brand_id: brandId } : {}),
  ensureWhatsAppSender: (id: number, data?: { brand_id?: number }) =>
    api.post(`/channel-connections/${id}/ensure-whatsapp-sender`, data || {}),
  listShareableWhatsAppLines: (brandId: number) =>
    api.get('/channel-connections/whatsapp/shareable-lines', { params: { brand_id: brandId } }),
  shareWhatsAppWithBrand: (connectionId: number, brandId: number) =>
    api.post(`/channel-connections/${connectionId}/share-with-brand`, { brand_id: brandId }),
  unshareWhatsAppFromBrand: (connectionId: number, brandId: number) =>
    api.delete(`/channel-connections/${connectionId}/share-with-brand/${brandId}`),
  setWhatsAppDefaultSender: (id: number) =>
    api.post(`/channel-connections/${id}/whatsapp/set-default-sender`),
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

/** Platform SUPER_ADMIN panel (/api/admin-platform) — same session as MailCenter login */
export const adminPlatformApi = {
  overview: () => api.get('/admin-platform/overview'),
  controlCenter: () => api.get('/admin-platform/control-center'),
  tenants: (params?: any) => api.get('/admin-platform/tenants', { params }),
  tenant: (id: number) => api.get(`/admin-platform/tenants/${id}`),
  createTenant: (data: any) => api.post('/admin-platform/tenants', data),
  createFirm: (data: any) => api.post('/admin-platform/firms', data),
  setTenantStatus: (id: number, data: { active: boolean }) =>
    api.patch(`/admin-platform/tenants/${id}/status`, data),
  updateTenant: (id: number, data: any) => api.patch(`/admin-platform/tenants/${id}`, data),
  users: (params?: any) => api.get('/admin-platform/users', { params }),
  createUser: (data: any) => api.post('/admin-platform/users', data),
  setUserStatus: (id: number, data: { active: boolean }) =>
    api.patch(`/admin-platform/users/${id}/status`, data),
  setUserRole: (id: number, data: { tenantRole: string }) =>
    api.patch(`/admin-platform/users/${id}/role`, data),
  resetPassword: (id: number, data: { temporaryPassword: string }) =>
    api.post(`/admin-platform/users/${id}/reset-password`, data),
  revokeUserSessions: (id: number) => api.post(`/admin-platform/users/${id}/revoke-sessions`),
  createReviewAccount: (data: any) => api.post('/admin-platform/review-accounts', data),
  createAccount: (data: any) => api.post('/admin-platform/accounts', data),
  plans: () => api.get('/admin-platform/plans'),
  audit: (params?: any) => api.get('/admin-platform/audit', { params }),
  subscriptions: (params?: any) => api.get('/admin-platform/subscriptions', { params }),
  updateSubscription: (id: number, data: any) =>
    api.patch(`/admin-platform/subscriptions/${id}`, data),
  licenses: () => api.get('/admin-platform/licenses'),
  createLicense: (data: any) => api.post('/admin-platform/licenses', data),
  updateLicense: (id: number, data: any) => api.patch(`/admin-platform/licenses/${id}`, data),
  licenseEvents: (id: number) => api.get(`/admin-platform/licenses/${id}/events`),
  supportTickets: (params?: any) => api.get('/admin-platform/support-tickets', { params }),
  createSupportTicket: (data: any) => api.post('/admin-platform/support-tickets', data),
  updateSupportTicket: (id: number, data: any) =>
    api.patch(`/admin-platform/support-tickets/${id}`, data),
  supportMessages: (id: number) => api.get(`/admin-platform/support-tickets/${id}/messages`),
  liveChat: () => api.get('/admin-platform/live-chat'),
  sendStats: () => api.get('/admin-platform/send-stats'),
  systemHealth: () => api.get('/admin-platform/system-health'),
  queues: () => api.get('/admin-platform/queues'),
  logs: (params?: any) => api.get('/admin-platform/logs', { params }),
  devices: (params?: any) => api.get('/admin-platform/devices', { params }),
  revokeDevice: (id: number) => api.post(`/admin-platform/devices/${id}/revoke`),
  demoAccounts: () => api.get('/admin-platform/demo-accounts'),
  meta: () => api.get('/admin-platform/meta'),
  security: () => api.get('/admin-platform/security'),
  brandsOverview: () => api.get('/admin-platform/brands-overview'),
  mailAccountsOverview: () => api.get('/admin-platform/mail-accounts-overview'),
  channelsOverview: () => api.get('/admin-platform/channels-overview'),
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
  listLibrary: (params?: {
    brand_id?: number
    channel_connection_id?: number
  }) => api.get('/templates/library', { params }),
  submitLibraryTemplate: (
    key: string,
    data: {
      brand_id: number
      channelConnectionId: number
      bodyText?: string
      examples?: string[]
    }
  ) => api.post(`/templates/library/${encodeURIComponent(key)}/submit`, data),
  refreshLibraryTemplate: (
    key: string,
    data: { brand_id: number; channelConnectionId: number }
  ) => api.post(`/templates/library/${encodeURIComponent(key)}/refresh`, data),
  syncLibraryTemplates: (data: { channelConnectionId: number }) =>
    api.post('/templates/library/sync', data),
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

export const whatsappCampaignApi = {
  sampleCsv: () => api.get('/whatsapp/campaigns/sample-csv', { responseType: 'blob' }),
  list: (params?: any) => api.get('/whatsapp/campaigns', { params }),
  get: (id: number) => api.get(`/whatsapp/campaigns/${id}`),
  recipients: (id: number, params?: any) =>
    api.get(`/whatsapp/campaigns/${id}/recipients`, { params }),
  previewRecipients: (data: any) => api.post('/whatsapp/campaigns/preview-recipients', data),
  previewImport: (formData: FormData) =>
    api.post('/whatsapp/campaigns/preview-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  launch: (data: any) => api.post('/whatsapp/campaigns/launch', data),
  pause: (id: number) => api.post(`/whatsapp/campaigns/${id}/pause`),
  resume: (id: number) => api.post(`/whatsapp/campaigns/${id}/resume`),
  cancel: (id: number) => api.post(`/whatsapp/campaigns/${id}/cancel`),
  exportResults: (id: number) =>
    api.get(`/whatsapp/campaigns/${id}/export`, { responseType: 'blob' }),
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
  analyticsSummary: (id: number) => api.get(`/campaigns/${id}/analytics/summary`),
  analyticsRecipients: (id: number, params?: any) =>
    api.get(`/campaigns/${id}/analytics/recipients`, { params }),
  analyticsTimeline: (id: number, recipientId: number) =>
    api.get(`/campaigns/${id}/analytics/recipients/${recipientId}/timeline`),
  analyticsLinks: (id: number) => api.get(`/campaigns/${id}/analytics/links`),
  analyticsDownloads: (id: number) => api.get(`/campaigns/${id}/analytics/downloads`),
  saveAnalyticsList: (id: number, data: any) => api.post(`/campaigns/${id}/analytics/save-list`, data),
  exportAnalyticsSummary: (id: number) =>
    api.get(`/campaigns/${id}/analytics/export/summary`, { responseType: 'blob' }),
  exportAnalyticsRecipients: (id: number, filter?: string) =>
    api.get(`/campaigns/${id}/analytics/export/recipients`, {
      params: filter ? { filter } : undefined,
      responseType: 'blob',
    }),
  exportAnalyticsLinks: (id: number) =>
    api.get(`/campaigns/${id}/analytics/export/links`, { responseType: 'blob' }),
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

export const contactListApi = {
  list: (params?: any) => api.get('/contact-lists', { params }),
  get: (id: number) => api.get(`/contact-lists/${id}`),
  create: (data: any) => api.post('/contact-lists', data),
  update: (id: number, data: any) => api.patch(`/contact-lists/${id}`, data),
  remove: (id: number) => api.delete(`/contact-lists/${id}`),
  members: (id: number, params?: any) => api.get(`/contact-lists/${id}/members`, { params }),
  addMembers: (id: number, data: any) => api.post(`/contact-lists/${id}/members`, data),
  removeMember: (listId: number, contactId: number) =>
    api.delete(`/contact-lists/${listId}/members/${contactId}`),
  exportList: (id: number, format: 'xlsx' | 'csv' = 'xlsx') =>
    api.get(`/contact-lists/${id}/export`, { params: { format }, responseType: 'blob' }),
  sampleCsv: () => api.get('/contact-lists/sample-csv', { responseType: 'blob' }),
  sampleXlsx: () => api.get('/contact-lists/sample-xlsx', { responseType: 'blob' }),
  previewImport: (id: number, formData: FormData) =>
    api.post(`/contact-lists/${id}/imports/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  applyImport: (listId: number, importId: number) =>
    api.post(`/contact-lists/${listId}/imports/${importId}/apply`),
  exportImportResults: (listId: number, importId: number) =>
    api.get(`/contact-lists/${listId}/imports/${importId}/export`, { responseType: 'blob' }),
  previewEmailAudience: (data: any) => api.post('/contact-lists/preview-audience', data),
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
