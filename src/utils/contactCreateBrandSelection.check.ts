/**
 * Assert contact create brand selection helpers (no React / no mock brand names).
 * Run: npx --yes tsx src/utils/contactCreateBrandSelection.check.ts
 */
import {
  brandNumericId,
  buildContactCreateBrandPayload,
  initialSelectedBrandIds,
  normalizeBrandsList,
  parseBrandId,
  selectedIdsMatchVisibleSelection,
  toggleBrandId,
} from './contactCreateBrandSelection'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// Real-shaped IDs (not name-based mocks)
const metaBrand = { id: 13, name: 'Meta İnceleme Markası' }
const otherBrand = { id: 21, name: 'Other Brand' }

assert(parseBrandId('13') === 13, 'parse string id')
assert(parseBrandId(13) === 13, 'parse number id')
assert(parseBrandId('Meta İnceleme Markası') == null, 'reject name as id')
assert(brandNumericId({ brand_id: '13' }) === 13, 'brand_id alias')

assert(
  normalizeBrandsList([metaBrand]).length === 1,
  'array envelope'
)
assert(
  normalizeBrandsList({ data: [metaBrand] })[0]?.id === 13,
  'data envelope'
)

// Single brand auto-selects real id
const single = initialSelectedBrandIds({ brands: [metaBrand], pageBrandId: '' })
assert(single.length === 1 && single[0] === 13, 'single brand auto-selects id 13')
assert(
  selectedIdsMatchVisibleSelection(single, [metaBrand]),
  'UI selection matches state for single brand'
)

// Page filter brand preferred
const filtered = initialSelectedBrandIds({
  brands: [metaBrand, otherBrand],
  pageBrandId: '13',
})
assert(filtered.length === 1 && filtered[0] === 13, 'page filter seeds brand_ids')

// Multi brand without filter → empty (user must choose)
const multi = initialSelectedBrandIds({
  brands: [metaBrand, otherBrand],
  pageBrandId: null,
})
assert(multi.length === 0, 'multi brand requires explicit selection')

const toggled = toggleBrandId([], 13)
assert(toggled[0] === 13, 'toggle adds id')
assert(toggleBrandId(toggled, 13).length === 0, 'toggle removes id')

const emptyPayload = buildContactCreateBrandPayload([], [metaBrand])
assert(!emptyPayload.ok && emptyPayload.error === 'En az bir marka seçin.', 'empty brand_ids rejected')

const okPayload = buildContactCreateBrandPayload([13], [metaBrand])
assert(okPayload.ok && okPayload.brand_ids[0] === 13, 'payload carries real brand id')
assert(okPayload.ok && okPayload.labels[0] === 'Meta İnceleme Markası', 'label matches selected id')

const foreign = buildContactCreateBrandPayload([999], [metaBrand])
assert(!foreign.ok, 'unknown brand id rejected')

// Visible chip selection must come only from state IDs present in brands list
assert(selectedIdsMatchVisibleSelection([13], [metaBrand]), 'selected chip requires id in state')
assert(!selectedIdsMatchVisibleSelection([13], [otherBrand]), 'id not in list fails match')
assert(selectedIdsMatchVisibleSelection([], [metaBrand]), 'unselected chips with empty state ok')

console.log('✓ contactCreateBrandSelection checks passed')
