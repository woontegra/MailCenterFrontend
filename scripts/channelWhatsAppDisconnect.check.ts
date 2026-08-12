/**
 * Narrow check: WhatsApp disconnect uses in-app confirm, not window.confirm.
 * Run: npx --yes tsx scripts/channelWhatsAppDisconnect.check.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(root, '../src/pages/ChannelWhatsAppSetup.tsx'), 'utf8')

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(!src.includes('window.confirm'), 'must not use window.confirm for disconnect')
assert(src.includes('disconnectTarget'), 'must track disconnectTarget for modal')
assert(src.includes('disconnectWhatsApp'), 'must call disconnectWhatsApp API')
assert(src.includes("addToast({ type: 'success'"), 'must toast success')
assert(src.includes("addToast({ type: 'error'"), 'must toast error')
assert(src.includes("'billing-usage'"), 'must invalidate billing-usage quota')
assert(src.includes('Evet, kaldır'), 'must have explicit confirm CTA')
assert(src.includes('role="dialog"'), 'must render accessible confirm dialog')

console.log('✓ channelWhatsAppDisconnect checks passed')
