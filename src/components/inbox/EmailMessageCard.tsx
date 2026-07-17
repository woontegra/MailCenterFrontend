import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Paperclip, Send } from 'lucide-react'
import EmailHtmlFrame from './EmailHtmlFrame'

export type TimelineMessage = {
  sourceId: string
  direction: 'INBOUND' | 'OUTBOUND'
  channelType: string
  sender: string | null
  recipient: string | null
  cc?: string | null
  subject: string | null
  content: string | null
  contentType: string
  htmlBody?: string | null
  textBody?: string | null
  sanitizedHtml?: string | null
  status: string | null
  providerMessageId: string | null
  sentAt: string | null
  receivedAt: string | null
  attachments: Array<{
    filename?: string
    contentType?: string
    sizeBytes?: number
    contentId?: string
    inline?: boolean
  }>
  safeErrorMessage: string | null
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatBytes(size?: number) {
  if (!size || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function wrapEmailDocument(fragment: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank" rel="noopener noreferrer"><style>
html,body{margin:0;padding:12px;background:#fff;color:#1a2332;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;word-wrap:break-word;overflow-wrap:anywhere;}
img,video{max-width:100%;height:auto;}
table{max-width:100%;border-collapse:collapse;}
a{word-break:break-word;}
</style></head><body>${fragment}</body></html>`
}

type Props = {
  message: TimelineMessage
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
      <span className="text-ink-soft font-medium shrink-0">{label}</span>
      <span className="text-ink break-all">{value}</span>
    </div>
  )
}

export default function EmailMessageCard({ message }: Props) {
  const outbound = message.direction === 'OUTBOUND'
  const when = formatTime(message.sentAt || message.receivedAt)
  const [metaOpen, setMetaOpen] = useState(true)

  const htmlFragment = message.sanitizedHtml || null
  const plainText =
    message.textBody ||
    (message.contentType !== 'text/html' ? message.content : null) ||
    (!htmlFragment ? message.content : null)

  return (
    <article
      className={`w-full rounded-xl border bg-white overflow-hidden shadow-sm ${
        outbound
          ? 'border-dock/25 border-l-4 border-l-dock'
          : 'border-canvas-line border-l-4 border-l-signal'
      }`}
    >
      <header className="px-5 py-4 border-b border-canvas-line/70 bg-canvas-soft/30">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              outbound ? 'bg-dock/10 text-dock' : 'bg-signal/10 text-signal-deep'
            }`}
          >
            {outbound ? (
              <>
                <Send className="w-3.5 h-3.5" />
                Giden e-posta
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Gelen e-posta
              </>
            )}
          </span>
          <time className="text-sm text-ink-soft whitespace-nowrap">{when}</time>
        </div>

        <h3 className="text-lg font-semibold text-ink leading-snug mb-3">
          {message.subject || '(Konu yok)'}
        </h3>

        <button
          type="button"
          onClick={() => setMetaOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors mb-1"
        >
          {metaOpen ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Adres detaylarını gizle
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Adres detaylarını göster
            </>
          )}
        </button>

        {metaOpen && (
          <div className="space-y-2 pt-1">
            <MetaRow label="Kimden" value={message.sender || '—'} />
            <MetaRow label="Kime" value={message.recipient || '—'} />
            {message.cc ? <MetaRow label="Cc" value={message.cc} /> : null}
          </div>
        )}
      </header>

      {message.attachments?.length > 0 && (
        <div className="px-5 py-3 border-b border-canvas-line/60 bg-canvas-soft/20 flex flex-wrap gap-2">
          {message.attachments.map((att, i) => (
            <span
              key={`${message.sourceId}-att-${i}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-canvas-line text-sm text-ink-soft"
            >
              <Paperclip className="w-3.5 h-3.5 shrink-0 text-ink-faint" />
              <span className="truncate max-w-[16rem]">{att.filename || 'Ek'}</span>
              {att.sizeBytes ? (
                <span className="text-ink-faint text-xs">{formatBytes(att.sizeBytes)}</span>
              ) : null}
            </span>
          ))}
        </div>
      )}

      <div className="px-5 py-4 min-w-0">
        {htmlFragment ? (
          <EmailHtmlFrame html={wrapEmailDocument(htmlFragment)} title={message.subject || 'E-posta'} />
        ) : (
          <div className="max-w-4xl">
            <p className="text-[15px] text-ink whitespace-pre-wrap break-words leading-7">
              {plainText || '(İçerik yok)'}
            </p>
          </div>
        )}
      </div>

      {(message.status || message.safeErrorMessage) && (
        <footer className="px-5 py-2.5 border-t border-canvas-line/60 bg-canvas-soft/25 flex flex-wrap gap-2 text-xs text-ink-soft">
          {message.status && <span>{message.status}</span>}
          {message.safeErrorMessage && (
            <span className="text-red-600">{message.safeErrorMessage}</span>
          )}
        </footer>
      )}
    </article>
  )
}
