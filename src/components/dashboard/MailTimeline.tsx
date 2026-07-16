import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Inbox } from 'lucide-react'

interface TimelineMail {
  id: number
  subject?: string
  from_address?: string
  date: string
  is_read?: boolean
  is_starred?: boolean
}

interface MailTimelineProps {
  mails: TimelineMail[]
}

const skeletonRows = [
  { bar: '68%', label: '82%' },
  { bar: '54%', label: '60%' },
  { bar: '74%', label: '48%' },
  { bar: '46%', label: '70%' },
]

export default function MailTimeline({ mails }: MailTimelineProps) {
  if (!mails.length) {
    return (
      <div className="mc-panel mc-panel-asymmetric p-5 lg:p-6 h-full flex flex-col">
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1">Zaman Akışı</p>
            <h3 className="font-display text-lg text-ink">Akış henüz boş</h3>
          </div>
          <div className="w-10 h-10 rounded-xl rounded-tr-sm bg-canvas-soft border border-canvas-line flex items-center justify-center">
            <Inbox className="w-4 h-4 text-ink-faint" />
          </div>
        </div>

        <p className="text-sm text-ink-soft mb-4 max-w-lg">
          Henüz mail yok. Bir hesap bağlandığında bugünkü mail akışı burada zaman çizelgesi olarak görünecek.
        </p>

        <div className="relative flex-1" aria-hidden="true">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-signal/40 via-canvas-line to-transparent" />
          {skeletonRows.map((row, index) => (
            <div key={index} className="mc-empty-timeline-row relative pl-8">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-canvas-line ring-2 ring-white" />
              <div className="flex-1 space-y-2">
                <div className="mc-empty-timeline-bar" style={{ width: row.bar }} />
                <div className="mc-empty-timeline-bar" style={{ width: row.label, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/accounts"
          className="mt-4 text-sm font-medium text-signal-deep hover:text-signal transition-colors"
        >
          Hesap bağla →
        </Link>
      </div>
    )
  }

  return (
    <div className="mc-panel mc-panel-asymmetric p-5 lg:p-6 h-full hover:-translate-y-0.5 transition-transform duration-300">
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1">Zaman Akışı</p>
          <h3 className="font-display text-lg text-ink">Son mailler</h3>
        </div>
        <Link to="/inbox" className="text-xs font-medium text-signal-deep hover:text-signal transition-colors">
          Gelen kutusuna git
        </Link>
      </div>

      <div className="relative space-y-0">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-signal/50 via-canvas-line to-transparent" />

        {mails.slice(0, 8).map((mail, index) => (
          <div
            key={mail.id}
            className={`mc-reveal relative pl-8 py-3 ${index < Math.min(mails.length, 8) - 1 ? 'border-b border-canvas-line/60' : ''}`}
            style={{ animationDelay: `${80 + index * 50}ms` }}
          >
            <span
              className={`absolute left-1.5 top-4 w-2.5 h-2.5 rounded-full ring-2 ring-white
                ${mail.is_read === false ? 'bg-signal animate-pulse-soft' : 'bg-ink-faint/50'}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm truncate ${mail.is_read === false ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                  {mail.subject || '(Konu yok)'}
                </p>
                <p className="text-xs text-ink-faint truncate mt-0.5">{mail.from_address}</p>
              </div>
              <time className="text-[11px] text-ink-faint whitespace-nowrap tabular-nums">
                {format(new Date(mail.date), 'dd MMM HH:mm')}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
