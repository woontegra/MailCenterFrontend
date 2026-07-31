/** Digits-only WhatsApp display phone compare helpers (no secrets). */

export function whatsappPhoneDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

export function isMetaTestWhatsAppPhone(value: unknown): boolean {
  const d = whatsappPhoneDigits(value)
  return d === '15551548955' || d.endsWith('5551548955')
}

export function connectionPhone(c: any): string {
  const settings =
    c?.settings && typeof c.settings === 'object' && !Array.isArray(c.settings)
      ? c.settings
      : {}
  return String(
    c?.phone_number ||
      settings.business_phone_number ||
      settings.business_phone ||
      settings.display_phone_number ||
      ''
  ).trim()
}

export function connectionPhoneNumberId(c: any): string {
  const settings =
    c?.settings && typeof c.settings === 'object' && !Array.isArray(c.settings)
      ? c.settings
      : {}
  return String(c?.phone_number_id || settings.phone_number_id || '').trim()
}

/**
 * Prefer a single real ACTIVE sender when present.
 * If only Meta test / review senders exist, still pick one so App Review can send.
 */
export function pickDefaultWhatsAppConnection(channels: any[]): any | null {
  const list = Array.isArray(channels) ? channels : []
  if (list.length === 0) return null
  if (list.length === 1) return list[0]
  const withPnid = list.filter((c) => Boolean(connectionPhoneNumberId(c)))
  const pool = withPnid.length ? withPnid : list
  const real = pool.filter((c) => !isMetaTestWhatsAppPhone(connectionPhone(c)))
  if (real.length === 1) return real[0]
  if (real.length > 1) return null
  // No real sender — Meta Review / test-only brand: use first compose-ready channel
  return pool[0] || null
}
