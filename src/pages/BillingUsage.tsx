import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { APP_DISPLAY_NAME } from '../config/app'
import Forbidden from './Forbidden'

function bar(used: number, limit: number | null) {
  if (limit == null) return 0
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

export default function BillingUsage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const user = useAuthStore((s) => s.user)

  if (!hasPermission('SETTINGS_MANAGE') && user?.tenant_role !== 'OWNER') {
    return <Forbidden />
  }

  const { data: ent, isLoading } = useQuery({
    queryKey: ['billing-usage'],
    queryFn: async () => (await billingApi.usage()).data?.data,
    refetchInterval: 20000,
  })

  if (isLoading) {
    return (
      <div className="mc-shell pt-1 pb-8">
        <div className="animate-pulse h-40 bg-canvas-line/40 rounded-2xl" />
      </div>
    )
  }

  const rows = [
    ['Ekip', ent?.usage?.users_count, ent?.limits?.max_users],
    ['Marka', ent?.usage?.brands_count, ent?.limits?.max_brands],
    ['Kişi', ent?.usage?.contacts_count, ent?.limits?.max_contacts],
    ['E-posta / ay', ent?.usage?.email_sent, ent?.limits?.monthly_email_sends],
    ['SMS / ay', ent?.usage?.sms_sent, ent?.limits?.monthly_sms_sends],
    ['WhatsApp / ay', ent?.usage?.whatsapp_sent, ent?.limits?.monthly_whatsapp_sends],
    ['Şablon', ent?.usage?.templates_count, ent?.limits?.max_templates],
  ]

  return (
    <div className="mc-shell pt-1 pb-8 max-w-3xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Abonelik</p>
      <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Plan ve Kullanım</h1>
      <p className="text-sm text-ink-soft mt-1">
        {APP_DISPLAY_NAME} kotası ve özellik durumu. Online satın alma bu sürümde etkin değildir.
      </p>

      {!ent?.writable && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          Hesap askıda veya süresi dolmuş. Verilerinizi görüntüleyebilirsiniz; yeni gönderim veya
          kaynak oluşturma kapalıdır.
        </div>
      )}

      <div className="mc-panel mc-panel-asymmetric p-5 mt-5 space-y-2">
        <p className="text-sm">
          <span className="text-ink-faint">Plan:</span> {ent?.planName} ({ent?.planCode})
        </p>
        <p className="text-sm">
          <span className="text-ink-faint">Durum:</span> {ent?.subscriptionStatus} ·{' '}
          {ent?.billingPeriod}
        </p>
        <p className="text-xs text-ink-faint mt-2">
          Plan değişikliği için iletişime geçin. Gerçek ödeme tahsilatı bu ekrandan başlatılmaz.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map(([label, used, limit]) => {
          const pct = bar(Number(used || 0), limit as number | null)
          return (
            <div key={String(label)} className="mc-panel p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{label}</span>
                <span className="text-ink-soft">
                  {used ?? 0}
                  {limit == null ? ' / ∞' : ` / ${limit}`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-canvas-line overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-signal'
                  }`}
                  style={{ width: `${limit == null ? 8 : pct}%` }}
                />
              </div>
              {pct >= 80 && limit != null && (
                <p className="text-[11px] text-amber-700 mt-1">
                  {pct >= 100 ? 'Limit doldu' : 'Limitin %80’ine ulaşıldı'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mc-panel p-4 mt-5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-2">Özellikler</p>
        <ul className="grid sm:grid-cols-2 gap-1 text-sm text-ink-soft">
          {Object.entries(ent?.features || {}).map(([k, v]) => (
            <li key={k}>
              {k}: {v ? 'Açık' : 'Kapalı'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
