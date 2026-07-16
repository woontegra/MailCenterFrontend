import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Send } from 'lucide-react'
import {
  brandApi,
  contactApi,
  senderIdentityApi,
  templateApi,
  whatsappApi,
} from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

function newIdempotencyKey() {
  return `wa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function ComposeWhatsApp() {
  const navigate = useNavigate()
  const idempotencyRef = useRef(newIdempotencyKey())

  const [brandId, setBrandId] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
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

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities-wa', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await senderIdentityApi.list({
        brand_id: brandId,
        channel_type: 'WHATSAPP',
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((s: any) => s.is_active !== false && s.is_verified !== false)
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-wa', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await templateApi.list({ brand_id: brandId, channel_type: 'WHATSAPP' })
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

  useEffect(() => {
    if (!templateId) return
    const tpl = templates.find((t: any) => String(t.id) === String(templateId))
    if (!tpl) return
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
    ],
    queryFn: async () => {
      const res = await whatsappApi.preview({
        messageMode,
        messageContent,
        templateId: templateId || undefined,
        templateVariables: variables,
        recipient: recipient || undefined,
        brandId: brandId ? Number(brandId) : undefined,
        senderIdentityId: senderIdentityId ? Number(senderIdentityId) : undefined,
      })
      return res.data?.data
    },
  })

  const preview = previewQuery.data
  const canQueue = Boolean(
    brandId &&
      senderIdentityId &&
      recipient &&
      preview?.canSend &&
      (messageMode === 'TEMPLATE' ? templateId : messageContent.trim())
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!canQueue) {
      setError(preview?.blockReason || 'Gönderim uygun değil')
      return
    }
    setSending(true)
    try {
      const res = await whatsappApi.send({
        brandId: Number(brandId),
        senderIdentityId: Number(senderIdentityId),
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
            {APP_DISPLAY_NAME} — onaylı şablon veya 24s penceresinde serbest metin.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
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
                onChange={(e) => {
                  setBrandId(e.target.value)
                  setSenderIdentityId('')
                  setTemplateId('')
                }}
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
              <span className="text-xs text-ink-faint uppercase tracking-wide">WhatsApp gönderen</span>
              <select
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={senderIdentityId}
                onChange={(e) => setSenderIdentityId(e.target.value)}
                required
                disabled={!brandId}
              >
                <option value="">Seçin</option>
                {senders.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name || s.sender_value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
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
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Telefon</span>
              <input
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                placeholder="+905..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
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
                >
                  <option value="">Seçin</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.provider_template_language || '—'})
                    </option>
                  ))}
                </select>
              </label>
              {templates.length === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Onaylı (APPROVED) WhatsApp şablonu yok. Meta’da onaylı şablon bağlayın; sahte şablon gösterilmez.
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
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!canQueue || sending}
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
        </div>

        <aside className="mc-panel mc-panel-asymmetric p-4 h-fit space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-signal" />
            <span className="text-sm font-medium">Önizleme</span>
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap">
            {preview?.renderedText || messageContent || '—'}
          </p>
          {preview?.template && (
            <p className="text-xs text-ink-faint">
              Dil: {preview.template.provider_template_language || '—'} ·{' '}
              {preview.template.provider_approval_status}
            </p>
          )}
          <div className="pt-2 border-t border-canvas-line text-sm">
            <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">İzin</p>
            {preview?.preference ? (
              <p className={preview.preference.eligible ? 'text-emerald-700' : 'text-red-600'}>
                {preview.preference.status}
              </p>
            ) : (
              <p className="text-ink-soft">Numara girildiğinde kontrol edilir</p>
            )}
            {messageMode === 'TEXT' && preview?.serviceWindow && (
              <p className="text-xs text-ink-soft mt-2">{preview.serviceWindow.reason || 'Pencere açık'}</p>
            )}
          </div>
        </aside>
      </form>
    </div>
  )
}
