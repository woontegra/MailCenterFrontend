import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import { AdminError } from '../../components/admin/AdminUi'
import { TENANT_ROLES, platformRoleLabel, tenantRoleLabel } from '../../utils/displayLabels'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [oncePassword, setOncePassword] = useState<string | null>(null)

  const params = useMemo(() => ({ q: q || undefined }), [q])
  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-users', params],
    queryFn: async () => (await adminPlatformApi.users(params)).data?.data || [],
  })
  const rows = Array.isArray(data) ? data : []

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      adminPlatformApi.setUserStatus(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Durum güncellenemedi'),
  })

  const resetMutation = useMutation({
    mutationFn: (id: number) => {
      const temporaryPassword = `Tmp${Math.random().toString(36).slice(2, 8)}9A`
      return adminPlatformApi.resetPassword(id, { temporaryPassword }).then((res) => ({
        temporaryPassword: res.data?.data?.temporaryPassword || temporaryPassword,
      }))
    },
    onSuccess: (res) => {
      setOncePassword(res.temporaryPassword || null)
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Şifre sıfırlanamadı'),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, tenantRole }: { id: number; tenantRole: string }) =>
      adminPlatformApi.setUserRole(id, { tenantRole }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Rol güncellenemedi'),
  })

  return (
    <div className="space-y-4">
      <AdminBreadcrumb items={[{ label: 'Kullanıcı Yönetimi' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-ink-soft mt-1">
            Firmalardaki kullanıcıları yönetin. Yeni kayıt için Yeni Kullanıcı sayfasını kullanın.
          </p>
        </div>
        <Link
          to="/admin/yeni-kullanici"
          className="px-3 py-2 rounded-xl bg-dock text-white text-sm"
        >
          Yeni Kullanıcı
        </Link>
      </div>

      {error && <AdminError message={error} />}
      {oncePassword && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
          Geçici şifre (bir kez): <code className="font-mono">{oncePassword}</code>
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void navigator.clipboard.writeText(oncePassword)}
          >
            Kopyala
          </button>
          <button type="button" className="ml-2" onClick={() => setOncePassword(null)}>
            Gizle
          </button>
        </div>
      )}

      <input
        className="w-full max-w-md px-3 py-2 rounded-xl border text-sm"
        placeholder="Kullanıcı ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="mc-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-faint border-b border-canvas-line">
              <th className="p-3">Kullanıcı</th>
              <th className="p-3">Firma</th>
              <th className="p-3">Firma rolü</th>
              <th className="p-3">Sistem rolü</th>
              <th className="p-3">Durum</th>
              <th className="p-3">Son giriş</th>
              <th className="p-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-3" colSpan={7}>
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-3 text-ink-soft" colSpan={7}>
                  Kayıt yok
                </td>
              </tr>
            ) : (
              rows.map((u: any) => (
                <tr key={u.id} className="border-b border-canvas-line/60">
                  <td className="p-3">
                    {u.name || '—'}
                    <div className="text-[11px] text-ink-faint">{u.email}</div>
                  </td>
                  <td className="p-3">{u.tenant_name}</td>
                  <td className="p-3">
                    <select
                      className="text-xs border rounded-lg px-2 py-1"
                      value={u.tenant_role || 'VIEWER'}
                      onChange={(e) =>
                        roleMutation.mutate({ id: u.id, tenantRole: e.target.value })
                      }
                    >
                      {TENANT_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {tenantRoleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-xs">{platformRoleLabel(u.platform_role || u.role)}</td>
                  <td className="p-3">{u.is_active ? 'Aktif' : 'Pasif'}</td>
                  <td className="p-3 text-xs">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('tr-TR') : '—'}
                  </td>
                  <td className="p-3 space-x-2 text-xs">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => statusMutation.mutate({ id: u.id, active: !u.is_active })}
                    >
                      {u.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => resetMutation.mutate(u.id)}
                    >
                      Şifre sıfırla
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        if (window.confirm('Kullanıcının tüm oturumları kapatılsın mı?')) {
                          adminPlatformApi.revokeUserSessions(u.id).catch(() =>
                            setError('Oturumlar kapatılamadı')
                          )
                        }
                      }}
                    >
                      Oturum kapat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
