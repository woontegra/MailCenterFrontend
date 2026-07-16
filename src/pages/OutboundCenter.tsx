import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Radio, RotateCcw, Ban, ChevronDown, ChevronUp } from 'lucide-react'
import { outboundApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

const statusMeta: Record<string, { label: string; className: string }> = {
  QUEUED: { label: 'Kuyrukta', className: 'status-queued' },
  PROCESSING: { label: 'İşleniyor', className: 'status-processing' },
  SENT: { label: 'Gönderildi', className: 'status-sent' },
  DELIVERED: { label: 'Teslim', className: 'status-sent' },
  READ: { label: 'Okundu', className: 'status-sent' },
  FAILED: { label: 'Başarısız', className: 'status-failed' },
  CANCELLED: { label: 'İptal', className: 'status-cancelled' },
  SCHEDULED: { label: 'Zamanlandı', className: 'status-scheduled' },
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

function AttemptHistory({ messageId }: { messageId: number }) {
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['outbound-attempts', messageId],
    queryFn: async () => {
      const res = await outboundApi.attempts(messageId)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  if (isLoading) {
    return <p className="text-xs text-ink-faint mt-2">Deneme geçmişi yükleniyor…</p>
  }
  if (attempts.length === 0) {
    return <p className="text-xs text-ink-faint mt-2">Henüz deneme kaydı yok.</p>
  }

  return (
    <ul className="mt-2 space-y-1.5 border-t border-canvas-line pt-2">
      {attempts.map((a: any) => (
        <li key={a.id} className="text-xs text-ink-soft flex flex-wrap gap-x-3 gap-y-0.5">
          <span>#{a.attempt_number ?? a.id}</span>
          <span>{a.status || a.result || '—'}</span>
          <span>{formatTime(a.created_at || a.attempted_at)}</span>
          {a.error_message && <span className="text-red-600">{a.error_message}</span>}
        </li>
      ))}
    </ul>
  )
}

export default function OutboundCenter() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['outbound-messages'],
    queryFn: async () => {
      const res = await outboundApi.list()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    refetchInterval: 5000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => outboundApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outbound-messages'] }),
  })

  const retryMutation = useMutation({
    mutationFn: (id: number) => outboundApi.retry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outbound-messages'] }),
  })

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Teslimat</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Gönderim Merkezi</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} kuyruk durumlarını izleyin. SENT olmadan teslim edilmiş sayılmaz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/compose')}
          className="px-4 py-2.5 rounded-xl bg-dock text-white text-sm"
        >
          Yeni mesaj
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-canvas-line/50 rounded-2xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center">
          <Radio className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">Henüz kuyruk kaydı yok</p>
          <p className="text-sm text-ink-soft mt-1">Compose üzerinden gönderilen mesajlar burada görünür.</p>
        </div>
      ) : (
        <div className="relative space-y-3 before:absolute before:left-[18px] before:top-2 before:bottom-2 before:w-px before:bg-canvas-line">
          {messages.map((msg: any) => {
            const meta = statusMeta[msg.status] || statusMeta.QUEUED
            return (
              <article
                key={msg.id}
                className="mc-panel mc-panel-asymmetric relative ml-0 sm:ml-2 pl-4 sm:pl-8 py-4 pr-4"
              >
                <span
                  className={`absolute left-[11px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white ${meta.className}-dot`}
                />
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-lg ${meta.className}-chip`}>
                        {meta.label}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-lg ${
                          msg.channel_type === 'SMS' || msg.channel_type === 'WHATSAPP'
                            ? 'bg-signal/15 text-signal-deep'
                            : 'text-ink-faint'
                        }`}
                      >
                        {msg.channel_type === 'WHATSAPP'
                          ? 'WhatsApp'
                          : msg.channel_type === 'SMS'
                            ? 'SMS'
                            : msg.channel_type}
                      </span>
                      <span className="text-[11px] text-ink-faint">·</span>
                      <span className="text-[11px] text-ink-faint">{msg.brand_name || 'Markasız'}</span>
                    </div>
                    <p className="text-sm text-ink">
                      <span className="text-ink-faint">Gönderen:</span>{' '}
                      {msg.sender_display_name
                        ? `${msg.sender_display_name} <${msg.sender_value || ''}>`
                        : '—'}
                    </p>
                    <p className="text-sm text-ink truncate">
                      <span className="text-ink-faint">
                        {msg.channel_type === 'SMS' || msg.channel_type === 'WHATSAPP'
                          ? 'Telefon:'
                          : 'Alıcı:'}
                      </span>{' '}
                      {msg.to || '—'}
                    </p>
                    {msg.channel_type === 'SMS' || msg.channel_type === 'WHATSAPP' ? (
                      <p className="font-medium text-ink mt-1 line-clamp-2">
                        {msg.content_preview || '(İçerik yok)'}
                      </p>
                    ) : (
                      <p className="font-medium text-ink mt-1 truncate">{msg.subject || '(Konu yok)'}</p>
                    )}
                    {msg.channel_type !== 'SMS' &&
                      msg.channel_type !== 'WHATSAPP' &&
                      msg.content_preview && (
                      <p className="text-xs text-ink-soft mt-1 line-clamp-2">{msg.content_preview}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-ink-faint">
                      <span>Deneme: {msg.attempt_count || 0}</span>
                      {msg.segment_count != null && <span>Parça: {msg.segment_count}</span>}
                      {msg.encoding && <span>{msg.encoding}</span>}
                      {msg.provider_message_id && (
                        <span>Provider ID: {msg.provider_message_id}</span>
                      )}
                      <span>Kuyruk: {formatTime(msg.queued_at)}</span>
                      {msg.sent_at && <span>Gönderim: {formatTime(msg.sent_at)}</span>}
                      {msg.failed_at && <span>Hata: {formatTime(msg.failed_at)}</span>}
                    </div>
                    {msg.last_error_message && (
                      <p className="text-xs text-red-600 mt-2">{msg.last_error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === msg.id ? null : msg.id)
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                    >
                      {expandedId === msg.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      Denemeler
                    </button>
                    {(msg.status === 'QUEUED' || msg.status === 'SCHEDULED') && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(msg.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        İptal
                      </button>
                    )}
                    {msg.status === 'FAILED' && (
                      <button
                        type="button"
                        onClick={() => retryMutation.mutate(msg.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-dock text-white text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Yeniden dene
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === msg.id && <AttemptHistory messageId={msg.id} />}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
