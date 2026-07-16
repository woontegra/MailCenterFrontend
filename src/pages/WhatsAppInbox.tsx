import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { whatsappInboxApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

export default function WhatsAppInbox() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['whatsapp-inbox'],
    queryFn: async () => {
      const res = await whatsappInboxApi.list()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    refetchInterval: 10000,
  })

  const selected = messages.find((m: any) => m.id === selectedId) || null

  return (
    <div className="mc-shell pt-1 pb-8 h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <div className="mb-5 shrink-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Gelen</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">WhatsApp Gelen</h1>
        <p className="text-sm text-ink-soft mt-1">
          {APP_DISPLAY_NAME} webhook ile alınan mesajlar. Bu aşamada yalnızca görüntüleme.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        <section className="mc-panel mc-panel-asymmetric w-full lg:w-[22rem] shrink-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-canvas-line/40 rounded-lg" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-9 h-9 text-ink-faint mx-auto mb-2" />
                <p className="text-sm text-ink-soft">Henüz gelen WhatsApp mesajı yok</p>
              </div>
            ) : (
              <ul className="divide-y divide-canvas-line/80">
                {messages.map((m: any) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full text-left px-3 py-3 ${
                        selectedId === m.id ? 'bg-signal/10' : 'hover:bg-canvas-line/30'
                      }`}
                    >
                      <p className="text-sm font-medium text-ink truncate">
                        {m.contact_name || m.sender_value}
                      </p>
                      <p className="text-xs text-ink-soft truncate mt-0.5">{m.content || m.message_type}</p>
                      <p className="text-[11px] text-ink-faint mt-1">{formatTime(m.received_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mc-panel mc-panel-asymmetric flex-1 min-h-0 overflow-y-auto p-5">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center text-ink-soft text-sm">
              Soldan bir konuşma seçin
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-ink">
                  {selected.contact_name || selected.sender_value}
                </h2>
                <p className="text-xs text-ink-faint mt-1">
                  {selected.brand_name || '—'} · {formatTime(selected.received_at)}
                </p>
              </div>
              <div className="rounded-xl bg-canvas-line/25 px-4 py-3">
                <p className="text-xs text-ink-faint mb-1">{selected.message_type}</p>
                <p className="text-sm text-ink whitespace-pre-wrap">{selected.content || '—'}</p>
              </div>
              <div className="text-sm text-ink-soft space-y-1">
                <p>
                  Kişi eşleşmesi:{' '}
                  {selected.contact_id
                    ? selected.contact_name || `#${selected.contact_id}`
                    : 'Eşleşmedi (otomatik kişi oluşturulmaz)'}
                </p>
                <p className="text-xs text-ink-faint">Provider ID: {selected.provider_message_id}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
