/**
 * Client-side WhatsApp template body validation (mirrors backend catalog rules).
 */

export function countBodyPlaceholders(bodyText: string): number {
  const matches = String(bodyText || '').matchAll(/\{\{(\d+)\}\}/g)
  let max = 0
  for (const m of matches) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

export function listBodyPlaceholderOrder(bodyText: string): number[] {
  const seen = new Set<number>()
  const order: number[] = []
  for (const m of String(bodyText || '').matchAll(/\{\{(\d+)\}\}/g)) {
    const n = Number(m[1])
    if (!Number.isFinite(n) || seen.has(n)) continue
    seen.add(n)
    order.push(n)
  }
  return order
}

export function bodyStartsWithPlaceholder(bodyText: string): boolean {
  return /^\s*\{\{\d+\}\}/.test(String(bodyText || ''))
}

export function bodyEndsWithPlaceholder(bodyText: string): boolean {
  return /\{\{\d+\}\}\s*$/.test(String(bodyText || ''))
}

export function bodyHasStaticTextAfterLastPlaceholder(bodyText: string): boolean {
  const text = String(bodyText || '')
  const matches = [...text.matchAll(/\{\{\d+\}\}/g)]
  if (matches.length === 0) return true
  const last = matches[matches.length - 1]
  const after = text.slice((last.index ?? 0) + last[0].length)
  return /[A-Za-zÀ-ÖØ-öø-ÿĀ-ž0-9]/.test(after)
}

export function validateWhatsAppBodyText(bodyText: string): string | null {
  const text = String(bodyText || '').trim()
  if (!text) return 'Mesaj metni zorunludur'
  if (bodyStartsWithPlaceholder(text)) return 'Mesaj metni bir değişkenle başlayamaz'
  if (bodyEndsWithPlaceholder(text)) {
    return 'Mesaj metni bir değişkenle bitemez; sonuna kısa bir cümle ekleyin'
  }
  if (!bodyHasStaticTextAfterLastPlaceholder(text)) {
    return 'Son değişkenden sonra anlamlı bir cümle ekleyin'
  }
  const order = listBodyPlaceholderOrder(text)
  const count = countBodyPlaceholders(text)
  if (order.length !== count) {
    return 'Değişken numaraları 1’den başlayıp kesintisiz ilerlemelidir'
  }
  for (let i = 0; i < order.length; i++) {
    if (order[i] !== i + 1) {
      return 'Değişken numaraları 1’den başlayıp kesintisiz ilerlemelidir'
    }
  }
  return null
}

export function buildBodyPreview(bodyText: string, examples: string[]): string {
  let out = String(bodyText || '')
  examples.forEach((ex, i) => {
    out = out.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), String(ex ?? ''))
  })
  return out
}

const MARKETING_HINT =
  /kampanya|indirim|fırsat|firsat|duyuru|tanıtım|tanitim|ürün|urun|promosyon|sale|kupon|hediye|%[\d]/i

export function suggestMarketingCategory(bodyText: string): boolean {
  return MARKETING_HINT.test(String(bodyText || ''))
}

export function insertNextPlaceholder(bodyText: string): string {
  const next = countBodyPlaceholders(bodyText) + 1
  const token = `{{${next}}}`
  const trimmed = String(bodyText || '')
  if (!trimmed) return `Merhaba ${token}, `
  if (trimmed.endsWith(' ')) return `${trimmed}${token}`
  return `${trimmed} ${token}`
}

export function syncExamplesWithPlaceholders(
  bodyText: string,
  current: string[]
): string[] {
  const count = countBodyPlaceholders(bodyText)
  const next = current.slice(0, count)
  while (next.length < count) next.push('')
  return next
}
