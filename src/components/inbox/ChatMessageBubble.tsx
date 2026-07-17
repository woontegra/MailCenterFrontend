import type { TimelineMessage } from './EmailMessageCard'

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

type Props = {
  message: TimelineMessage
  channelType: string
}

export default function ChatMessageBubble({ message, channelType }: Props) {
  const outbound = message.direction === 'OUTBOUND'
  const isWa = channelType === 'WHATSAPP'

  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-[15px] shadow-sm ${
          outbound
            ? isWa
              ? 'bg-signal/90 text-white rounded-br-md'
              : 'bg-dock text-white rounded-br-md'
            : 'bg-white border border-canvas-line text-ink rounded-bl-md'
        }`}
      >
        {message.subject && (
          <p className={`text-[11px] mb-1 ${outbound ? 'text-white/70' : 'text-ink-faint'}`}>
            {message.subject}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content || '(İçerik yok)'}</p>
        <div
          className={`flex flex-wrap gap-2 mt-2 text-xs ${
            outbound ? 'text-white/60' : 'text-ink-faint'
          }`}
        >
          <span>{formatTime(message.sentAt || message.receivedAt)}</span>
          {message.status && <span>{message.status}</span>}
          {message.safeErrorMessage && (
            <span className={outbound ? 'text-red-200' : 'text-red-500'}>
              {message.safeErrorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
