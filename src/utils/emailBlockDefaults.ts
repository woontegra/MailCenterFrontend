import type { BlockType, EditorDocument, EmailBlock } from '../types/emailTemplate'

export function createBlock(type: BlockType, overrides?: Record<string, unknown>): EmailBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const defaults: Record<BlockType, Record<string, unknown>> = {
    heading: { text: 'Başlık', level: 2, align: 'left', color: '#15202b', fontSize: 22 },
    text: { text: 'Metin paragrafı…', align: 'left', color: '#334155', fontSize: 16, lineHeight: 24 },
    image: { src: '', alt: '', width: 560, align: 'center', link: '', fullWidth: false },
    logo: { src: '', alt: 'Logo', width: 160, align: 'left', link: '', logoSource: 'brand' },
    button: { text: 'Detayları gör', url: '#', align: 'center', bgColor: '#1a2332', textColor: '#ffffff', borderRadius: 6 },
    divider: { color: '#e5e7eb', height: 1 },
    spacer: { height: 24 },
    columns1: { columns: [{ blocks: [] }] },
    columns2: { columns: [{ blocks: [] }, { blocks: [] }] },
    columns3: { columns: [{ blocks: [] }, { blocks: [] }, { blocks: [] }] },
    social: { links: [{ label: 'Web', url: '' }], align: 'center' },
    company_info: { companyName: '{{marka_adi}}', address: '', email: '', website: '' },
    unsubscribe: { text: 'Bu e-postayı almak istemiyorsanız', linkText: 'abonelikten çıkın', link: '{{abonelikten_cikma_linki}}' },
    footer: { text: '© {{marka_adi}}. Tüm hakları saklıdır.' },
  }
  return { id, type, props: { ...defaults[type], ...overrides } }
}

export function createStarterDocument(brand?: {
  name?: string
  logo_url?: string
  accent_color?: string
  domain?: string
}): EditorDocument {
  const primary = brand?.accent_color || '#1a2332'
  return {
    version: 1,
    blocks: [
      createBlock('logo', { src: brand?.logo_url || '', width: 140 }),
      createBlock('heading', { text: 'Merhaba {{tam_ad}}' }),
      createBlock('text', {
        text: '{{marka_adi}} olarak size özel bir mesajımız var.',
      }),
      createBlock('button', { bgColor: primary, url: brand?.domain ? `https://${brand.domain}` : '#' }),
      createBlock('divider'),
      createBlock('company_info', {
        companyName: brand?.name || '{{marka_adi}}',
        website: brand?.domain ? `https://${brand.domain}` : '',
      }),
      createBlock('unsubscribe'),
      createBlock('footer'),
    ],
    settings: { backgroundColor: '#f4f6f8', contentWidth: 600, primaryColor: primary },
  }
}

export function applyBrandToDocument(doc: EditorDocument, brand?: {
  name?: string
  logo_url?: string
  accent_color?: string
  domain?: string
  contact_email?: string
}): EditorDocument {
  if (!brand) return doc
  const next = structuredClone(doc)
  next.settings = {
    ...next.settings,
    primaryColor: brand.accent_color || next.settings?.primaryColor,
  }
  for (const block of next.blocks) {
    if (block.type === 'logo') {
      const source = String(block.props.logoSource || 'brand');
      if (source === 'upload') continue;
      if (brand.logo_url) {
        block.props.src = brand.logo_url;
        block.props.logoSource = 'brand';
      }
    }
    if (block.type === 'button' && brand.accent_color) block.props.bgColor = brand.accent_color
    if (block.type === 'company_info') {
      if (brand.name) block.props.companyName = brand.name
      if (brand.domain) block.props.website = `https://${brand.domain}`
      if (brand.contact_email) block.props.email = brand.contact_email
    }
  }
  return next
}

export function hasBulkCompliance(blocks: EmailBlock[]): { ok: boolean; missing: string[] } {
  let company = false
  let unsubscribe = false
  for (const b of blocks) {
    if (b.type === 'company_info' || b.type === 'footer') company = true
    if (b.type === 'unsubscribe') unsubscribe = true
  }
  const missing: string[] = []
  if (!company) missing.push('şirket bilgisi')
  if (!unsubscribe) missing.push('abonelikten çıkma')
  return { ok: missing.length === 0, missing }
}

export function moveBlock(blocks: EmailBlock[], from: number, to: number): EmailBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks
  const next = [...blocks]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
