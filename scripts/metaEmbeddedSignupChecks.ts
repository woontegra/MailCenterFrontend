/**
 * Self-test for Meta Embedded Signup client helpers.
 * Run: npx --yes tsx scripts/metaEmbeddedSignupChecks.ts
 */
import {
  buildEmbeddedSignupLoginOptions,
  isTrustedMetaOrigin,
  parseWaEmbeddedSignupMessage,
  redactSignupDiagnostics,
} from '../src/utils/metaEmbeddedSignup'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

function main() {
  const coexistence = buildEmbeddedSignupLoginOptions({
    configId: 'CFG123',
    mode: 'WHATSAPP_BUSINESS_APP_ONBOARDING',
    existingSetup: { foo: 1 },
  })
  assert(coexistence.config_id === 'CFG123', 'config_id')
  assert(coexistence.response_type === 'code', 'response_type')
  assert(coexistence.override_default_response_type === true, 'override')
  const cExtras = coexistence.extras as Record<string, unknown>
  assert(cExtras.featureType === 'whatsapp_business_app_onboarding', 'featureType coexistence')
  assert(cExtras.sessionInfoVersion === '3', 'sessionInfoVersion')
  assert(JSON.stringify(cExtras.setup) === JSON.stringify({ foo: 1 }), 'setup preserved')

  const standard = buildEmbeddedSignupLoginOptions({
    configId: 'CFG123',
    mode: 'STANDARD',
  })
  const sExtras = standard.extras as Record<string, unknown>
  assert(
    !Object.prototype.hasOwnProperty.call(sExtras, 'featureType'),
    'standard must not send featureType'
  )

  assert(isTrustedMetaOrigin('https://www.facebook.com') === true, 'trusted www')
  assert(isTrustedMetaOrigin('https://evil.example.com') === false, 'untrusted')

  const finish = parseWaEmbeddedSignupMessage({
    type: 'WA_EMBEDDED_SIGNUP',
    event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
    version: 3,
    data: { waba_id: 'WABA1' },
  })
  assert(finish?.isFinish === true, 'finish')
  assert(finish?.wabaId === 'WABA1', 'waba')
  assert(finish?.phoneNumberId === null, 'phone optional')

  const cancel = parseWaEmbeddedSignupMessage(
    JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL' })
  )
  assert(cancel?.isCancel === true, 'cancel')

  const err = parseWaEmbeddedSignupMessage({
    type: 'WA_EMBEDDED_SIGNUP',
    event: 'ERROR',
    data: { error_message: 'x' },
  })
  assert(err?.isError === true, 'error')

  const redacted = redactSignupDiagnostics({
    authorizationCode: 'abc',
    authResponse: { code: 'xyz' },
    note: 'ok',
  }) as any
  assert(redacted.authorizationCode === '[redacted]', 'redact code')
  assert(redacted.note === 'ok', 'keep note')

  console.log('metaEmbeddedSignupChecks PASS')
}

main()
