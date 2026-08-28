import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Cable, MessageCircle, Send, Users } from 'lucide-react'
import { brandApi, channelConnectionApi, contactApi, templateApi, whatsappApi } from '../services/api'
import WhatsAppBulkCampaignPanel from '../components/whatsapp/WhatsAppBulkCampaignPanel'
import { APP_DISPLAY_NAME } from '../config/app'
import {
  connectionPhone,
  connectionPhoneNumberId,
  isMetaTestWhatsAppPhone,
  pickDefaultWhatsAppConnection,
} from '../utils/whatsappSenderSelection'
import { whatsappTemplateStatusDisplay } from '../utils/displayLabels'

function newIdempotencyKey() {
  return `wa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function connectionSettings(c: any): Record<string, any> {
  const s = c?.settings
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {}
}

function whatsappChannelLabel(c: any): string {
  const settings = connectionSettings(c)
  const title =
    settings.verified_name || c?.display_name || settings.waba_name || 'WhatsApp'
  const phone = connectionPhone(c) || '—'
  return `${title} — ${phone}`
}

function businessPhoneOf(c: any): string {
  return connectionPhone(c)
}

function phoneNumberIdOf(c: any): string {
  return connectionPhoneNumberId(c)
}

function templateOptionLabel(t: any): string {
  const lang = String(t.provider_template_language || '').trim()
  const providerName = String(t.provider_template_name || '').trim()
  if (providerName) {
    return lang ? `${providerName} (${lang})` : providerName
  }
  const name = String(t.name || '').trim() || 'Şablon'
  // Avoid "hello_world (en_US) (en_US)" when sync already baked language into name
  if (lang && name.endsWith(`(${lang})`)) return name
  if (lang && !name.includes(`(${lang})`)) return `${name} (${lang})`
  return name
}

export default function ComposeWhatsApp() {
  const navigate = useNavigate()
  const idempotencyRef = useRef(newIdempotencyKey())

  const [brandId, setBrandId] = useState('')
  const [channelConnectionId, setChannelConnectionId] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [senderError, setSenderError] = useState('')
  const [ensuringSender, setEnsuringSender] = useState(false)

  const [messageMode, setMessageMode] = useState<'TEMPLATE' | 'TEXT'>('TEMPLATE')
  const [templateId, setTemplateId] = useState('')
  const [contactId, setContactId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [declaredVars, setDeclaredVars] = useState<string[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [composeMode, setComposeMode] = useState<'single' | 'bulk'>('single')

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const {
    data: brandWaChannels = [],
    isLoading: channelsLoading,
    isError: channelsError,
    error: channelsErr,
  } = useQuery({
    queryKey: ['channel-connections', 'WHATSAPP', 'ACTIVE', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await channelConnectionApi.list({
        channel_type: 'WHATSAPP',
        brand_id: brandId,
        status: 'ACTIVE',
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter(
        (c: any) =>
          String(c.status || '').toUpperCase() === 'ACTIVE' &&
          Boolean(connectionPhoneNumberId(c))
      )
    },
  })

  const selectedChannel = useMemo(
    () => brandWaChannels.find((c: any) => String(c.id) === String(channelConnectionId)),
    [brandWaChannels, channelConnectionId]
  )

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-wa', brandId, channelConnectionId],
    enabled: Boolean(brandId) && Boolean(channelConnectionId),
    queryFn: async () => {
      const res = await templateApi.list({
        brand_id: brandId,
        channel_type: 'WHATSAPP',
        channel_connection_id: channelConnectionId,
        approval_status: 'APPROVED',
      })
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      return rows.filter(
        (t: any) =>
          t.is_active !== false &&
          String(t.provider_approval_status || '').toUpperCase() === 'APPROVED'
      )
    },
  })

  const { data: contactsPayload } = useQuery({
    queryKey: ['contacts-wa-picker'],
    queryFn: async () => {
      const res = await contactApi.list({ channel: 'WHATSAPP', limit: 50 })
      return res.data
    },
  })
  const contacts = Array.isArray(contactsPayload?.data) ? contactsPayload.data : []

  const selectedContact = useMemo(
    () => contacts.find((c: any) => String(c.id) === String(contactId)),
    [contacts, contactId]
  )

  const primaryPhone = useMemo(() => {
    if (!selectedContact) return null
    const points = selectedContact.contact_points || []
    return (
      points.find((p: any) => p.channel_type === 'WHATSAPP' && p.is_primary) ||
      points.find((p: any) => p.channel_type === 'WHATSAPP') ||
      points.find((p: any) => p.channel_type === 'SMS') ||
      null
    )
  }, [selectedContact])

  useEffect(() => {
    if (primaryPhone?.value) setRecipient(primaryPhone.value)
  }, [primaryPhone])

  // Reset dependent state when brand changes
  useEffect(() => {
    setChannelConnectionId('')
    setSenderIdentityId('')
    setSenderPhone('')
    setPhoneNumberId('')
    setSenderError('')
    setTemplateId('')
    setMessageContent('')
    setVariables({})
    setDeclaredVars([])
    setError('')
    setNotice('')
  }, [brandId])

  // Auto-select single / preferred real ACTIVE channel; test-only brands still select
  useEffect(() => {
    if (!brandId) return
    if (channelsLoading) return

    if (brandWaChannels.length === 0) {
      setChannelConnectionId('')
      setSenderIdentityId('')
      setSenderPhone('')
      setPhoneNumberId('')
      setSenderError('Bu marka için aktif WhatsApp bağlantısı bulunamadı.')
      return
    }

    setSenderError('')
    const stillValid = brandWaChannels.some(
      (c: any) => String(c.id) === String(channelConnectionId)
    )
    if (!stillValid) {
      const picked = pickDefaultWhatsAppConnection(brandWaChannels)
      if (picked) {
        setChannelConnectionId(String(picked.id))
      } else {
        setChannelConnectionId('')
        setSenderIdentityId('')
        setSenderPhone('')
        setPhoneNumberId('')
      }
    }
  }, [brandId, brandWaChannels, channelsLoading, channelConnectionId])

  // When channel selected: fill phone / phone_number_id and ensure sender identity
  useEffect(() => {
    if (!channelConnectionId || !selectedChannel) {
      if (!channelConnectionId) {
        setSenderIdentityId('')
        setSenderPhone('')
        setPhoneNumberId('')
      }
      return
    }

    const phone = businessPhoneOf(selectedChannel)
    const pnid = phoneNumberIdOf(selectedChannel)
    setSenderPhone(phone)
    setPhoneNumberId(pnid)

    let cancelled = false
    const run = async () => {
      setEnsuringSender(true)
      setSenderError('')
      try {
        const res = await channelConnectionApi.ensureWhatsAppSender(Number(channelConnectionId), {
          brand_id: Number(brandId),
        })
        const data = res.data?.data
        if (cancelled) return
        if (!data?.sender_identity_id) {
          setSenderIdentityId('')
          setSenderError('Bu marka için aktif WhatsApp göndericisi bulunamadı.')
          return
        }
        setSenderIdentityId(String(data.sender_identity_id))
        if (data.business_phone) setSenderPhone(String(data.business_phone))
        if (data.phone_number_id) setPhoneNumberId(String(data.phone_number_id))
      } catch (err: any) {
        if (cancelled) return
        setSenderIdentityId('')
        setSenderError(
          err.response?.data?.error || 'Bu marka için aktif WhatsApp göndericisi bulunamadı.'
        )
      } finally {
        if (!cancelled) setEnsuringSender(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [channelConnectionId, selectedChannel])

  useEffect(() => {
    if (!templateId) return
    const tpl = templates.find((t: any) => String(t.id) === String(templateId))
    if (!tpl) {
      setTemplateId('')
      return
    }
    setMessageContent(tpl.plain_text_content || tpl.content || tpl.provider_template_name || '')
    const vars = Array.isArray(tpl.variables)
      ? tpl.variables.map((v: any) => (typeof v === 'string' ? v : v?.name)).filter(Boolean)
      : []
    setDeclaredVars(vars)
    const next: Record<string, string> = {}
    vars.forEach((name: string) => {
      next[name] = variables[name] || ''
    })
    setVariables(next)
  }, [templateId, templates])

  const previewQuery = useQuery({
    queryKey: [
      'wa-preview',
      messageMode,
      messageContent,
      templateId,
      variables,
      recipient,
      brandId,
      senderIdentityId,
      channelConnectionId,
    ],
    enabled: Boolean(senderIdentityId),
    queryFn: async () => {
      const res = await whatsappApi.preview({
        messageMode,
        messageContent,
        templateId: templateId || undefined,
        templateVariables: variables,
        recipient: recipient || undefined,
        brandId: brandId ? Number(brandId) : undefined,
        senderIdentityId: senderIdentityId ? Number(senderIdentityId) : undefined,
        channelConnectionId: channelConnectionId ? Number(channelConnectionId) : undefined,
      })
      return res.data?.data
    },
  })

  const preview = previewQuery.data
  const canQueue = Boolean(
    brandId &&
      channelConnectionId &&
      senderIdentityId &&
      recipient &&
      preview?.canSend &&
      (messageMode === 'TEMPLATE' ? templateId : messageContent.trim())
  )

  const onBrandChange = (value: string) => {
    setBrandId(value)
  }

  const onChannelChange = (value: string) => {
    setChannelConnectionId(value)
    setTemplateId('')
    setSenderIdentityId('')
    setSenderError('')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!canQueue) {
      setError(preview?.blockReason || senderError || 'Gönderim uygun değil')
      return
    }
    setSending(true)
    try {
      const res = await whatsappApi.send({
        brandId: Number(brandId),
        senderIdentityId: Number(senderIdentityId),
        channelConnectionId: Number(channelConnectionId),
        recipient,
        contactPointId: primaryPhone?.id,
        messageMode,
        templateId: messageMode === 'TEMPLATE' && templateId ? Number(templateId) : undefined,
        messageContent: messageMode === 'TEXT' ? messageContent : undefined,
        templateVariables: variables,
        idempotencyKey: idempotencyRef.current,
      })
      setNotice(res.data?.message || 'WhatsApp kuyruğa alındı')
      idempotencyRef.current = newIdempotencyKey()
      window.setTimeout(() => navigate('/outbound'), 800)
    } catch (err: any) {
      setError(err.response?.data?.error || 'WhatsApp kuyruğa alınamadı')
      idempotencyRef.current = newIdempotencyKey()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Kanallar</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">WhatsApp Yaz</h1>
          <p className="text-sm text-ink-soft mt-1">
            {composeMode === 'single'
              ? `${APP_DISPLAY_NAME} — onaylı şablon veya 24s penceresinde serbest metin.`
              : `${APP_DISPLAY_NAME} — onaylı pazarlama şablonlarıyla toplu WhatsApp gönderimi.`}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${
            composeMode === 'single' ? 'bg-dock text-white' : 'border border-canvas-line'
          }`}
          onClick={() => setComposeMode('single')}
        >
          <Send className="w-3.5 h-3.5" />
          Tek kişiye gönder
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${
            composeMode === 'bulk' ? 'bg-dock text-white' : 'border border-canvas-line'
          }`}
          onClick={() => setComposeMode('bulk')}
        >
          <Users className="w-3.5 h-3.5" />
          Toplu gönderim
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="mc-panel mc-panel-asymmetric p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Marka</span>
              <select
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={brandId}
                onChange={(e) => onBrandChange(e.target.value)}
                required
              >
                <option value="">Seçin</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-faint uppercase tracking-wide">WhatsApp Gönderen</span>
              <select
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={channelConnectionId}
                onChange={(e) => onChannelChange(e.target.value)}
                required
                disabled={!brandId || channelsLoading || ensuringSender}
              >
                <option value="">Seçin</option>
                {brandWaChannels.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {whatsappChannelLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {brandId && !channelsLoading && brandWaChannels.length === 0 && (
            <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-2">
              <p>
                {channelsError
                  ? (channelsErr as any)?.response?.data?.error ||
                    'Gönderici listesi yüklenemedi.'
                  : 'Bu marka için aktif WhatsApp göndericisi bulunamadı.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/channels/whatsapp/setup')}
                className="inline-flex items-center gap-1.5 text-signal-deep underline text-sm"
              >
                <Cable className="w-3.5 h-3.5" />
                WhatsApp kanalını bağla
              </button>
            </div>
          )}

          {senderError && brandWaChannels.length > 0 && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {senderError}
            </p>
          )}

          {selectedChannel && isMetaTestWhatsAppPhone(connectionPhone(selectedChannel)) && (
            <p className="text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
              Meta inceleme test bağlantısı. Gerçek müşteri numarası bağlantısı Advanced Access
              onayından sonra kullanılabilir.
            </p>
          )}

          <div className={composeMode === 'single' ? 'grid gap-3 md:grid-cols-2' : ''}>
            <label className="block text-sm">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Gönderen telefon</span>
              <input
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={senderPhone}
                readOnly
                placeholder={channelConnectionId ? '—' : 'Önce gönderen seçin'}
              />
              {composeMode === 'single' && phoneNumberId ? (
                <span className="text-[11px] text-ink-faint mt-1 block">
                  Phone Number ID: {phoneNumberId}
                </span>
              ) : null}
            </label>
            {composeMode === 'single' && (
              <label className="block text-sm">
                <span className="text-xs text-ink-faint uppercase tracking-wide">Alıcı telefon</span>
                <input
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="+905..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </label>
            )}
          </div>

          {composeMode === 'bulk' && (
            <WhatsAppBulkCampaignPanel
              brandId={brandId}
              channelConnectionId={channelConnectionId}
              senderIdentityId={senderIdentityId}
              ensuringSender={ensuringSender}
              senderError={senderError}
            />
          )}

          {composeMode === 'single' && (
            <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Kişi</span>
              <select
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">Manuel numara</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                    {(() => {
                      const waPref =
                        (c.preferences || []).find(
                          (p: any) =>
                            String(p.channel_type).toUpperCase() === 'WHATSAPP' &&
                            (p.brand_id == null || String(p.brand_id) === String(brandId))
                        ) ||
                        (c.preferences || []).find(
                          (p: any) => String(p.channel_type).toUpperCase() === 'WHATSAPP'
                        )
                      const st = String(waPref?.status || 'UNKNOWN').toUpperCase()
                      if (st === 'OPTED_IN') return ' · İzinli'
                      if (st === 'OPTED_OUT') return ' · Red'
                      if (st === 'BLOCKED') return ' · Engelli'
                      return ' · Bilinmiyor'
                    })()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs ${
                messageMode === 'TEMPLATE' ? 'bg-dock text-white' : 'border border-canvas-line'
              }`}
              onClick={() => setMessageMode('TEMPLATE')}
            >
              Onaylı Şablon
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs ${
                messageMode === 'TEXT' ? 'bg-dock text-white' : 'border border-canvas-line'
              }`}
              onClick={() => setMessageMode('TEXT')}
            >
              Serbest Metin
            </button>
          </div>

          {messageMode === 'TEMPLATE' ? (
            <>
              <label className="block text-sm">
                <span className="text-xs text-ink-faint uppercase tracking-wide">WhatsApp şablonu</span>
                <select
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  required
                  disabled={!channelConnectionId}
                >
                  <option value="">
                    {channelConnectionId ? 'Seçin' : 'Önce gönderen seçin'}
                  </option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {templateOptionLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
              {channelConnectionId && templates.length === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Bu gönderici için onaylı şablon bulunamadı. Kanal ayarlarından veya Hazır
                  Kütüphane’den şablon ekleyip senkronize edin. Onay bekleyen veya reddedilen
                  şablonlar gönderimde listelenmez.
                </p>
              )}
              {declaredVars.map((name) => (
                <label key={name} className="block text-sm">
                  <span className="text-xs text-ink-faint">{`{{${name}}}`}</span>
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                    value={variables[name] || ''}
                    onChange={(e) => setVariables({ ...variables, [name]: e.target.value })}
                  />
                </label>
              ))}
            </>
          ) : (
            <label className="block text-sm">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Mesaj</span>
              <textarea
                className="mt-1 w-full min-h-[140px] px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                required
                disabled={!channelConnectionId}
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!canQueue || sending || ensuringSender}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Kuyruğa alınıyor…' : 'Kuyruğa Al'}
          </button>
          {!canQueue && preview?.blockReason && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {preview.blockReason}
            </p>
          )}
            </>
          )}
        </div>

        {composeMode === 'single' && (
        <aside className="mc-panel mc-panel-asymmetric p-4 h-fit space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-signal" />
            <span className="text-sm font-medium">Önizleme</span>
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap">
            {preview?.renderedText || messageContent || '—'}
          </p>
          {preview?.template && (() => {
            const tplDisplay = whatsappTemplateStatusDisplay(preview.template)
            return (
            <p className="text-xs text-ink-faint">
              Dil: {preview.template.provider_template_language || '—'} · {tplDisplay.label}
            </p>
            )
          })()}
          <div className="pt-2 border-t border-canvas-line text-sm">
            <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">İzin</p>
            {preview?.preference ? (
              <p className={preview.preference.eligible ? 'text-emerald-700' : 'text-red-600'}>
                {(() => {
                  const st = String(preview.preference.status || '').toUpperCase()
                  if (st === 'OPTED_IN') return 'İzinli (OPTED_IN)'
                  if (st === 'OPTED_OUT') return 'Red (OPTED_OUT)'
                  if (st === 'BLOCKED') return 'Engelli (BLOCKED)'
                  if (st === 'UNKNOWN') return 'Bilinmiyor (UNKNOWN)'
                  return preview.preference.status
                })()}
              </p>
            ) : (
              <p className="text-ink-soft">Numara girildiğinde kontrol edilir</p>
            )}
            {messageMode === 'TEXT' && preview?.serviceWindow && (
              <p className="text-xs text-ink-soft mt-2">
                {preview.serviceWindow.reason || 'Pencere açık'}
              </p>
            )}
          </div>
        </aside>
        )}
      </form>
    </div>
  )
}
