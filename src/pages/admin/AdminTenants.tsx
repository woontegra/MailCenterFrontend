import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import { AdminError } from '../../components/admin/AdminUi'
import { companyStatusLabel } from '../../utils/displayLabels'

export default function AdminTenants() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const params = useMemo(
    () => ({ q: q || undefined, status: status || undefined }),
    [q, status]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-tenants', params],
    queryFn: async () => (await adminPlatformApi.tenants(params)).data,
  })

  const rows = Array.isArray(data?.data) ? data.data : []

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      adminPlatformApi.setTenantStatus(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-platform-tenants'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Durum güncellenemedi'),
  })

  const softDeleteMutation = useMutation({
    mutationFn: (id: number) => adminPlatformApi.updateTenant(id, { delete: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-platform-tenants'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Firma silinemedi'),
  })

  return (
    <div className="space-y-4">
      <AdminBreadcrumb items={[{ label: 'Firma Yönetimi' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Firma Yönetimi</h1>
          <p className="text-sm text-ink-soft mt-1">Firmaları arayın, filtreleyin ve yönetin.</p>
        </div>
        <Link
          to="/admin/yeni-kullanici"
          className="px-3 py-2 rounded-xl bg-dock text-white text-sm"
        >
          Yeni Kullanıcı
        </Link>
      </div>

      {error && <AdminError message={error} />}

      <div className="flex flex-wrap gap-2">
        <input
          className="px-3 py-2 rounded-xl border text-sm flex-1 min-w-[12rem]"
          placeholder="Firma ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-xl border text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Pasif</option>
          <option value="TEST">İnceleme / test</option>
        </select>
      </div>

      <div className="mc-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint border-b border-canvas-line">
              <th className="p-3">Firma</th>
              <th className="p-3">Sahip</th>
              <th className="p-3">Kullanıcı</th>
              <th className="p-3">Marka</th>
              <th className="p-3">E-posta</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Durum</th>
              <th className="p-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-3 text-ink-soft" colSpan={8}>
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-ink-soft" colSpan={8}>
                  Kayıt yok
                </td>
              </tr>
            ) : (
              rows.map((t: any) => {
                const active = t.is_active !== false && t.status !== 'SUSPENDED'
                return (
                  <tr key={t.id} className="border-b border-canvas-line/60">
                    <td className="p-3">
                      <Link
                        className="text-signal-deep underline"
                        to={`/admin/firmalar/${t.id}`}
                      >
                        {t.name}
                      </Link>
                      <div className="text-[11px] text-ink-faint">#{t.id}</div>
                    </td>
                    <td className="p-3">{t.owner_email || '—'}</td>
                    <td className="p-3">{t.users_count}</td>
                    <td className="p-3">{t.brands_count}</td>
                    <td className="p-3">{t.has_email ? 'Var' : '—'}</td>
                    <td className="p-3">{t.has_whatsapp ? 'Var' : '—'}</td>
                    <td className="p-3">
                      {active ? 'Aktif' : companyStatusLabel(t.status) || 'Pasif'}
                      {t.is_test_account ? ' · İnceleme' : ''}
                    </td>
                    <td className="p-3 space-x-2 text-xs whitespace-nowrap">
                      <Link className="underline" to={`/admin/firmalar/${t.id}`}>
                        Detay
                      </Link>
                      <Link className="underline" to={`/admin/firmalar/${t.id}`}>
                        Düzenle
                      </Link>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => statusMutation.mutate({ id: t.id, active: !active })}
                      >
                        {active ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                      <button
                        type="button"
                        className="underline text-red-600"
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${t.name}" firması pasifleştirilsin mi? (yumuşak silme)`
                            )
                          ) {
                            softDeleteMutation.mutate(t.id)
                          }
                        }}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
