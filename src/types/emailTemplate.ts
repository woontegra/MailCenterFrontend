export type BlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'logo'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns1'
  | 'columns2'
  | 'columns3'
  | 'social'
  | 'company_info'
  | 'unsubscribe'
  | 'footer'

export type EmailBlock = {
  id: string
  type: BlockType
  props: Record<string, unknown>
  hiddenOnMobile?: boolean
}

export type EditorDocument = {
  version: 1
  blocks: EmailBlock[]
  settings?: {
    backgroundColor?: string
    contentWidth?: number
    fontFamily?: string
    primaryColor?: string
  }
}

export type TemplateKind = 'INDIVIDUAL' | 'BULK'

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Başlık',
  text: 'Metin',
  image: 'Görsel',
  logo: 'Logo',
  button: 'Buton',
  divider: 'Ayırıcı',
  spacer: 'Boşluk',
  columns1: 'Tek kolon',
  columns2: 'İki kolon',
  columns3: 'Üç kolon',
  social: 'Sosyal medya',
  company_info: 'Şirket bilgisi',
  unsubscribe: 'Abonelikten çık',
  footer: 'Hazır footer',
}

export const TEMPLATE_VARIABLES = [
  { key: 'ad', label: 'Ad' },
  { key: 'soyad', label: 'Soyad' },
  { key: 'tam_ad', label: 'Tam ad' },
  { key: 'firma', label: 'Firma' },
  { key: 'email', label: 'E-posta' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'marka_adi', label: 'Marka adı' },
  { key: 'abonelikten_cikma_linki', label: 'Abonelikten çıkma linki' },
] as const

export const PREVIEW_SAMPLE_VALUES: Record<string, string> = {
  ad: 'Ayşe',
  soyad: 'Yılmaz',
  tam_ad: 'Ayşe Yılmaz',
  firma: 'Örnek A.Ş.',
  email: 'ayse@ornek.com',
  telefon: '+90 555 123 45 67',
  marka_adi: 'Örnek Marka',
  abonelikten_cikma_linki: 'https://example.com/abonelikten-cik',
}
