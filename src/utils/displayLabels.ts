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
  PENDING: 'Meta onayı bekleniyor',
  APPROVED: 'Onaylandı · Gönderilebilir',
  REJECTED: 'Reddedildi',
  PAUSED: 'Geçici olarak durduruldu',
  DISABLED: 'Kapalı',
  UNKNOWN: 'Durum güncelleniyor',
}

/** Longer user-facing explanations for WhatsApp template approval states. */
export const APPROVAL_STATUS_HELP: Record<string, string> = {
  PENDING: 'Meta onayı bekleniyor. Onaylanana kadar gönderilemez.',
  APPROVED: 'Gönderilebilir.',
  REJECTED: 'Meta tarafından reddedildi. Nedeni görüntüleyip düzenleyebilirsiniz.',
  PAUSED: 'Geçici olarak durduruldu.',
  UNKNOWN: 'Durum henüz Meta’dan alınamadı. Durumu yenileyin.',
  DISABLED: 'Kapalı.',
}

export function approvalStatusLabel(code: string | null | undefined): string {
  if (!code) return APPROVAL_STATUS_LABELS.PENDING
  return APPROVAL_STATUS_LABELS[String(code).toUpperCase()] || String(code)
}

export function approvalStatusHelp(code: string | null | undefined): string {
  if (!code) return APPROVAL_STATUS_HELP.PENDING
  return (
    APPROVAL_STATUS_HELP[String(code).toUpperCase()] ||
    approvalStatusLabel(code)
  )
}

function parseTemplateComponents(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return {}
}

function isQualityScorePending(approval: string, components: unknown): boolean {
  if (String(approval).toUpperCase() !== 'APPROVED') return false
  const obj = parseTemplateComponents(components)
  const qs = obj.quality_score as { score?: string; status?: string } | null | undefined
  if (!qs || typeof qs !== 'object') return true
  const score = String(qs.score || '').toUpperCase()
  const status = String(qs.status || '').toUpperCase()
  if (status === 'PENDING') return true
  if (!score || score === 'UNKNOWN') return true
  return false
}

/** WhatsApp template card label/help — separates Meta approval from quality score. */
export function whatsappTemplateStatusDisplay(tpl: {
  provider_approval_status?: string | null
  provider_template_components?: unknown
  provider_rejection_reason?: string | null
}): { label: string; help: string; canSend: boolean; qualityPending: boolean } {
  const approval = String(tpl.provider_approval_status || 'UNKNOWN').toUpperCase()
  const qualityPending = isQualityScorePending(approval, tpl.provider_template_components)

  if (approval === 'APPROVED') {
    return {
      label: 'Onaylandı · Gönderilebilir',
      help: qualityPending ? 'Kalite puanı henüz oluşmadı.' : 'Gönderilebilir.',
      canSend: true,
      qualityPending,
    }
  }
  if (approval === 'PENDING') {
    return {
      label: 'Meta onayı bekleniyor',
      help: 'Onaylanana kadar gönderilemez.',
      canSend: false,
      qualityPending: false,
    }
  }
  if (approval === 'REJECTED') {
    const reason = String(tpl.provider_rejection_reason || '').trim()
    return {
      label: 'Reddedildi',
      help: reason || APPROVAL_STATUS_HELP.REJECTED,
      canSend: false,
      qualityPending: false,
    }
  }
  if (approval === 'PAUSED') {
    return {
      label: approvalStatusLabel(approval),
      help: APPROVAL_STATUS_HELP.PAUSED,
      canSend: false,
      qualityPending: false,
    }
  }
  return {
    label: approvalStatusLabel(approval),
    help: APPROVAL_STATUS_HELP.UNKNOWN,
    canSend: false,
    qualityPending: false,
  }
}

/** WhatsApp template send eligibility for template cards. */
export function whatsappTemplateSendabilityLabel(tpl: {
  is_active?: boolean | null
  is_draft?: boolean | null
  provider_approval_status?: string | null
  provider_template_name?: string | null
  provider_template_components?: unknown
}): string {
  return whatsappTemplateStatusDisplay(tpl).canSend ? 'Gönderilebilir' : 'Gönderilemez'
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
