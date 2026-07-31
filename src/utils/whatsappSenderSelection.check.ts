/**
 * Assert WhatsApp sender selection helpers.
 * Run: npx --yes tsx src/utils/whatsappSenderSelection.check.ts
 */
import {
  isMetaTestWhatsAppPhone,
  pickDefaultWhatsAppConnection,
  whatsappPhoneDigits,
} from './whatsappSenderSelection'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(whatsappPhoneDigits('+90 532 317 17 55') === '905323171755', 'digits TR')
assert(isMetaTestWhatsAppPhone('+1 555-154-8955'), 'meta test detected')
assert(!isMetaTestWhatsAppPhone('+905323171755'), 'real not test')

const test = {
  id: 11,
  phone_number: '+1 555-154-8955',
  phone_number_id: '1250707658121285',
  settings: {},
}
const real = {
  id: 99,
  phone_number: '+905323171755',
  phone_number_id: 'REAL_PNID',
  settings: { connection_type: 'WHATSAPP_BUSINESS_APP_ONBOARDING' },
}

assert(pickDefaultWhatsAppConnection([test])?.id === 11, 'single test ok')
assert(pickDefaultWhatsAppConnection([real])?.id === 99, 'single real ok')
assert(pickDefaultWhatsAppConnection([test, real])?.id === 99, 'prefer real over test')
assert(
  pickDefaultWhatsAppConnection([real, { ...real, id: 100 }]) == null,
  'ambiguous reals'
)

console.log('✓ whatsappSenderSelection checks passed')
