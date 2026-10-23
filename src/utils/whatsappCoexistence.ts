export type CoexistenceSyncType = 'CONTACTS' | 'HISTORY'

export type CoexistenceSyncRow = {
  id: number
  syncType: CoexistenceSyncType
  status: 'REQUESTING' | 'REQUESTED' | 'UNCERTAIN' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'FAILED'
  requestId: string | null
  attempts: number
  progress: number | null
  lastPhase: number | null
  chunksReceived: number
  itemsReceived: number
  itemsImported: number
  itemsSkipped: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  requestedAt: string | null
  acceptedAt: string | null
  lastEventAt: string | null
  completedAt: string | null
}

export type CoexistenceStatusData = {
  connectionId: number
  coexistence: boolean
  connectionType: string | null
  status: 'CONNECTED' | 'DISCONNECTED' | null
  statusAt: string | null
  onboardedAt: string | null
  syncDeadline: string | null
  isOnBizApp: boolean | null
  platformType: string | null
  disconnection: {
    event?: string | null
    reason?: string | null
    reason_label?: string | null
    initiated_by?: string | null
    occurred_at?: string | null
  } | null
  eligibility: { ok: boolean; code?: string; message?: string }
  syncs: { contacts: CoexistenceSyncRow | null; history: CoexistenceSyncRow | null }
  serverTime: string
}

const DISCONNECT_REASON_LABELS: Record<string, string> = {
  ACCOUNT_DISCONNECTED: 'Hesap bağlantısı kesildi (yaptırım veya hesap silme)',
  BUSINESS_DOWNGRADE: 'Numara normal WhatsApp uygulamasına kaydedildi',
  CHANGE_NUMBER: 'İşletme telefon numarasını değiştirdi',
  COMPANION_INACTIVITY: 'Bağlı cihaz yaklaşık 30 gündür aktif değil',
  PRIMARY_INACTIVITY: 'Ana telefon yaklaşık 14 gündür aktif değil',
  USER_RE_REGISTERED: 'Numara başka bir cihazda yeniden kaydedildi',
}

export function disconnectReasonLabel(reason: string | null | undefined): string {
  const key = String(reason || '').toUpperCase()
  if (!key) return 'Neden bildirilmedi'
  return DISCONNECT_REASON_LABELS[key] || key
}

export function disconnectEventLabel(event: string | null | undefined): string {
  switch (String(event || '').toUpperCase()) {
    case 'PARTNER_REMOVED':
      return 'Bağlantı kaldırıldı'
    case 'ACCOUNT_OFFBOARDED':
      return 'Hesap Cloud API’den ayrıldı'
    default:
      return String(event || 'Bağlantı koptu')
  }
}

const SYNC_STATUS_LABELS: Record<CoexistenceSyncRow['status'], string> = {
  REQUESTING: 'İstek gönderiliyor',
  REQUESTED: 'Meta kabul etti, veri bekleniyor',
  UNCERTAIN: 'Meta yanıtı alınamadı',
  IN_PROGRESS: 'Veri alınıyor',
  COMPLETED: 'Tamamlandı',
  DECLINED: 'İşletme paylaşımı reddetti',
  FAILED: 'Meta isteği reddetti',
}

export function syncStatusLabel(row: CoexistenceSyncRow | null): string {
  if (!row) return 'Henüz istenmedi'
  return SYNC_STATUS_LABELS[row.status] || row.status
}

export function formatRemaining(deadlineIso: string | null, nowMs: number): string | null {
  if (!deadlineIso) return null
  const deadline = new Date(deadlineIso).getTime()
  if (Number.isNaN(deadline)) return null
  const diff = deadline - nowMs
  if (diff <= 0) return 'Süre doldu'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours} sa ${minutes} dk kaldı` : `${minutes} dk kaldı`
}

export type SyncActionState = {
  allowed: boolean
  needsConfirmRetry: boolean
  reason: string | null
}

/** Mirrors backend once-only rules; the backend remains the source of truth. */
export function syncActionState(
  status: Pick<CoexistenceStatusData, 'eligibility'>,
  row: CoexistenceSyncRow | null
): SyncActionState {
  if (!status.eligibility.ok) {
    return { allowed: false, needsConfirmRetry: false, reason: status.eligibility.message || null }
  }
  if (!row) return { allowed: true, needsConfirmRetry: false, reason: null }
  if (row.status === 'FAILED' && !row.requestId) {
    return { allowed: true, needsConfirmRetry: false, reason: null }
  }
  if (row.status === 'UNCERTAIN' && !row.requestId) {
    return {
      allowed: true,
      needsConfirmRetry: true,
      reason: 'Önceki istekte Meta yanıtı alınamadı; yalnızca veri gelmediyse yeniden deneyin.',
    }
  }
  return {
    allowed: false,
    needsConfirmRetry: false,
    reason: 'Bu eşitleme bu bağlantı için zaten istendi (Meta yalnızca bir kez izin verir).',
  }
}

export function isCoexistenceSyncActive(data: CoexistenceStatusData | null | undefined): boolean {
  if (!data) return false
  const rows = [data.syncs.contacts, data.syncs.history]
  return rows.some((r) => r && ['REQUESTING', 'REQUESTED', 'IN_PROGRESS', 'UNCERTAIN'].includes(r.status))
}

export function isMetaTestWhatsAppPhone(value: unknown): boolean {
  const digits = String(value || '').replace(/\D/g, '')
  return digits === '15551548955' || digits.endsWith('5551548955')
}
