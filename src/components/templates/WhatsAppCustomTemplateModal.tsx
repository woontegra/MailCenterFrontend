import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Send, X } from 'lucide-react'
import { brandApi, channelConnectionApi, templateApi } from '../../services/api'
import { normalizeWhatsAppTemplateName } from '../../utils/whatsappTemplateName'
import {
  buildBodyPreview,
  countBodyPlaceholders,
  insertNextPlaceholder,
  suggestMarketingCategory,
  syncExamplesWithPlaceholders,
  validateWhatsAppBodyText,
} from '../../utils/whatsappTemplateBody'

type Props = {
  open: boolean
  onClose: () => void
}

function whatsappChannelLabel(c: any): string {
  const title =
    c?.settings?.verified_name || c?.display_name || c?.settings?.waba_name || 'WhatsApp'
  const phone = c?.settings?.business_phone_number || c?.phone_number || '—'
  return `${title} — ${phone}`
}

export default function WhatsAppCustomTemplateModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [brandId, setBrandId] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY')
  const [bodyText, setBodyText] = useState('')
  const [examples, setExamples] = useState<string[]>([])
  const [websiteEnabled, setWebsiteEnabled] = useState(false)
  const [websiteText, setWebsiteText] = useState('Web sitesini ziyaret et')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [optOutQuickReply, setOptOutQuickReply] = useState(false)
  const [error, setError] = useState('')
  const [marketingHint, setMarketingHint] = useState('')

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
    enabled: open,
  })

  const { data: waConnections = [] } = useQuery({
    queryKey: ['channel-connections', 'WHATSAPP', brandId, 'custom-create'],
    enabled: open && Boolean(brandId),
    queryFn: async () => {
      const res = await channelConnectionApi.list({
        channel_type: 'WHATSAPP',
        brand_id: Number(brandId),
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((c: any) => String(c.status || '').toUpperCase() === 'ACTIVE')
    },
  })

  useEffect(() => {
    if (!open) return
    setBrandId('')
    setConnectionId('')
    setTitle('')
    setCategory('UTILITY')
    setBodyText('')
    setExamples([])
    setWebsiteEnabled(false)
    setWebsiteText('Web sitesini ziyaret et')
    setWebsiteUrl('')
    setOptOutQuickReply(false)
    setError('')
    setMarketingHint('')
  }, [open])

  useEffect(() => {
    if (!brandId) {
      setConnectionId('')
      return
    }
    if (waConnections.length === 1) {
      setConnectionId(String(waConnections[0].id))
      return
    }
    if (connectionId && !waConnections.some((c: any) => String(c.id) === String(connectionId))) {
      setConnectionId('')
    }
  }, [brandId, waConnections, connectionId])

  useEffect(() => {
    setExamples((prev) => syncExamplesWithPlaceholders(bodyText, prev))
    if (suggestMarketingCategory(bodyText) && category === 'UTILITY') {
      setMarketingHint(
        'Metin kampanya, indirim veya duyuru içeriyor olabilir. Meta genelde bunları Pazarlama kategorisinde değerlendirir.'
      )
    } else {
      setMarketingHint('')
    }
  }, [bodyText, category])

  const placeholderCount = countBodyPlaceholders(bodyText)
  const preview = useMemo(() => buildBodyPreview(bodyText, examples), [bodyText, examples])
  const generatedSlug = useMemo(
    () => (title ? normalizeWhatsAppTemplateName(title) : ''),
    [title]
  )

  const submitMutation = useMutation({
    mutationFn: async () => {
      const bodyErr = validateWhatsAppBodyText(bodyText)
      if (bodyErr) throw new Error(bodyErr)
      if (!brandId) throw new Error('Marka seçimi zorunludur')
      if (!connectionId) throw new Error('Bağlı WhatsApp kanalı seçimi zorunludur')
      if (!title.trim()) throw new Error('Şablon başlığı zorunludur')
      if (placeholderCount > 0 && examples.some((e) => !String(e || '').trim())) {
        throw new Error('Her değişken için örnek değer zorunludur')
      }
      if (websiteEnabled) {
        if (!websiteText.trim() || !websiteUrl.trim()) {
          throw new Error('Web sitesi butonu için yazı ve adres zorunludur')
        }
        if (!/^https?:\/\//i.test(websiteUrl.trim())) {
          throw new Error('Web sitesi adresi http:// veya https:// ile başlamalıdır')
        }
      }

      return templateApi.create({
        name: title.trim(),
        content: bodyText.trim(),
        plain_text_content: bodyText.trim(),
        channel_type: 'WHATSAPP',
        brand_id: Number(brandId),
        channelConnectionId: Number(connectionId),
        category,
        provider_template_language: 'tr',
        provider_template_name: generatedSlug || undefined,
        examples,
        variables: examples.map((example, i) => ({
          index: i + 1,
          key: `var_${i + 1}`,
          label: `Değişken ${i + 1}`,
          example: String(example).trim(),
        })),
        website_button: websiteEnabled
          ? { text: websiteText.trim(), url: websiteUrl.trim() }
          : null,
        include_opt_out_quick_reply: optOutQuickReply,
        is_active: true,
        is_shared: true,
      })
    },
    onSuccess: (res: any) => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      onClose()
      void res
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Şablon gönderilemedi')
    },
  })

  if (!open) return null

  const noActiveChannel = Boolean(brandId) && waConnections.length === 0

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-canvas-line px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ink">Yeni WhatsApp şablonu</h2>
            <p className="text-sm text-ink-soft mt-1">
              Şablon WhatsApp hesabınıza bir kez onaya gönderilir; onaylandıktan sonra tekrar tekrar
              kullanılabilir.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-canvas-soft">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submitMutation.mutate()
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Marka</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
                value={brandId}
                required
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Marka seçin</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Bağlı WhatsApp kanalı</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
                value={connectionId}
                required
                disabled={!brandId || waConnections.length === 0}
                onChange={(e) => setConnectionId(e.target.value)}
              >
                <option value="">
                  {!brandId
                    ? 'Önce marka seçin'
                    : waConnections.length === 0
                      ? 'Aktif kanal yok'
                      : 'Kanal seçin'}
                </option>
                {waConnections.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {whatsappChannelLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {noActiveChannel && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Bu marka için aktif WhatsApp bağlantısı yok. Önce kanal bağlantısından WhatsApp hesabı
              ekleyin.
            </p>
          )}

          <label className="block text-sm">
            <span className="text-ink-soft">Şablon başlığı</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              value={title}
              required
              placeholder="Örn: Ödeme hatırlatması"
              onChange={(e) => setTitle(e.target.value)}
            />
            {generatedSlug && (
              <span className="mt-1 block text-[11px] text-ink-faint">
                Sistem adı: {generatedSlug}
              </span>
            )}
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Kategori</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'UTILITY' | 'MARKETING')}
              >
                <option value="UTILITY">Yardımcı</option>
                <option value="MARKETING">Pazarlama</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Dil</span>
              <input
                className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
                value="Türkçe"
                readOnly
                disabled
              />
            </label>
          </div>

          {marketingHint && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {marketingHint}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm text-ink-soft">Mesaj metni</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-canvas-line"
                onClick={() => setBodyText((prev) => insertNextPlaceholder(prev))}
              >
                <Plus className="w-3.5 h-3.5" />
                Değişken ekle
              </button>
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm min-h-[120px]"
              value={bodyText}
              required
              placeholder="Merhaba {{1}}, ..."
              onChange={(e) => setBodyText(e.target.value)}
            />
            <p className="text-[11px] text-ink-faint mt-1">
              Değişkenler sırayla eklenir. Metin değişkenle başlamamalı veya bitmemeli; sonda kısa bir
              cümle bırakın.
            </p>
          </div>

          {placeholderCount > 0 && (
            <div className="space-y-2 rounded-xl border border-canvas-line p-3">
              <p className="text-sm font-medium text-ink">Değişken örnekleri</p>
              {Array.from({ length: placeholderCount }).map((_, i) => (
                <label key={i} className="block text-sm">
                  <span className="text-ink-soft">{`{{${i + 1}}} örnek değeri`}</span>
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
                    required
                    value={examples[i] || ''}
                    onChange={(e) => {
                      const next = [...examples]
                      next[i] = e.target.value
                      setExamples(next)
                    }}
                  />
                </label>
              ))}
            </div>
          )}

          {bodyText.trim() && (
            <div className="rounded-xl bg-canvas-soft/70 border border-canvas-line p-3">
              <p className="text-xs font-medium text-ink-soft mb-1">Önizleme</p>
              <p className="text-sm whitespace-pre-wrap text-ink">{preview}</p>
            </div>
          )}

          <div className="rounded-xl border border-canvas-line p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={websiteEnabled}
                onChange={(e) => setWebsiteEnabled(e.target.checked)}
              />
              Web sitesi butonu ekle
            </label>
            {websiteEnabled && (
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="px-3 py-2 rounded-xl border border-canvas-line text-sm"
                  placeholder="Buton yazısı"
                  value={websiteText}
                  onChange={(e) => setWebsiteText(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-xl border border-canvas-line text-sm"
                  placeholder="https://..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={optOutQuickReply}
                onChange={(e) => setOptOutQuickReply(e.target.checked)}
              />
              “Mesaj almak istemiyorum” hızlı yanıt butonu ekle
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-w-[8rem] py-2.5 rounded-xl bg-canvas-soft text-sm"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending || noActiveChannel}
              className="flex-[1.4] min-w-[12rem] inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              WhatsApp hesabıma ekle ve onaya gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
