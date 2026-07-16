import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Monitor, Smartphone, Save, Send } from 'lucide-react'
import {
  brandApi,
  draftApi,
  mailApi,
  senderIdentityApi,
  templateApi,
} from '../services/api'
import SimpleHtmlEditor from '../components/compose/SimpleHtmlEditor'
import { APP_DISPLAY_NAME } from '../config/app'

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

function parseVarList(variables: unknown): string[] {
  if (!Array.isArray(variables)) return []
  return variables
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'name' in item) return String((item as any).name).trim()
      return ''
    })
    .filter(Boolean)
}

export default function Compose() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const draftIdParam = searchParams.get('draftId')
  const toParam = searchParams.get('to')

  const [brandId, setBrandId] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [plainTextContent, setPlainTextContent] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [declaredVars, setDeclaredVars] = useState<string[]>([])
  const [draftId, setDraftId] = useState<number | null>(draftIdParam ? Number(draftIdParam) : null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [queueNotice, setQueueNotice] = useState('')
  const idempotencyRef = useRef<string>('')
  const dirtyRef = useRef(false)
  const hydratedRef = useRef(false)
  const lastSavedSnapshot = useRef('')

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities-eligible', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await senderIdentityApi.list({
        brand_id: brandId,
        channel_type: 'EMAIL',
        eligible_for_send: true,
      })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-email', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await templateApi.list({ brand_id: brandId, channel_type: 'EMAIL' })
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      return rows.filter((t: any) => t.is_active !== false)
    },
  })

  const selectedSender = useMemo(
    () => senders.find((s: any) => String(s.id) === String(senderIdentityId)),
    [senders, senderIdentityId]
  )

  const selectedBrand = useMemo(
    () => brands.find((b: any) => String(b.id) === String(brandId)),
    [brands, brandId]
  )

  useEffect(() => {
    if (!draftIdParam && toParam) {
      setTo(toParam)
    }
  }, [draftIdParam, toParam])

  useEffect(() => {
    if (!draftIdParam) {
      hydratedRef.current = true
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await draftApi.get(Number(draftIdParam))
        const d = res.data?.data
        if (!d || cancelled) return
        setDraftId(d.id)
        setBrandId(d.brand_id ? String(d.brand_id) : '')
        setSenderIdentityId(d.sender_identity_id ? String(d.sender_identity_id) : '')
        setTemplateId(d.template_id ? String(d.template_id) : '')
        setTo(d.to_address || '')
        setCc(d.cc_address || '')
        setBcc(d.bcc_address || '')
        setShowCc(Boolean(d.cc_address))
        setShowBcc(Boolean(d.bcc_address))
        setSubject(d.subject || '')
        setHtmlContent(d.html_content || d.body || '')
        setPlainTextContent(d.plain_text_content || '')
        setReplyTo(d.reply_to || '')
        const vars =
          typeof d.template_variables === 'object' && d.template_variables
            ? d.template_variables
            : {}
        setVariables(vars)
        setDeclaredVars(Object.keys(vars))
        lastSavedSnapshot.current = JSON.stringify({
          brandId: d.brand_id,
          senderIdentityId: d.sender_identity_id,
          templateId: d.template_id,
          to: d.to_address,
          cc: d.cc_address,
          bcc: d.bcc_address,
          subject: d.subject,
          htmlContent: d.html_content,
          plainTextContent: d.plain_text_content,
          replyTo: d.reply_to,
          variables: vars,
        })
        dirtyRef.current = false
      } catch {
        setError('Taslak açılamadı')
      } finally {
        hydratedRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [draftIdParam])

  useEffect(() => {
    if (selectedSender?.reply_to && !replyTo) {
      setReplyTo(selectedSender.reply_to)
    }
  }, [selectedSender, replyTo])

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        brandId,
        senderIdentityId,
        templateId,
        to,
        cc,
        bcc,
        subject,
        htmlContent,
        plainTextContent,
        replyTo,
        variables,
      }),
    [
      brandId,
      senderIdentityId,
      templateId,
      to,
      cc,
      bcc,
      subject,
      htmlContent,
      plainTextContent,
      replyTo,
      variables,
    ]
  )

  useEffect(() => {
    if (!hydratedRef.current) return
    if (snapshot !== lastSavedSnapshot.current) dirtyRef.current = true
  }, [snapshot])

  const buildDraftPayload = () => ({
    brand_id: brandId ? Number(brandId) : null,
    channel_type: 'EMAIL',
    sender_identity_id: senderIdentityId ? Number(senderIdentityId) : null,
    template_id: templateId ? Number(templateId) : null,
    to_address: to,
    cc_address: cc,
    bcc_address: bcc,
    subject,
    html_content: htmlContent,
    plain_text_content: plainTextContent,
    template_variables: variables,
    reply_to: replyTo || null,
    status: 'draft',
  })

  const saveDraft = async (silent = false) => {
    if (!brandId && !to && !subject && !htmlContent && !plainTextContent) return
    if (!dirtyRef.current && draftId) return

    setDraftStatus('saving')
    try {
      const payload = buildDraftPayload()
      if (draftId) {
        const res = await draftApi.update(draftId, payload)
        setDraftId(res.data?.data?.id || draftId)
      } else {
        const res = await draftApi.create(payload)
        const id = res.data?.data?.id
        if (id) {
          setDraftId(id)
          navigate(`/compose?draftId=${id}`, { replace: true })
        }
      }
      lastSavedSnapshot.current = snapshot
      dirtyRef.current = false
      setDraftStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      if (!silent) setError('')
    } catch (err: any) {
      setDraftStatus('error')
      if (!silent) setError(err.response?.data?.error || 'Taslak kaydedilemedi')
    }
  }

  useEffect(() => {
    if (!hydratedRef.current) return
    const timer = window.setTimeout(() => {
      if (dirtyRef.current) saveDraft(true)
    }, 4000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot])

  const refreshPreview = async () => {
    try {
      const res = await templateApi.render({
        templateId: templateId ? Number(templateId) : undefined,
        subject,
        htmlContent,
        plainTextContent,
        variables: declaredVars,
        templateVariables: variables,
      })
      setPreview(res.data?.data || null)
    } catch {
      setPreview(null)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshPreview()
    }, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, htmlContent, plainTextContent, variables, templateId, declaredVars])

  const applyTemplate = async (id: string) => {
    setTemplateId(id)
    if (!id) {
      setDeclaredVars([])
      return
    }
    try {
      const res = await templateApi.get(Number(id))
      const tpl = res.data?.data
      if (!tpl) return
      if (tpl.sender_identity_id) setSenderIdentityId(String(tpl.sender_identity_id))
      if (tpl.subject) setSubject(tpl.subject)
      if (tpl.content) setHtmlContent(tpl.content)
      if (tpl.plain_text_content) setPlainTextContent(tpl.plain_text_content)
      const vars = parseVarList(tpl.variables)
      setDeclaredVars(vars)
      setVariables((prev) => {
        const next: Record<string, string> = {}
        vars.forEach((name) => {
          next[name] = prev[name] || ''
        })
        return next
      })
      dirtyRef.current = true
    } catch (err: any) {
      setError(err.response?.data?.error || 'Şablon yüklenemedi')
    }
  }

  const unknownVars = preview?.unknownInContent || []
  const missingVars = preview?.missingRequired || []

  const sendMutation = useMutation({
    mutationFn: async (allowEmptySubject: boolean) => {
      if (!idempotencyRef.current) {
        idempotencyRef.current =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `send-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      }
      return mailApi.sendMail({
        senderIdentityId: Number(senderIdentityId),
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        htmlContent,
        plainTextContent,
        replyTo: replyTo || undefined,
        templateId: templateId ? Number(templateId) : undefined,
        templateVariables: variables,
        draftId: draftId || undefined,
        allowEmptySubject,
        idempotencyKey: idempotencyRef.current,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      queryClient.invalidateQueries({ queryKey: ['mails'] })
      queryClient.invalidateQueries({ queryKey: ['outbound-messages'] })
      const data = res.data || {}
      if (data.queued || data.status === 'QUEUED' || data.status === 'SCHEDULED') {
        setQueueNotice(
          data.message ||
            'Gönderim kuyruğuna alındı. Teslim edildi sayılmaz; durumu Gönderim Merkezi’nden izleyin.'
        )
        setSending(false)
        window.setTimeout(() => navigate('/outbound'), 900)
        return
      }
      if (data.status === 'SENT' || data.messageId) {
        navigate('/outbound')
        return
      }
      setQueueNotice(data.message || 'Gönderim isteği alındı')
      setSending(false)
      navigate('/outbound')
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Gönderim başarısız')
      setSending(false)
      // Keep same idempotency key so retry of same click window stays safe;
      // generate new key only after user edits or explicit new send session
    },
  })

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setQueueNotice('')
    if (!senderIdentityId) {
      setError('Gönderen kimliği seçin')
      return
    }
    if (!to.trim()) {
      setError('En az bir alıcı gerekli')
      return
    }
    if (missingVars.length > 0) {
      setError(`Eksik değişkenler: ${missingVars.join(', ')}`)
      return
    }
    if (!subject.trim()) {
      const ok = window.confirm('Konu boş. Yine de göndermek istiyor musunuz?')
      if (!ok) return
    }
    if (sending || sendMutation.isPending) return
    setSending(true)
    try {
      await saveDraft(true)
      await sendMutation.mutateAsync(!subject.trim())
    } catch {
      setSending(false)
    }
  }

  const draftStatusLabel =
    draftStatus === 'saving'
      ? 'Kaydediliyor…'
      : draftStatus === 'saved'
        ? 'Taslak kaydedildi'
        : draftStatus === 'error'
          ? 'Taslak kaydı başarısız'
          : dirtyRef.current
            ? 'Kaydedilmemiş değişiklikler'
            : 'Hazır'

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Yazım</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Yeni Mesaj</h1>
        <p className="text-sm text-ink-soft mt-1">
          {APP_DISPLAY_NAME} içinde marka ve doğrulanmış gönderici ile e-posta oluşturun.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}
      {queueNotice && !error && (
        <div className="mb-4 p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-sm text-cyan-800">
          {queueNotice}
        </div>
      )}

      <form onSubmit={handleSend} className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="mc-panel mc-panel-asymmetric p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="flex-1 space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Alıcı</span>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                placeholder="ornek@firma.com, diger@firma.com"
                required
              />
            </label>
            <div className="flex gap-2 pt-5">
              {!showCc && (
                <button type="button" className="text-xs text-signal-deep" onClick={() => setShowCc(true)}>
                  CC
                </button>
              )}
              {!showBcc && (
                <button type="button" className="text-xs text-signal-deep" onClick={() => setShowBcc(true)}>
                  BCC
                </button>
              )}
            </div>
          </div>

          {showCc && (
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">CC</span>
              <input value={cc} onChange={(e) => setCc(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" />
            </label>
          )}
          {showBcc && (
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">BCC</span>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Konu</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Konu {{siparis_no}}"
            />
          </label>

          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">HTML içerik</span>
            <SimpleHtmlEditor value={htmlContent} onChange={setHtmlContent} />
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Düz metin alternatifi</span>
            <textarea
              value={plainTextContent}
              onChange={(e) => setPlainTextContent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[90px]"
            />
          </label>

          {declaredVars.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Değişkenler</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {declaredVars.map((name) => (
                  <label key={name} className="space-y-1">
                    <span className="text-xs text-ink-soft">{`{{${name}}}`}</span>
                    <input
                      value={variables[name] || ''}
                      onChange={(e) => setVariables({ ...variables, [name]: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {unknownVars.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Bilinmeyen değişkenler: {unknownVars.map((v: string) => `{{${v}}}`).join(', ')}
            </div>
          )}
          {missingVars.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              Eksik zorunlu değişkenler: {missingVars.join(', ')}
            </div>
          )}

          <p className="text-xs text-ink-faint">Taslak durumu: {draftStatusLabel}</p>
        </section>

        <aside className="space-y-4">
          <section className="mc-panel mc-panel-asymmetric p-5 space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Marka</span>
              <select
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value)
                  setSenderIdentityId('')
                  setTemplateId('')
                  dirtyRef.current = true
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                required
              >
                <option value="">Marka seçin</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Gönderen kimliği</span>
              <select
                value={senderIdentityId}
                onChange={(e) => {
                  setSenderIdentityId(e.target.value)
                  dirtyRef.current = true
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                required
                disabled={!brandId}
              >
                <option value="">Gönderen seçin</option>
                {senders.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} · {s.sender_value}
                  </option>
                ))}
              </select>
              {brandId && senders.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Bu markada aktif, doğrulanmış ve hesaba bağlı gönderici yok.
                </p>
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Reply-To</span>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Şablon</span>
              <select
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                disabled={!brandId}
              >
                <option value="">Şablon yok</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => saveDraft(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              >
                <Save className="w-4 h-4" />
                Taslağı kaydet
              </button>
              <button
                type="submit"
                disabled={sending || sendMutation.isPending || missingVars.length > 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending || sendMutation.isPending ? 'Kuyruğa alınıyor…' : 'Gönder'}
              </button>
            </div>
          </section>

          <section className="mc-panel mc-panel-asymmetric p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Önizleme</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-lg ${previewMode === 'desktop' ? 'bg-dock text-white' : 'bg-canvas-soft text-ink-soft'}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-lg ${previewMode === 'mobile' ? 'bg-dock text-white' : 'bg-canvas-soft text-ink-soft'}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`mx-auto rounded-xl border border-canvas-line bg-white overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-[320px]' : 'w-full'
              }`}
            >
              <div className="px-3 py-2 border-b border-canvas-line text-xs space-y-1 bg-canvas-soft">
                <p>
                  <span className="text-ink-faint">Marka:</span> {selectedBrand?.name || '—'}
                </p>
                <p>
                  <span className="text-ink-faint">Gönderen:</span>{' '}
                  {selectedSender
                    ? `${selectedSender.display_name} <${selectedSender.sender_value}>`
                    : '—'}
                </p>
                <p>
                  <span className="text-ink-faint">Reply-To:</span> {replyTo || '—'}
                </p>
                <p>
                  <span className="text-ink-faint">Alıcı:</span> {to || '—'}
                </p>
                <p>
                  <span className="text-ink-faint">Konu:</span> {preview?.subject || subject || '—'}
                </p>
              </div>
              <div
                className="p-3 text-sm prose prose-sm max-w-none min-h-[160px]"
                dangerouslySetInnerHTML={{
                  __html: preview?.htmlContent || '<p class="text-ink-faint">Önizleme için içerik girin</p>',
                }}
              />
            </div>
          </section>
        </aside>
      </form>
    </div>
  )
}
