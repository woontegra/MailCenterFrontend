import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { platformAdminApi } from '../../services/api'

export default function PlatformTenants() {
  const [q, setQ] = useState('')
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['platform-tenants', q],
    queryFn: async () => {
      const res = await platformAdminApi.tenants({ q: q || undefined })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-teal-300/80">Platform</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Tenantlar</h1>
        </div>
        <input
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
          placeholder="Ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="animate-pulse h-40 bg-white/5 rounded-2xl" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t: any) => (
            <Link
              key={t.id}
              to={`/platform/tenants/${t.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <p className="font-medium truncate">{t.name}</p>
              <p className="text-xs text-white/50 mt-1">
                {t.plan_code || t.subscription_plan || '—'} · {t.status}
              </p>
              <p className="text-xs text-white/40 mt-2">{t.users_count ?? 0} kullanıcı</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
