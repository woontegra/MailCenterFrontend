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
 * Prefer a single real ACTIVE sender; never stick to Meta test line when a real number exists.
 */
export function pickDefaultWhatsAppConnection(channels: any[]): any | null {
  const list = Array.isArray(channels) ? channels : []
  if (list.length === 0) return null
  if (list.length === 1) return list[0]
  const real = list.filter((c) => {
    const phone = connectionPhone(c)
    const pnid = connectionPhoneNumberId(c)
    if (!pnid) return false
    return !isMetaTestWhatsAppPhone(phone)
  })
  if (real.length === 1) return real[0]
  if (real.length > 1) return null
  return null
}
