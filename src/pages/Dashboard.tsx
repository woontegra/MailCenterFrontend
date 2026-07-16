import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Cable } from 'lucide-react'
import { dashboardApi, mailApi } from '../services/api'
import { DashboardStats } from '../types'
import { useAuthStore } from '../store/authStore'
import AccountNetwork from '../components/dashboard/AccountNetwork'
import MailTimeline from '../components/dashboard/MailTimeline'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: recentMails } = useQuery({
    queryKey: ['recent-mails'],
    queryFn: async () => {
      const res = await mailApi.getMails({ is_deleted: false })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const statsData = stats?.data
  const accounts = statsData?.accounts || []
  const greetingName = user?.email?.split('@')[0]

  if (isLoading) {
    return (
      <div className="mc-shell mc-dashboard pt-1">
        <div className="animate-pulse space-y-5 w-full">
          <div className="h-9 bg-canvas-line/60 rounded-xl w-80 max-w-full" />
          <div className="h-4 bg-canvas-line/50 rounded w-[28rem] max-w-full" />
          <div className="h-10 w-72 max-w-full bg-canvas-line/50 rounded-full" />
          <div className="mc-dashboard-panels">
            <div className="h-full min-h-[20rem] bg-canvas-line/40 rounded-[1.4rem]" />
            <div className="h-full min-h-[20rem] bg-canvas-line/40 rounded-[1.4rem]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mc-shell mc-dashboard pt-1">
      <section className="mc-reveal mb-5 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-signal-deep mb-1.5">
              Bugünkü Mail Akışı
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
              <h1 className="font-display text-3xl lg:text-[2.4rem] font-semibold tracking-tight text-ink leading-[1.1]">
                İletişim Merkezi
              </h1>
              <div className="mc-status-strip mc-reveal mc-reveal-delay-1 shrink-0">
                <div className="mc-status-item">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Okunmamış</span>
                  <span className="font-display text-base font-semibold tabular-nums text-signal-deep">
                    {statsData?.unread || 0}
                  </span>
                </div>
                <div className="mc-status-item">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Önemli</span>
                  <span className="font-display text-base font-semibold tabular-nums text-amber-700">
                    {statsData?.starred || 0}
                  </span>
                </div>
                <div className="mc-status-item">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Hesap</span>
                  <span className="font-display text-base font-semibold tabular-nums text-ink">
                    {accounts.length}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-sm text-ink-soft max-w-2xl">
              {greetingName
                ? `Merhaba ${greetingName}, bağlı kanallardaki hareket burada toplanıyor.`
                : 'Bağlı kanallardaki hareket burada toplanıyor.'}
            </p>
            {(user?.entitlements?.warnings?.email ||
              user?.entitlements?.warnings?.sms ||
              user?.entitlements?.warnings?.whatsapp ||
              user?.entitlements?.writable === false) && (
              <div className="mt-3 text-sm rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 max-w-2xl">
                {user?.entitlements?.writable === false
                  ? 'Hesap askıda veya süresi dolmuş. Verileri görüntüleyebilirsiniz; yeni gönderim ve kaynak oluşturma kapalıdır.'
                  : 'Aylık gönderim kotanızın %80’ine yaklaştınız. Detay için Plan ve Kullanım sayfasına bakın.'}{' '}
                <Link to="/settings/billing" className="underline font-medium">
                  Plan ve Kullanım
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {accounts.length === 0 && (
        <section className="mc-reveal mc-reveal-delay-1 mb-5">
          <Link
            to="/accounts"
            className="mc-cta-banner group block px-5 py-4 lg:px-6 lg:py-5 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-glow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl rounded-tr-sm bg-white/15 text-white flex items-center justify-center shrink-0">
                  <Cable className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display text-lg text-white">İlk hesabını bağla</p>
                  <p className="text-sm text-white/80 mt-0.5">
                    IMAP hesabı ekleyerek iletişim merkezini canlı hale getir.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2.5 bg-white text-sm font-semibold rounded-xl rounded-bl-md shrink-0"
                style={{ color: '#0b6f7a' }}
              >
                Hesap ekle
                <ArrowRight className="w-4 h-4" style={{ color: '#0b6f7a' }} />
              </span>
            </div>
          </Link>
        </section>
      )}

      <section className="mc-reveal mc-reveal-delay-2 mc-dashboard-panels">
        <AccountNetwork accounts={accounts} />
        <MailTimeline mails={recentMails || []} />
      </section>
    </div>
  )
}
