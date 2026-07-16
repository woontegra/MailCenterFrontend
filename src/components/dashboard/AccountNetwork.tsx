import { Link } from 'react-router-dom'
import { Plus, Radio } from 'lucide-react'

interface AccountNode {
  id: number
  name: string
  email: string
  total_mails: number
  unread_mails: number
}

interface AccountNetworkProps {
  accounts: AccountNode[]
}

const badgeTones = [
  'bg-signal/20 text-signal-deep border-signal/30',
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
]

function brandKey(name: string, email: string): number {
  const source = `${name}${email}`.toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash + source.charCodeAt(i) * (i + 1)) % badgeTones.length
  }
  return hash
}

export default function AccountNetwork({ accounts }: AccountNetworkProps) {
  if (!accounts.length) {
    return (
      <div className="mc-panel mc-panel-asymmetric p-5 lg:p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 text-ink-faint mb-2">
          <Radio className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-[0.18em]">Hesap Ağı</span>
        </div>
        <h3 className="font-display text-xl text-ink mb-1">Bağlı hesap yok</h3>
        <p className="text-sm text-ink-soft mb-4">
          Henüz hesap eklenmedi. Başlamak için ilk hesabınızı ekleyin.
        </p>

        <div className="mc-empty-network flex-1 mb-4" aria-hidden="true">
          <div className="mc-empty-node" style={{ left: '8%', top: '18%' }} />
          <div className="mc-empty-node" style={{ left: '42%', top: '48%' }} />
          <div className="mc-empty-node" style={{ right: '10%', top: '22%' }} />
          <div className="mc-empty-link" style={{ left: '16%', top: '28%', width: '32%', transform: 'rotate(18deg)' }} />
          <div
            className="mc-empty-link"
            style={{ left: '48%', top: '36%', width: '34%', transform: 'rotate(-12deg)', animationDelay: '1.2s' }}
          />
          <div
            className="mc-empty-link"
            style={{ left: '22%', top: '58%', width: '40%', transform: 'rotate(-4deg)', animationDelay: '2.1s' }}
          />
        </div>

        <Link
          to="/accounts"
          className="inline-flex items-center gap-2 self-start px-4 py-2.5 bg-dock text-white text-sm font-medium
            rounded-xl rounded-tr-sm hover:bg-dock-raised transition-colors"
        >
          <Plus className="w-4 h-4" />
          İlk hesabı bağla
        </Link>
      </div>
    )
  }

  return (
    <div className="mc-panel mc-panel-asymmetric p-5 lg:p-6 h-full relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300">
      <div className="relative flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-faint mb-1">Hesap Ağı</p>
          <h3 className="font-display text-lg text-ink">Canlı bağlantı noktaları</h3>
        </div>
        <span className="text-xs text-ink-faint tabular-nums">{accounts.length} aktif</span>
      </div>

      <div className="relative grid gap-3 content-start">
        {accounts.map((account, index) => {
          const tone = badgeTones[brandKey(account.name, account.email)]
          return (
            <div
              key={account.id}
              className="relative flex items-center gap-3 p-3.5 bg-canvas/70 border border-canvas-line/80
                rounded-2xl rounded-bl-md hover:bg-white hover:shadow-panel transition-all duration-200"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-xl rounded-tr-sm border flex items-center justify-center text-sm font-semibold ${tone}`}>
                  {(account.name || account.email).charAt(0).toUpperCase()}
                </div>
                <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-signal-glow ring-2 ring-white animate-pulse-soft" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{account.name}</p>
                <p className="text-xs text-ink-faint truncate">{account.email}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm tabular-nums text-ink">{account.total_mails}</p>
                <p className="text-[11px] text-ink-faint">{account.unread_mails} okunmadı</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
