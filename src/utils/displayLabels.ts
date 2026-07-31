/** User-facing Turkish labels. Backend/DB keep English enum codes. */

export const TENANT_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER'] as const
export type TenantRoleCode = (typeof TENANT_ROLES)[number]

export const TENANT_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  MANAGER: 'Müdür',
  AGENT: 'Personel',
  VIEWER: 'Görüntüleyici',
  MEMBER: 'Personel',
}

export const PLATFORM_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  USER: 'Kullanıcı',
  ADMIN: 'Yönetici',
  super_admin: 'Sistem Yöneticisi',
  user: 'Kullanıcı',
  admin: 'Yönetici',
}

export const INVITE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  ACCEPTED: 'Kabul edildi',
  REVOKED: 'İptal edildi',
  EXPIRED: 'Süresi doldu',
  CANCELLED: 'İptal edildi',
}

export function tenantRoleLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return TENANT_ROLE_LABELS[String(code).toUpperCase()] || String(code)
}

export function platformRoleLabel(code: string | null | undefined): string {
  if (!code) return 'Kullanıcı'
  const key = String(code)
  return PLATFORM_ROLE_LABELS[key] || PLATFORM_ROLE_LABELS[key.toUpperCase()] || 'Kullanıcı'
}

export function inviteStatusLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return INVITE_STATUS_LABELS[String(code).toUpperCase()] || String(code)
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Onay bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  PAUSED: 'Duraklatıldı',
  DISABLED: 'Kapalı',
}

export function approvalStatusLabel(code: string | null | undefined): string {
  if (!code) return 'Onay bekliyor'
  return APPROVAL_STATUS_LABELS[String(code).toUpperCase()] || String(code)
}

/** WhatsApp template send eligibility for template cards. */
export function whatsappTemplateSendabilityLabel(tpl: {
  is_active?: boolean | null
  is_draft?: boolean | null
  provider_approval_status?: string | null
  provider_template_name?: string | null
}): string {
  if (tpl.is_draft === true) return 'Gönderilemez'
  if (tpl.is_active === false) return 'Gönderilemez'
  const approval = String(tpl.provider_approval_status || '').toUpperCase()
  if (approval !== 'APPROVED') return 'Gönderilemez'
  if (!String(tpl.provider_template_name || '').trim()) return 'Gönderilemez'
  return 'Gönderilebilir'
}

export function mailCenterRecordStatusLabel(tpl: {
  is_active?: boolean | null
  is_draft?: boolean | null
}): string {
  if (tpl.is_draft === true) return 'Taslak'
  if (tpl.is_active === false) return 'Pasif'
  return 'Aktif'
}

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Pasif',
  INACTIVE: 'Pasif',
  TRIAL: 'Deneme',
}

export function companyStatusLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return COMPANY_STATUS_LABELS[String(code).toUpperCase()] || String(code)
}

/** Real companies only — hide smoke/test/review tenants from normal pickers. */
export function isRealCompany(tenant: {
  name?: string
  is_test_account?: boolean
  isTestAccount?: boolean
}): boolean {
  if (tenant.is_test_account === true || tenant.isTestAccount === true) return false
  const name = String(tenant.name || '').toLowerCase()
  if (/(^|[^a-z])smoke|meta\s*review|test\s*tenant|inceleme/.test(name)) return false
  return true
}

/** SUPER_ADMIN kullanıcı oluşturma picker: smoke gizle, Meta Review göster. */
export function isUserCreatePickerCompany(tenant: {
  name?: string
  is_test_account?: boolean
  isTestAccount?: boolean
}): boolean {
  const name = String(tenant.name || '').toLowerCase()
  if (/(^|[^a-z])smoke|test\s*tenant|fixture/.test(name)) return false
  if (/meta\s*review|meta\s*inceleme/.test(name)) return true
  if (tenant.is_test_account === true || tenant.isTestAccount === true) return false
  return true
}

export function isMetaReviewCompany(tenant: { name?: string }): boolean {
  return /meta\s*review|meta\s*inceleme/i.test(String(tenant.name || ''))
}
