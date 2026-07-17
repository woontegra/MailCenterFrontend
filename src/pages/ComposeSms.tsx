import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Cable, MessageSquare, Send } from 'lucide-react'
import {
  brandApi,
  channelConnectionApi,
  contactApi,
  senderIdentityApi,
  smsApi,
  templateApi,
} from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

function newIdempotencyKey() {
  return `sms_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function ComposeSms() {
  const navigate = useNavigate()
  const idempotencyRef = useRef(newIdempotencyKey())

  const [brandId, setBrandId] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
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

  const { data: smsConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['channel-connections', 'SMS'],
    queryFn: async () => {
      const res = await channelConnectionApi.list({ channel_type: 'SMS' })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((c: any) => c.status === 'ACTIVE')
    },
  })

  const hasActiveSmsChannel = smsConnections.length > 0

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities-sms', brandId],
    enabled: Boolean(brandId) && hasActiveSmsChannel,
    queryFn: async () => {
      const res = await senderIdentityApi.list({
        brand_id: brandId,
        channel_type: 'SMS',
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((s: any) => s.is_active !== false && s.is_verified !== false)
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-sms', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await templateApi.list({ brand_id: brandId, channel_type: 'SMS' })
      const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      return rows.filter((t: any) => t.is_active !== false)
    },
  })

  const { data: contactsPayload } = useQuery({
    queryKey: ['contacts-sms-picker'],
    queryFn: async () => {
      const res = await contactApi.list({ channel: 'SMS', limit: 50 })
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
      points.find((p: any) => p.channel_type === 'SMS' && p.is_primary) ||
      points.find((p: any) => p.channel_type === 'SMS') ||
      points.find((p: any) => p.channel_type === 'WHATSAPP') ||
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
    setMessageContent(tpl.plain_text_content || tpl.body || '')
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
    queryKey: ['sms-preview', messageContent, templateId, variables, recipient, brandId],
    queryFn: async () => {
      const res = await smsApi.preview({
        messageContent,
        templateId: templateId || undefined,
        templateVariables: variables,
        recipient: recipient || undefined,
        brandId: brandId ? Number(brandId) : undefined,
      })
      return res.data?.data
    },
    enabled: Boolean(messageContent || templateId),
  })

  const preview = previewQuery.data
  const preference = preview?.preference
  const canQueue =
    Boolean(brandId && senderIdentityId && (recipient || primaryPhone) && messageContent.trim()) &&
    preview?.canSend !== false &&
    (preference ? preference.eligible : true)

  const blockReason = useMemo(() => {
    if (!recipient && !primaryPhone) return 'Alıcı telefon numarası gerekli'
    if (preference && !preference.eligible) {
      return preference.reason || 'SMS için OPTED_IN izin gerekli'
    }
    if (preview?.lengthError) return preview.lengthError
    if (!senderIdentityId) return 'SMS gönderen kimliği seçin'
    return null
  }, [recipient, primaryPhone, preference, preview, senderIdentityId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!canQueue) {
      setError(blockReason || 'Gönderim uygun değil')
      return
    }
    setSending(true)
    try {
      const res = await smsApi.send({
        brandId: Number(brandId),
        senderIdentityId: Number(senderIdentityId),
        recipient,
        contactPointId: primaryPhone?.id,
        templateId: templateId ? Number(templateId) : undefined,
        messageContent,
        templateVariables: variables,
        idempotencyKey: idempotencyRef.current,
      })
      if (res.data?.deduplicated) {
        setNotice('Bu SMS daha önce kuyruğa alınmış')
      } else {
        setNotice(res.data?.message || 'SMS kuyruğa alındı')
        idempotencyRef.current = newIdempotencyKey()
      }
      window.setTimeout(() => navigate('/outbound'), 800)
    } catch (err: any) {
      setError(err.response?.data?.error || 'SMS kuyruğa alınamadı')
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
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">SMS Yaz</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} SMS kuyruğu — düz metin, izin kontrolü, Netgsm üzerinden gönderim.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/compose')}
          className="text-sm text-ink-soft underline"
        >
          E-posta compose
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}
      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {!connectionsLoading && !hasActiveSmsChannel ? (
        <div className="mc-panel mc-panel-asymmetric p-10 text-center max-w-lg mx-auto">
          <MessageSquare className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium text-lg">Henüz aktif bir SMS kanalınız bulunmuyor.</p>
          <p className="text-sm text-ink-soft mt-2 mb-5">
            Gönderim yapmadan önce Kanal Bağlantıları üzerinden SMS kanalını bağlayın.
          </p>
          <button
            type="button"
            onClick={() => navigate('/channels/sms/setup')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-signal text-white text-sm font-medium"
          >
            <Cable className="w-4 h-4" />
            SMS Kanalını Bağla
          </button>
        </div>
      ) : (
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
              <span className="text-xs text-ink-faint uppercase tracking-wide">SMS gönderen kimliği</span>
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
                    {s.display_name || s.sender_value} ({s.sender_value})
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
              <span className="text-xs text-ink-faint uppercase tracking-wide">Telefon (E.164)</span>
              <input
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                placeholder="+905..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-xs text-ink-faint uppercase tracking-wide">SMS şablonu</span>
            <select
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!brandId}
            >
              <option value="">Şablonsuz</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {declaredVars.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
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
            </div>
          )}

          <label className="block text-sm">
            <span className="text-xs text-ink-faint uppercase tracking-wide">Mesaj</span>
            <textarea
              className="mt-1 w-full min-h-[160px] px-3 py-2.5 rounded-xl bg-canvas-soft text-sm font-mono"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={!canQueue || sending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Kuyruğa alınıyor…' : 'Kuyruğa Al'}
          </button>
          {!canQueue && blockReason && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {blockReason}
            </p>
          )}
        </div>

        <aside className="mc-panel mc-panel-asymmetric p-4 h-fit space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <MessageSquare className="w-4 h-4 text-signal" />
            <span className="text-sm font-medium">Canlı ölçüm</span>
          </div>
          <div className="text-sm space-y-1.5">
            <p>
              Karakter: <strong>{preview?.characterCount ?? messageContent.length}</strong>
            </p>
            <p>
              Kodlama: <strong>{preview?.encoding || '—'}</strong>
            </p>
            <p>
              Tahmini parça: <strong>{preview?.segmentCount ?? '—'}</strong>
            </p>
            <p className="text-xs text-ink-faint">Ücret hesabı gösterilmiyor (provider maliyeti bilinmiyor).</p>
          </div>
          <div className="pt-2 border-t border-canvas-line">
            <p className="text-xs uppercase tracking-wide text-ink-faint mb-1">İletişim izni</p>
            {preference ? (
              <p className={`text-sm ${preference.eligible ? 'text-emerald-700' : 'text-red-600'}`}>
                {preference.status}
                {!preference.eligible && preference.reason ? ` — ${preference.reason}` : ''}
              </p>
            ) : (
              <p className="text-sm text-ink-soft">Numara girildiğinde kontrol edilir</p>
            )}
          </div>
        </aside>
      </form>
      )}
    </div>
  )
}
