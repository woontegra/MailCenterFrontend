/**
 * Self-test for WhatsApp coexistence reconnect / sync UI helpers.
 * Run: npx --yes tsx scripts/whatsappCoexistence.check.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  disconnectEventLabel,
  disconnectReasonLabel,
  formatRemaining,
  isCoexistenceSyncActive,
  isMetaTestWhatsAppPhone,
  syncActionState,
  syncStatusLabel,
  type CoexistenceStatusData,
  type CoexistenceSyncRow,
} from '../src/utils/whatsappCoexistence'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

function row(partial: Partial<CoexistenceSyncRow>): CoexistenceSyncRow {
  return {
    id: 1,
    syncType: 'CONTACTS',
    status: 'REQUESTED',
    requestId: null,
    attempts: 1,
    progress: null,
    lastPhase: null,
    chunksReceived: 0,
    itemsReceived: 0,
    itemsImported: 0,
    itemsSkipped: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
    requestedAt: null,
    acceptedAt: null,
    lastEventAt: null,
    completedAt: null,
    ...partial,
  }
}

function main() {
  assert(disconnectReasonLabel('primary_inactivity').includes('14 gün'), 'reason label case-insensitive')
  assert(disconnectReasonLabel('SOMETHING_NEW') === 'SOMETHING_NEW', 'unknown reason passthrough')
  assert(disconnectReasonLabel(null) === 'Neden bildirilmedi', 'empty reason')
  assert(disconnectEventLabel('PARTNER_REMOVED') === 'Bağlantı kaldırıldı', 'event label')

  assert(syncStatusLabel(null) === 'Henüz istenmedi', 'no row label')
  assert(syncStatusLabel(row({ status: 'DECLINED' })).includes('reddetti'), 'declined label')

  const now = Date.parse('2026-10-22T10:00:00Z')
  assert(formatRemaining('2026-10-22T12:30:00Z', now) === '2 sa 30 dk kaldı', 'remaining hours')
  assert(formatRemaining('2026-10-22T10:05:00Z', now) === '5 dk kaldı', 'remaining minutes')
  assert(formatRemaining('2026-10-22T09:00:00Z', now) === 'Süre doldu', 'expired')
  assert(formatRemaining('bad', now) === null, 'invalid deadline')

  const ok = { eligibility: { ok: true } }
  const blocked = { eligibility: { ok: false, code: 'WINDOW_EXPIRED', message: '24 saat doldu' } }
  assert(!syncActionState(blocked, null).allowed, 'ineligible blocks')
  assert(syncActionState(blocked, null).reason === '24 saat doldu', 'ineligible reason')
  assert(syncActionState(ok, null).allowed, 'first request allowed')
  assert(!syncActionState(ok, row({ status: 'REQUESTED', requestId: 'r1' })).allowed, 'requested is once-only')
  assert(!syncActionState(ok, row({ status: 'COMPLETED', requestId: 'r1' })).allowed, 'completed is once-only')
  assert(!syncActionState(ok, row({ status: 'FAILED', requestId: 'r1' })).allowed, 'accepted then failed stays blocked')
  assert(syncActionState(ok, row({ status: 'FAILED' })).allowed, 'rejected request may retry')
  const uncertain = syncActionState(ok, row({ status: 'UNCERTAIN' }))
  assert(uncertain.allowed && uncertain.needsConfirmRetry, 'uncertain needs explicit confirm')

  const status = {
    syncs: { contacts: row({ status: 'COMPLETED' }), history: row({ syncType: 'HISTORY', status: 'IN_PROGRESS' }) },
  } as CoexistenceStatusData
  assert(isCoexistenceSyncActive(status), 'in-progress history keeps polling')
  status.syncs.history = row({ syncType: 'HISTORY', status: 'COMPLETED' })
  assert(!isCoexistenceSyncActive(status), 'all done stops polling')
  assert(!isCoexistenceSyncActive(null), 'null status')

  assert(isMetaTestWhatsAppPhone('+1 555-154-8955'), 'meta test number')
  assert(!isMetaTestWhatsAppPhone('+90 532 000 00 00'), 'real number is not test')

  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
  const page = readFileSync(join(root, 'pages', 'ChannelWhatsAppSetup.tsx'), 'utf8')
  assert(!/905323171755|532 317 17 55/.test(page), 'setup page has no hardcoded business number')
  assert(!/preferredPhone\b/.test(page), 'setup page no longer sends preferredPhone')
  assert(page.includes('connectionId: reconnectConnectionId'), 'reconnect sends target connection id')
  const panel = readFileSync(join(root, 'components', 'whatsapp', 'CoexistenceSyncPanel.tsx'), 'utf8')
  assert(!panel.includes('window.confirm'), 'sync panel uses in-app confirm')
  const api = readFileSync(join(root, 'services', 'api.ts'), 'utf8')
  assert(!/preferredPhone\b/.test(api), 'api type no longer has preferredPhone')

  console.log('whatsappCoexistence.check PASS')
}

main()
