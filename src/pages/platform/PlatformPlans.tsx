import { useQuery } from '@tanstack/react-query'
import { platformAdminApi } from '../../services/api'

export default function PlatformPlans() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const res = await platformAdminApi.plans()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-teal-300/80">Platform</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Planlar</h1>
      </div>
      {isLoading ? (
        <div className="animate-pulse h-40 bg-white/5 rounded-2xl" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((p: any) => (
            <article
              key={p.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
            >
              <div className="flex justify-between gap-2">
                <h2 className="font-medium">{p.name}</h2>
                <span className="text-[10px] uppercase tracking-[0.12em] text-teal-300/80">
                  {p.code}
                </span>
              </div>
              <p className="text-xs text-white/50">{p.description || '—'}</p>
              <p className="text-sm text-white/80">
                {p.monthlyPrice != null ? `$${p.monthlyPrice}/ay` : 'Ücretsiz / özel'}
                {!p.isPublic ? ' · gizli' : ''}
                {!p.isActive ? ' · pasif' : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
