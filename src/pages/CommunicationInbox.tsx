import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  UserRound,
} from 'lucide-react'
import {
  brandApi,
  conversationsApi,
  mailApi,
  senderIdentityApi,
  smsApi,
  templateApi,
  whatsappApi,
} from '../services/api'
import { useAuthStore } from '../store/authStore'
import { APP_DISPLAY_NAME } from '../config/app'

type FilterKey = 'all' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'unread' | 'waiting' | 'mine' | 'archived'

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function newIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const statusLabel: Record<string, string> = {
  OPEN: 'Açık',
  WAITING_REPLY: 'Cevap bekliyor',
  RESOLVED: 'Çözüldü',
  ARCHIVED: 'Arşiv',
}

const priorityLabel: Record<string, string> = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
}

export default function CommunicationInbox() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canReply = hasPermission('CONVERSATION_REPLY')
  const canAssign = hasPermission('CONVERSATION_ASSIGN')
  const canNote = hasPermission('INTERNAL_NOTE_CREATE')
  const canSendEmail = hasPermission('EMAIL_SEND')
  const canSendSms = hasPermission('SMS_SEND')
  const canSendWa = hasPermission('WHATSAPP_SEND')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [brandFilter, setBrandFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
  const [waMode, setWaMode] = useState<'TEMPLATE' | 'TEXT'>('TEMPLATE')
  const [templateId, setTemplateId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const idempotencyRef = useRef(newIdempotencyKey('inbox'))

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { limit: 50 }
    if (filter === 'EMAIL' || filter === 'SMS' || filter === 'WHATSAPP') params.channel = filter
    if (filter === 'unread') params.unread = '1'
    if (filter === 'waiting') params.waiting = '1'
    if (filter === 'archived') params.archived = '1'
    if (filter === 'mine' && user?.id) params.assignedUserId = user.id
    if (brandFilter) params.brandId = Number(brandFilter)
    if (search.trim()) params.q = search.trim()
    return params
  }, [filter, brandFilter, search, user?.id])

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: conversationsPayload, isLoading } = useQuery({
    queryKey: ['conversations', listParams],
    queryFn: async () => (await conversationsApi.list(listParams)).data,
    refetchInterval: 8000,
  })
  const conversations = Array.isArray(conversationsPayload?.data)
    ? conversationsPayload.data
    : []

  const selected = conversations.find((c: any) => c.id === selectedId) || null

  const { data: detail } = useQuery({
    queryKey: ['conversation', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await conversationsApi.get(selectedId!)).data?.data,
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['conversation-messages', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const res = await conversationsApi.messages(selectedId!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    refetchInterval: 5000,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['conversation-notes', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const res = await conversationsApi.notes(selectedId!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const channelType = detail?.channel_type || selected?.channel_type || 'EMAIL'
  const brandId = detail?.brand_id || selected?.brand_id

  const { data: senders = [] } = useQuery({
    queryKey: ['inbox-senders', brandId, channelType],
    enabled: Boolean(brandId && channelType),
    queryFn: async () => {
      const res = await senderIdentityApi.list({
        brand_id: brandId,
        channel_type: channelType,
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((s: any) => s.is_active !== false && s.is_verified !== false)
    },
  })

  const { data: waTemplates = [] } = useQuery({
    queryKey: ['inbox-wa-templates', brandId],
    enabled: channelType === 'WHATSAPP' && Boolean(brandId),
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

  useEffect(() => {
    if (!selectedId) return
    conversationsApi.markRead(selectedId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })
  }, [selectedId, queryClient])

  useEffect(() => {
    if (detail?.subject) setReplySubject(detail.subject.startsWith('Re:') ? detail.subject : `Re: ${detail.subject}`)
    else setReplySubject('')
    setReplyText('')
    setTemplateId('')
    setWaMode('TEMPLATE')
    setError('')
    setNotice('')
    if (senders[0]) setSenderIdentityId(String(senders[0].id))
  }, [selectedId, detail?.id])

  useEffect(() => {
    if (senders[0] && !senderIdentityId) setSenderIdentityId(String(senders[0].id))
  }, [senders, senderIdentityId])

  const invalidateConversation = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] })
    queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedId] })
    queryClient.invalidateQueries({ queryKey: ['conversation-notes', selectedId] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => conversationsApi.setStatus(selectedId!, { status }),
    onSuccess: invalidateConversation,
  })

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => conversationsApi.setPriority(selectedId!, { priority }),
    onSuccess: invalidateConversation,
  })

  const assignMutation = useMutation({
    mutationFn: (assignedUserId: number | null) =>
      conversationsApi.setAssignment(selectedId!, { assignedUserId }),
    onSuccess: invalidateConversation,
  })

  const archiveMutation = useMutation({
    mutationFn: () => conversationsApi.archive(selectedId!),
    onSuccess: () => {
      setSelectedId(null)
      invalidateConversation()
    },
  })

  const noteMutation = useMutation({
    mutationFn: () => conversationsApi.addNote(selectedId!, { content: noteText }),
    onSuccess: () => {
      setNoteText('')
      invalidateConversation()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Not eklenemedi'),
  })

  const onSendReply = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!detail || !brandId || !senderIdentityId) {
      setError('Marka ve gönderen kimliği gerekli')
      return
    }
    const recipient = detail.participant_value || detail.normalized_participant_value
    if (!recipient) {
      setError('Alıcı bulunamadı')
      return
    }

    try {
      if (channelType === 'EMAIL') {
        if (!replySubject.trim() || !replyText.trim()) {
          setError('Konu ve mesaj gerekli')
          return
        }
        await mailApi.sendMail({
          brandId: Number(brandId),
          senderIdentityId: Number(senderIdentityId),
          to: recipient,
          subject: replySubject,
          htmlContent: `<p>${replyText.replace(/\n/g, '<br/>')}</p>`,
          plainTextContent: replyText,
          conversationId: detail.id,
          idempotencyKey: idempotencyRef.current,
        })
      } else if (channelType === 'SMS') {
        if (!replyText.trim()) {
          setError('SMS metni gerekli')
          return
        }
        await smsApi.send({
          brandId: Number(brandId),
          senderIdentityId: Number(senderIdentityId),
          recipient,
          messageContent: replyText,
          conversationId: detail.id,
          idempotencyKey: idempotencyRef.current,
        })
      } else {
        if (waMode === 'TEMPLATE' && !templateId) {
          setError('Onaylı şablon seçin')
          return
        }
        if (waMode === 'TEXT' && !replyText.trim()) {
          setError('Mesaj metni gerekli')
          return
        }
        await whatsappApi.send({
          brandId: Number(brandId),
          senderIdentityId: Number(senderIdentityId),
          recipient,
          messageMode: waMode,
          templateId: waMode === 'TEMPLATE' ? Number(templateId) : undefined,
          messageContent: waMode === 'TEXT' ? replyText : undefined,
          conversationId: detail.id,
          idempotencyKey: idempotencyRef.current,
        })
      }
      setNotice('Yanıt kuyruğa alındı')
      setReplyText('')
      idempotencyRef.current = newIdempotencyKey('inbox')
      invalidateConversation()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gönderim kuyruğa alınamadı')
      idempotencyRef.current = newIdempotencyKey('inbox')
    }
  }

  const filters: { key: FilterKey; label: string; icon: typeof Inbox }[] = [
    { key: 'all', label: 'Tümü', icon: Inbox },
    { key: 'EMAIL', label: 'E-posta', icon: Mail },
    { key: 'SMS', label: 'SMS', icon: MessageSquare },
    { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
    { key: 'unread', label: 'Okunmamış', icon: Inbox },
    { key: 'waiting', label: 'Cevap bekleyen', icon: Send },
    { key: 'mine', label: 'Bana atanan', icon: UserRound },
    { key: 'archived', label: 'Arşiv', icon: Archive },
  ]

  const channelBadge = (type: string) => {
    if (type === 'WHATSAPP') return 'bg-signal/15 text-signal-deep'
    if (type === 'SMS') return 'bg-dock/10 text-dock'
    return 'bg-canvas-line/60 text-ink-soft'
  }

  return (
    <div className="mc-shell pt-1 pb-4 h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <div className="mb-4 shrink-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Birleşik</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">İletişim Kutusu</h1>
        <p className="text-sm text-ink-soft mt-1">
          {APP_DISPLAY_NAME} e-posta, SMS ve WhatsApp konuşmalarını tek çalışma alanında birleştirir.
        </p>
      </div>

      {(error || notice) && (
        <div
          className={`mb-3 p-3 rounded-xl text-sm shrink-0 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-3 min-h-0 flex-1">
        {/* Left filters */}
        <aside className="mc-panel mc-panel-asymmetric w-full xl:w-56 shrink-0 p-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint mb-2 px-1">Kanallar</p>
          <div className="space-y-1">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  filter === key
                    ? 'bg-dock text-white'
                    : 'text-ink-soft hover:bg-canvas-soft'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint mt-4 mb-2 px-1">Marka</p>
          <select
            className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="">Tüm markalar</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </aside>

        {/* Middle list */}
        <section className="mc-panel mc-panel-asymmetric w-full xl:w-[22rem] shrink-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-canvas-line">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-canvas-soft text-sm"
                placeholder="Ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-canvas-line/40 rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-soft">Konuşma yok</div>
            ) : (
              <ul className="divide-y divide-canvas-line/70">
                {conversations.map((c: any) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedId === c.id ? 'bg-signal/10' : 'hover:bg-canvas-soft/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {c.brand_name && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md text-white truncate max-w-[6rem]"
                            style={{ backgroundColor: c.brand_accent_color || '#1a2332' }}
                          >
                            {c.brand_name}
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ${channelBadge(
                            c.channel_type
                          )}`}
                        >
                          {c.channel_type}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="ml-auto text-[10px] font-medium bg-signal text-white rounded-full px-1.5 py-0.5">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-ink truncate">
                        {c.contact_display_name || c.participant_value || 'Bilinmeyen'}
                      </p>
                      <p className="text-xs text-ink-soft truncate mt-0.5">
                        {c.subject || statusLabel[c.status] || c.status}
                      </p>
                      <p className="text-[11px] text-ink-faint mt-1">{formatTime(c.last_message_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right detail */}
        <section className="mc-panel mc-panel-asymmetric flex-1 min-w-0 overflow-hidden flex flex-col">
          {!detail ? (
            <div className="flex-1 flex items-center justify-center text-ink-soft text-sm p-8">
              Bir konuşma seçin
            </div>
          ) : (
            <>
              <header className="p-4 border-b border-canvas-line shrink-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg text-ink truncate">
                      {detail.contact_display_name || detail.participant_value}
                    </h2>
                    <p className="text-xs text-ink-soft mt-0.5 truncate">
                      {detail.subject || 'Konu yok'} · {detail.channel_type}
                      {detail.brand_name ? ` · ${detail.brand_name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="px-2 py-1.5 rounded-lg bg-canvas-soft text-xs"
                      value={detail.status}
                      onChange={(e) => statusMutation.mutate(e.target.value)}
                    >
                      {Object.entries(statusLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <select
                      className="px-2 py-1.5 rounded-lg bg-canvas-soft text-xs"
                      value={detail.priority}
                      onChange={(e) => priorityMutation.mutate(e.target.value)}
                    >
                      {Object.entries(priorityLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-2 py-1.5 rounded-lg bg-canvas-soft text-xs"
                      disabled={!canAssign}
                      onClick={() =>
                        assignMutation.mutate(
                          detail.assigned_user_id === user?.id ? null : user?.id || null
                        )
                      }
                    >
                      {detail.assigned_user_id === user?.id ? 'Atamayı kaldır' : 'Bana ata'}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1.5 rounded-lg bg-dock text-white text-xs"
                      onClick={() => archiveMutation.mutate()}
                    >
                      Arşivle
                    </button>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-canvas-soft/40">
                {messages.map((m: any) => {
                  const outbound = m.direction === 'OUTBOUND'
                  return (
                    <div
                      key={m.sourceId}
                      className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm animate-[fadeIn_0.25s_ease] ${
                          outbound
                            ? 'bg-dock text-white rounded-br-md'
                            : 'bg-white border border-canvas-line text-ink rounded-bl-md'
                        }`}
                      >
                        {m.subject && (
                          <p className={`text-[11px] mb-1 ${outbound ? 'text-white/70' : 'text-ink-faint'}`}>
                            {m.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {m.content || '(İçerik yok)'}
                        </p>
                        <div
                          className={`flex flex-wrap gap-2 mt-1.5 text-[10px] ${
                            outbound ? 'text-white/60' : 'text-ink-faint'
                          }`}
                        >
                          <span>{formatTime(m.sentAt || m.receivedAt)}</span>
                          {m.status && <span>{m.status}</span>}
                          {m.providerMessageId && (
                            <span className="truncate max-w-[8rem]">{m.providerMessageId}</span>
                          )}
                          {m.safeErrorMessage && (
                            <span className="text-red-300">{m.safeErrorMessage}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-canvas-line p-3 shrink-0 space-y-3 bg-white/80">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">İç notlar</p>
                  <div className="max-h-20 overflow-y-auto space-y-1 mb-2">
                    {notes.map((n: any) => (
                      <p key={n.id} className="text-xs text-ink-soft">
                        <span className="text-ink-faint">{n.user_name || n.user_email}: </span>
                        {n.content}
                      </p>
                    ))}
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!canNote) return
                      if (noteText.trim()) noteMutation.mutate()
                    }}
                  >
                    <input
                      className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                      placeholder="Yalnızca ekibe görünür not…"
                      value={noteText}
                      disabled={!canNote}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!canNote}
                      className="px-3 py-2 rounded-xl bg-canvas-line text-xs disabled:opacity-50"
                    >
                      Not
                    </button>
                  </form>
                </div>

                {canReply &&
                ((channelType === 'EMAIL' && canSendEmail) ||
                  (channelType === 'SMS' && canSendSms) ||
                  (channelType === 'WHATSAPP' && canSendWa)) ? (
                <form onSubmit={onSendReply} className="space-y-2">
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                    value={senderIdentityId}
                    onChange={(e) => setSenderIdentityId(e.target.value)}
                    required
                  >
                    <option value="">Gönderen kimliği</option>
                    {senders.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name} · {s.sender_value}
                      </option>
                    ))}
                  </select>

                  {channelType === 'EMAIL' && (
                    <input
                      className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                      placeholder="Konu"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                    />
                  )}

                  {channelType === 'WHATSAPP' && (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                        value={waMode}
                        onChange={(e) => setWaMode(e.target.value as 'TEMPLATE' | 'TEXT')}
                      >
                        <option value="TEMPLATE">Onaylı şablon</option>
                        <option value="TEXT">Serbest metin</option>
                      </select>
                      {waMode === 'TEMPLATE' && (
                        <select
                          className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                          value={templateId}
                          onChange={(e) => setTemplateId(e.target.value)}
                        >
                          <option value="">Şablon seçin</option>
                          {waTemplates.map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {(channelType !== 'WHATSAPP' || waMode === 'TEXT') && (
                    <textarea
                      className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm min-h-[72px]"
                      placeholder={
                        channelType === 'SMS'
                          ? 'SMS yanıtı (OPTED_IN gerekli)…'
                          : 'Yanıt yazın…'
                      }
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                  )}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-signal text-white text-sm hover:bg-signal-deep transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kuyruğa al
                  </button>
                </form>
                ) : (
                  <p className="text-xs text-ink-faint">
                    Bu konuşmaya yanıt gönderme yetkiniz yok (görüntüleme modu).
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
