import { useQuery } from '@tanstack/react-query'
import { platformAdminApi } from '../../services/api'

export default function PlatformOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: async () => (await platformAdminApi.overview()).data?.data,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-white/5 rounded-2xl" />
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-teal-300/80">Platform</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Genel Bakış</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Aktif tenant', data?.activeTenants],
          ['Deneme', data?.trialTenants],
          ['Askıda', data?.suspendedTenants],
          ['Başarısız outbound %', data?.outboundFailureRate],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">{label}</p>
            <p className="font-display text-2xl mt-2">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-medium mb-3">Plan dağılımı</h2>
          <ul className="space-y-2 text-sm text-white/80">
            {(data?.planDistribution || []).map((p: any) => (
              <li key={p.plan_code} className="flex justify-between">
                <span>{p.plan_code}</span>
                <span>{p.c}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-medium mb-3">Aylık kanal kullanımı</h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex justify-between">
              <span>E-posta</span>
              <span>{data?.monthlyChannelUsage?.email_sent ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>SMS</span>
              <span>{data?.monthlyChannelUsage?.sms_sent ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>WhatsApp</span>
              <span>{data?.monthlyChannelUsage?.whatsapp_sent ?? 0}</span>
            </li>
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-medium mb-3">Yeni tenantlar</h2>
        <ul className="divide-y divide-white/10">
          {(data?.recentTenants || []).map((t: any) => (
            <li key={t.id} className="py-2 flex justify-between text-sm">
              <span>{t.name}</span>
              <span className="text-white/50">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
