/**
 * Pure helpers for Meta WhatsApp Embedded Signup (v4-compatible).
 * Safe to unit-test without the Facebook SDK.
 */

export type EmbeddedSignupMode =
  | 'WHATSAPP_BUSINESS_APP_ONBOARDING'
  | 'STANDARD'

export const META_EMBEDDED_SIGNUP_TRUSTED_ORIGINS = [
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://facebook.com',
  'https://business.facebook.com',
] as const

const FINISH_EVENTS = new Set([
  'FINISH',
  'FINISH_ONLY_WABA',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
])

export function isTrustedMetaOrigin(origin: string): boolean {
  const o = String(origin || '').trim().toLowerCase()
  if (!o) return false
  return META_EMBEDDED_SIGNUP_TRUSTED_ORIGINS.some(
    (trusted) => o === trusted || o.endsWith('.facebook.com')
  )
}

export function buildEmbeddedSignupLoginOptions(input: {
  configId: string
  mode: EmbeddedSignupMode
  existingSetup?: Record<string, unknown>
}): Record<string, unknown> {
  const setup =
    input.existingSetup && typeof input.existingSetup === 'object'
      ? { ...input.existingSetup }
      : {}

  const extras: Record<string, unknown> = {
    setup,
    sessionInfoVersion: '3',
  }

  // Only coexistence / WhatsApp Business app onboarding sets featureType.
  // Standard new-number Cloud API flow must NOT send this flag.
  if (input.mode === 'WHATSAPP_BUSINESS_APP_ONBOARDING') {
    extras.featureType = 'whatsapp_business_app_onboarding'
  }

  return {
    config_id: input.configId,
    response_type: 'code',
    override_default_response_type: true,
    extras,
  }
}

export type ParsedWaEmbeddedSignupEvent = {
  type: 'WA_EMBEDDED_SIGNUP'
  event: string
  version?: number | string
  data: Record<string, unknown>
  wabaId: string | null
  phoneNumberId: string | null
  businessId: string | null
  isFinish: boolean
  isCancel: boolean
  isError: boolean
  raw: Record<string, unknown>
}

export function parseWaEmbeddedSignupMessage(
  rawData: unknown
): ParsedWaEmbeddedSignupEvent | null {
  let parsed: any = rawData
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object') return null
  if (parsed.type !== 'WA_EMBEDDED_SIGNUP') return null

  const event = String(parsed.event || '').toUpperCase()
  const data =
    parsed.data && typeof parsed.data === 'object'
      ? (parsed.data as Record<string, unknown>)
      : {}

  const wabaId =
    String(data.waba_id || data.wabaId || parsed.waba_id || '').trim() || null
  const phoneNumberId =
    String(
      data.phone_number_id || data.phoneNumberId || parsed.phone_number_id || ''
    ).trim() || null
  const businessId =
    String(data.business_id || data.businessId || parsed.business_id || '').trim() ||
    null

  return {
    type: 'WA_EMBEDDED_SIGNUP',
    event,
    version: parsed.version,
    data,
    wabaId,
    phoneNumberId,
    businessId,
    isFinish: FINISH_EVENTS.has(event),
    isCancel: event === 'CANCEL',
    isError: event === 'ERROR',
    raw: parsed as Record<string, unknown>,
  }
}

/** Redact secrets before any diagnostic logging. */
export function redactSignupDiagnostics(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'string') {
    return value
      .replace(/EAA[A-Za-z0-9]+/g, '[redacted]')
      .replace(/code=[^&\s]+/gi, 'code=[redacted]')
  }
  if (Array.isArray(value)) return value.map(redactSignupDiagnostics)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase()
      if (
        key.includes('token') ||
        key.includes('code') ||
        key.includes('secret') ||
        key === 'authorizationcode' ||
        key === 'authresponse'
      ) {
        out[k] = '[redacted]'
      } else {
        out[k] = redactSignupDiagnostics(v)
      }
    }
    return out
  }
  return value
}

/** Meta FB.login rejects AsyncFunction callbacks. */
export function isAsyncFunction(fn: unknown): boolean {
  return typeof fn === 'function' && fn.constructor?.name === 'AsyncFunction'
}

/**
 * Wrap an async handler in a *synchronous* FB.login callback.
 * Facebook JS SDK throws: "Expression is of type asyncfunction, not function"
 * if an async function is passed directly to FB.login.
 */
export function createSyncFbLoginCallback(
  handler: (response: unknown) => void | Promise<void>
): (response: unknown) => void {
  if (typeof handler !== 'function') {
    throw new Error('FB.login handler must be a function')
  }
  const callback = function fbLoginCallback(response: unknown) {
    void Promise.resolve(handler(response)).catch(() => {
      /* caller must handle errors inside handler */
    })
  }
  if (isAsyncFunction(callback)) {
    throw new Error('FB.login callback must not be an AsyncFunction')
  }
  return callback
}

/** Overall Embedded Signup wall-clock timeout (avoid indefinite spinner). */
export const EMBEDDED_SIGNUP_TIMEOUT_MS = 5 * 60 * 1000

export const EMBEDDED_SIGNUP_TIMEOUT_MESSAGE =
  'Meta bağlantısı tamamlanamadı. Lütfen tekrar deneyin.'

