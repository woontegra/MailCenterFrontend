import { MessageCircle, MessageSquare } from 'lucide-react'

export type ConversationListItem = {
  id: number
  contact_display_name?: string | null
  participant_value?: string | null
  subject?: string | null
  status?: string
  last_message_at?: string | null
  last_message_preview?: string | null
  unread_count?: number | null
  brand_name?: string | null
  brand_accent_color?: string | null
  channel_type?: string
}

const statusFallback: Record<string, string> = {
  OPEN: 'Açık',
  WAITING_REPLY: 'Cevap bekliyor',
  RESOLVED: 'Çözüldü',
  ARCHIVED: 'Arşiv',
}

function formatListTime(value?: string | null): string {
  if (!value) return ''
  try {
    const date = new Date(value)
    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
    }
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function sanitizePreview(text?: string | null): string {
  if (!text) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function senderLabel(c: ConversationListItem): string {
  return c.contact_display_name?.trim() || c.participant_value?.trim() || 'Bilinmeyen'
}

function subjectLine(c: ConversationListItem): string {
  const subject = c.subject?.trim()
  if (subject) return subject
  if (c.channel_type === 'EMAIL') return 'Konu yok'
  const status = c.status ? statusFallback[c.status] || c.status : ''
  return status || 'Konuşma'
}

type Props = {
  conversation: ConversationListItem
  isSelected: boolean
  onSelect: (id: number) => void
}

export default function ConversationListRow({ conversation: c, isSelected, onSelect }: Props) {
  const unreadCount = Number(c.unread_count || 0)
  const unread = unreadCount > 0
  const preview = sanitizePreview(c.last_message_preview)
  const channel = c.channel_type || 'EMAIL'
  const brandColor = c.brand_accent_color || '#1a2332'
  const timeLabel = formatListTime(c.last_message_at)

  const rowClass = [
    'group flex-1 min-w-0 text-left px-3 py-2.5 transition-colors',
    'min-h-[78px] max-h-[92px] flex flex-col justify-center',
    isSelected
      ? 'bg-signal/10 hover:bg-signal/[0.12] ring-1 ring-inset ring-signal/15'
      : unread
        ? 'bg-signal/[0.035] hover:bg-signal/[0.06]'
        : 'bg-white hover:bg-canvas-soft/70',
  ].join(' ')

  const selectionAccent = isSelected
    ? 'bg-signal'
    : unread
      ? 'bg-transparent'
      : 'bg-transparent group-hover:bg-canvas-line/40'

  return (
    <li className="flex border-b border-canvas-line/35 last:border-b-0">
      {/* Marka renk çizgisi */}
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: c.brand_name ? brandColor : 'transparent' }}
        title={c.brand_name || undefined}
        aria-hidden={!c.brand_name}
      />

      {/* Seçili / hover sol vurgu */}
      <div className={`w-[3px] shrink-0 transition-colors ${selectionAccent}`} aria-hidden />

      <button type="button" onClick={() => onSelect(c.id)} className={rowClass}>
        {/* 1. satır: gönderen + tarih */}
        <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {channel === 'SMS' && (
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-dock" aria-label="SMS" />
            )}
            {channel === 'WHATSAPP' && (
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-signal-deep" aria-label="WhatsApp" />
            )}

            <span
              className={`truncate text-[15px] leading-tight ${
                unread || isSelected ? 'font-semibold text-ink' : 'font-normal text-ink'
              }`}
            >
              {senderLabel(c)}
            </span>

            {unread && (
              <span className="shrink-0 flex items-center gap-1">
                {unreadCount === 1 ? (
                  <span
                    className="w-2 h-2 rounded-full bg-signal"
                    aria-label="Okunmamış"
                  />
                ) : (
                  <span
                    className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-signal/15 text-signal-deep text-[10px] font-semibold leading-none flex items-center justify-center"
                    aria-label={`${unreadCount} okunmamış`}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            )}
          </div>

          {timeLabel && (
            <time className="shrink-0 text-[11px] text-ink-faint tabular-nums whitespace-nowrap ml-2">
              {timeLabel}
            </time>
          )}
        </div>

        {/* 2. satır: konu */}
        <p
          className={`truncate text-[13px] leading-snug ${
            unread ? 'font-semibold text-ink/90' : 'font-medium text-ink-soft'
          }`}
        >
          {subjectLine(c)}
        </p>

        {/* 3. satır: önizleme */}
        {preview && (
          <p className="truncate text-[12px] text-ink-faint leading-snug mt-0.5">{preview}</p>
        )}
      </button>
    </li>
  )
}
