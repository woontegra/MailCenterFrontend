import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquare,
  Reply,
  Search,
  Send,
  UserRound,
} from 'lucide-react'
import ConversationMessageList from '../components/inbox/ConversationMessageList'
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
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
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
    refetchInterval: 4000,
  })
  const conversations = Array.isArray(conversationsPayload?.data)
    ? conversationsPayload.data
    : []

  const selected = conversations.find((c: any) => c.id === selectedId) || null

  const { data: detail } = useQuery({
    queryKey: ['conversation', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await conversationsApi.get(selectedId!)).data?.data,
    refetchInterval: selectedId ? 4000 : false,
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['conversation-messages', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const res = await conversationsApi.messages(selectedId!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    refetchInterval: 3000,
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
    setComposerOpen(false)
    setComposerExpanded(false)
  }, [selectedId])

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
    if (type === 'WHATSAPP') return 'bg-signal/10 text-signal-deep'
    if (type === 'SMS') return 'bg-dock/8 text-dock'
    return 'bg-canvas-line/50 text-ink-soft'
  }

  const channelLabel = (type: string) => {
    if (type === 'WHATSAPP') return 'WhatsApp'
    if (type === 'SMS') return 'SMS'
    return 'E-posta'
  }

  const controlClass =
    'h-9 px-3 rounded-lg bg-canvas-soft text-sm text-ink border border-canvas-line/50 hover:border-canvas-line transition-colors disabled:opacity-50'

  function conversationRowClass(isSelected: boolean, isUnread: boolean): string {
    const base = 'w-full text-left px-3 py-3 transition-colors border-l-[3px]'
    if (isSelected) {
      return `${base} bg-signal/12 border-l-signal ring-1 ring-inset ring-signal/20`
    }
    if (isUnread) {
      return `${base} border-l-signal/45 bg-white hover:bg-canvas-soft/70`
    }
    return `${base} border-l-transparent hover:bg-canvas-soft/55`
  }

  const activeConversation = detail || selected

  return (
    <div className="mc-shell pt-1 pb-3 h-[calc(100vh-4rem)] flex flex-col min-h-0 overflow-hidden">
      <div className="mb-3 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-signal-deep mb-0.5">Birleşik</p>
        <h1 className="font-display text-xl lg:text-2xl font-semibold text-ink">İletişim Kutusu</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          {APP_DISPLAY_NAME} e-posta, SMS ve WhatsApp konuşmalarını tek çalışma alanında birleştirir.
        </p>
      </div>

      {(error || notice) && (
        <div
          className={`mb-2 p-2.5 rounded-xl text-sm shrink-0 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(170px,190px)_minmax(340px,400px)_minmax(0,1fr)] gap-3 min-h-0 flex-1">
        {/* Left filters */}
        <aside className="mc-panel mc-panel-asymmetric w-full shrink-0 p-2.5 overflow-y-auto min-h-0 xl:max-h-full">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1.5 px-1">Kanallar</p>
          <div className="space-y-0.5">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                  filter === key
                    ? 'bg-dock text-white font-medium'
                    : 'text-ink-soft hover:bg-canvas-soft'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mt-3 mb-1.5 px-1">Marka</p>
          <select
            className="w-full px-2.5 py-1.5 rounded-lg bg-canvas-soft text-[13px] border border-canvas-line/50"
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
        <section className="mc-panel mc-panel-asymmetric w-full shrink-0 overflow-hidden flex flex-col min-h-0 xl:max-h-full">
          <div className="p-2.5 border-b border-canvas-line shrink-0 bg-white/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-canvas-soft text-sm border border-transparent focus:border-canvas-line"
                placeholder="Ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-3 space-y-2 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[4.5rem] bg-canvas-line/40 rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-soft">Konuşma yok</div>
            ) : (
              <ul>
                {conversations.map((c: any) => {
                  const unread = Number(c.unread_count || 0) > 0
                  const isSelected = selectedId === c.id
                  return (
                    <li key={c.id} className="border-b border-canvas-line/40 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={conversationRowClass(isSelected, unread)}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p
                                className={`text-[15px] truncate leading-tight ${
                                  unread
                                    ? 'font-semibold text-ink'
                                    : isSelected
                                      ? 'font-semibold text-ink'
                                      : 'font-medium text-ink'
                                }`}
                              >
                                {c.contact_display_name || c.participant_value || 'Bilinmeyen'}
                              </p>
                              <div className="shrink-0 flex flex-col items-end gap-1">
                                <time className="text-xs text-ink-soft whitespace-nowrap">
                                  {formatTime(c.last_message_at)}
                                </time>
                                {unread && (
                                  <span className="min-w-[1.35rem] h-5 flex items-center justify-center text-[11px] font-semibold bg-signal text-white rounded-full px-1.5">
                                    {c.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p
                              className={`text-sm truncate ${
                                unread ? 'font-medium text-ink' : 'text-ink-soft'
                              }`}
                            >
                              {c.subject || statusLabel[c.status] || c.status}
                            </p>
                            <p className="text-sm text-ink-faint line-clamp-2 mt-1 leading-snug">
                              {c.last_message_preview || '—'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 min-w-0">
                              {c.brand_name && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded text-white truncate max-w-[6rem]"
                                  style={{ backgroundColor: c.brand_accent_color || '#1a2332' }}
                                >
                                  {c.brand_name}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${channelBadge(
                                  c.channel_type
                                )}`}
                              >
                                {channelLabel(c.channel_type)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right detail */}
        <section className="mc-panel mc-panel-asymmetric flex-1 min-w-0 overflow-hidden flex flex-col min-h-0 xl:max-h-full">
          {!selectedId || !activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-soft text-sm p-8">
              <Inbox className="w-10 h-10 text-ink-faint/40 mb-3" />
              <p>Bir konuşma seçin</p>
            </div>
          ) : (
            <>
              <header className="px-5 py-3.5 border-b border-canvas-line shrink-0 bg-white/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl lg:text-2xl font-semibold text-ink truncate">
                      {activeConversation.contact_display_name || activeConversation.participant_value}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm text-ink-soft">
                      <span className="truncate">{activeConversation.participant_value}</span>
                      <span className="text-ink-faint">·</span>
                      <span>{channelLabel(activeConversation.channel_type)}</span>
                      {activeConversation.brand_name && (
                        <>
                          <span className="text-ink-faint">·</span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white"
                            style={{
                              backgroundColor: activeConversation.brand_accent_color || '#1a2332',
                            }}
                          >
                            {activeConversation.brand_name}
                          </span>
                        </>
                      )}
                    </div>
                    {activeConversation.subject && (
                      <p className="text-sm text-ink-soft mt-1.5 truncate font-medium">
                        {activeConversation.subject}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <select
                      className={controlClass}
                      value={activeConversation.status}
                      onChange={(e) => statusMutation.mutate(e.target.value)}
                      disabled={!detail}
                    >
                      {Object.entries(statusLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <select
                      className={controlClass}
                      value={activeConversation.priority}
                      onChange={(e) => priorityMutation.mutate(e.target.value)}
                      disabled={!detail}
                    >
                      {Object.entries(priorityLabel).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={controlClass}
                      disabled={!canAssign || !detail}
                      onClick={() =>
                        assignMutation.mutate(
                          activeConversation.assigned_user_id === user?.id ? null : user?.id || null
                        )
                      }
                    >
                      {activeConversation.assigned_user_id === user?.id ? 'Atamayı kaldır' : 'Bana ata'}
                    </button>
                    <button
                      type="button"
                      className={`${controlClass} bg-dock text-white hover:border-dock`}
                      disabled={!detail}
                      onClick={() => archiveMutation.mutate()}
                    >
                      Arşivle
                    </button>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-3 pb-4 bg-canvas-soft/20">
                <ConversationMessageList messages={messages} channelType={channelType} />
              </div>

              <div className="border-t border-canvas-line px-4 py-2.5 shrink-0 bg-white/95 space-y-2">
                <div className="rounded-lg border border-canvas-line/80 bg-canvas-soft/30">
                  <button
                    type="button"
                    onClick={() => setNotesOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      İç notlar {notes.length > 0 ? `(${notes.length})` : ''}
                    </span>
                    {notesOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-ink-faint" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
                    )}
                  </button>
                  {notesOpen && notes.length > 0 && (
                    <div className="max-h-24 overflow-y-auto px-3 pb-2 space-y-1 border-t border-canvas-line/60">
                      {notes.map((n: any) => (
                        <p key={n.id} className="text-xs text-ink-soft leading-snug">
                          <span className="text-ink-faint font-medium">
                            {n.user_name || n.user_email}:{' '}
                          </span>
                          {n.content}
                        </p>
                      ))}
                    </div>
                  )}
                  <form
                    className="flex gap-2 px-3 pb-2.5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!canNote) return
                      if (noteText.trim()) noteMutation.mutate()
                    }}
                  >
                    <input
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white text-xs border border-canvas-line/60"
                      placeholder="Yalnızca ekibe görünür not…"
                      value={noteText}
                      disabled={!canNote}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!canNote}
                      className="px-2.5 py-1.5 rounded-lg bg-canvas-line text-xs disabled:opacity-50 shrink-0"
                    >
                      Not
                    </button>
                  </form>
                </div>

                {canReply &&
                ((channelType === 'EMAIL' && canSendEmail) ||
                  (channelType === 'SMS' && canSendSms) ||
                  (channelType === 'WHATSAPP' && canSendWa)) ? (
                  composerOpen ? (
                    <div className="rounded-lg border border-canvas-line/80 bg-white">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-canvas-line/60">
                        <span className="text-sm font-medium text-ink">Yanıt</span>
                        <button
                          type="button"
                          onClick={() => setComposerOpen(false)}
                          className="text-xs text-ink-soft hover:text-ink px-2 py-1 rounded-md hover:bg-canvas-soft transition-colors"
                        >
                          Kapat
                        </button>
                      </div>
                      <form onSubmit={onSendReply} className="p-3 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            className="w-full px-3 py-2 rounded-lg bg-canvas-soft text-sm border border-canvas-line/50"
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
                              className="w-full px-3 py-2 rounded-lg bg-canvas-soft text-sm border border-canvas-line/50"
                              placeholder="Konu"
                              value={replySubject}
                              onChange={(e) => setReplySubject(e.target.value)}
                            />
                          )}
                        </div>

                        {channelType === 'WHATSAPP' && (
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="flex-1 min-w-[8rem] px-3 py-2 rounded-lg bg-canvas-soft text-sm border border-canvas-line/50"
                              value={waMode}
                              onChange={(e) => setWaMode(e.target.value as 'TEMPLATE' | 'TEXT')}
                            >
                              <option value="TEMPLATE">Onaylı şablon</option>
                              <option value="TEXT">Serbest metin</option>
                            </select>
                            {waMode === 'TEMPLATE' && (
                              <select
                                className="flex-1 min-w-[8rem] px-3 py-2 rounded-lg bg-canvas-soft text-sm border border-canvas-line/50"
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
                          <div>
                            <textarea
                              className={`w-full px-3 py-2.5 rounded-lg bg-canvas-soft text-[15px] border border-canvas-line/50 resize-y leading-relaxed transition-[min-height] ${
                                composerExpanded
                                  ? 'min-h-[180px] max-h-[320px]'
                                  : 'min-h-[96px] max-h-[140px]'
                              }`}
                              placeholder={
                                channelType === 'SMS'
                                  ? 'SMS yanıtı (OPTED_IN gerekli)…'
                                  : 'Yanıt yazın…'
                              }
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="flex justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => setComposerExpanded((v) => !v)}
                                className="text-xs text-ink-soft hover:text-ink px-1"
                              >
                                {composerExpanded ? 'Daralt' : 'Genişlet'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-signal text-white text-sm font-medium hover:bg-signal-deep transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            Kuyruğa al
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setComposerOpen(true)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg border border-canvas-line/80 bg-canvas-soft/40 hover:bg-canvas-soft/70 transition-colors text-left"
                    >
                      <Reply className="w-4 h-4 text-signal shrink-0" />
                      <span className="text-sm font-medium text-ink">Yanıtla</span>
                      {replyText.trim() && (
                        <span className="ml-auto text-xs text-ink-soft truncate max-w-[50%]">
                          Taslak kaydedildi
                        </span>
                      )}
                    </button>
                  )
                ) : (
                  <p className="text-sm text-ink-soft">
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
