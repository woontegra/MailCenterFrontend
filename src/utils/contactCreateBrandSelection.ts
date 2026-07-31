/**
 * Pure helpers for Yeni Kişi brand selection.
 * Ensures visible brand chips and create payload share one ID source.
 */

export type BrandLike = { id?: unknown; brand_id?: unknown; name?: unknown }

export function parseBrandId(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.trunc(n)
}

/** Normalize brand list from various API envelopes. */
export function normalizeBrandsList(payload: unknown): BrandLike[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as BrandLike[]
    if (Array.isArray(obj.brands)) return obj.brands as BrandLike[]
  }
  return []
}

export function brandNumericId(brand: BrandLike): number | null {
  return parseBrandId(brand.id ?? brand.brand_id)
}

/**
 * Seed selected brand IDs when opening the create modal.
 * - Page filter brand wins when it belongs to the loaded list
 * - Otherwise a single available brand is auto-selected
 */
export function initialSelectedBrandIds(params: {
  brands: BrandLike[]
  pageBrandId?: string | number | null
}): number[] {
  const brands = params.brands || []
  const pageId = parseBrandId(params.pageBrandId)
  if (pageId != null) {
    const match = brands.find((b) => brandNumericId(b) === pageId)
    if (match) return [pageId]
  }
  if (brands.length === 1) {
    const only = brandNumericId(brands[0])
    return only != null ? [only] : []
  }
  return []
}

export function toggleBrandId(selected: number[], brandId: number): number[] {
  if (!Number.isFinite(brandId) || brandId <= 0) return selected
  if (selected.includes(brandId)) return selected.filter((id) => id !== brandId)
  return [...selected, brandId]
}

export type BrandPayloadResult =
  | { ok: true; brand_ids: number[]; labels: string[] }
  | { ok: false; error: string }

/**
 * Validate selection against loaded brands before POST.
 * Rejects empty selection and IDs that are not in the visible list.
 */
export function buildContactCreateBrandPayload(
  selectedIds: number[],
  brands: BrandLike[]
): BrandPayloadResult {
  const unique = [...new Set(selectedIds.map(parseBrandId).filter((n): n is number => n != null))]
  if (unique.length === 0) {
    return { ok: false, error: 'En az bir marka seçin.' }
  }

  const labels: string[] = []
  for (const id of unique) {
    const brand = brands.find((b) => brandNumericId(b) === id)
    if (!brand) {
      return { ok: false, error: 'Bu marka bulunamadı.' }
    }
    labels.push(String(brand.name || id))
  }

  return { ok: true, brand_ids: unique, labels }
}

/** Invariant: if UI shows selected chips, state must hold those IDs. */
export function selectedIdsMatchVisibleSelection(
  selectedIds: number[],
  brands: BrandLike[]
): boolean {
  const visibleSelected = brands
    .map(brandNumericId)
    .filter((id): id is number => id != null && selectedIds.includes(id))
  if (selectedIds.length === 0) return visibleSelected.length === 0
  if (selectedIds.length !== visibleSelected.length) return false
  return selectedIds.every((id) => visibleSelected.includes(id))
}
