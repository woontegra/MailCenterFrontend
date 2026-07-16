import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { teamApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { APP_DISPLAY_NAME } from '../config/app'

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER'] as const

const roleLabel: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  MANAGER: 'Müdür',
  AGENT: 'Temsilci',
  VIEWER: 'İzleyici',
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

export default function Team() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tab, setTab] = useState<'members' | 'invites'>('members')
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [inviteForm, setInviteForm] = useState({
    email: '',
    tenantRole: 'AGENT',
    allowSms: false,
  })

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await teamApi.list()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: invites = [] } = useQuery({
    queryKey: ['team-invites'],
    queryFn: async () => {
      const res = await teamApi.listInvites()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const selected = members.find((m: any) => m.id === selectedId) || null

  const { data: detail } = useQuery({
    queryKey: ['team-member', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await teamApi.get(selectedId!)).data?.data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['team-members'] })
    queryClient.invalidateQueries({ queryKey: ['team-invites'] })
    queryClient.invalidateQueries({ queryKey: ['team-member', selectedId] })
  }

  const roleMutation = useMutation({
    mutationFn: (tenantRole: string) => teamApi.setRole(selectedId!, { tenantRole }),
    onSuccess: () => {
      setInfo('Rol güncellendi')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Rol güncellenemedi'),
  })

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => teamApi.setStatus(selectedId!, { isActive }),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.error || 'Durum güncellenemedi'),
  })

  const removeMutation = useMutation({
    mutationFn: () => teamApi.remove(selectedId!),
    onSuccess: () => {
      setSelectedId(null)
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Üye kaldırılamadı'),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      teamApi.createInvite({
        email: inviteForm.email,
        tenantRole: inviteForm.tenantRole,
        permissionOverrides: inviteForm.allowSms
          ? []
          : inviteForm.tenantRole === 'VIEWER'
            ? []
            : [],
      }),
    onSuccess: (res) => {
      setShowInvite(false)
      setInviteForm({ email: '', tenantRole: 'AGENT', allowSms: false })
      setInfo(res.data?.emailMessage || 'Davet oluşturuldu')
      if (res.data?.inviteToken) {
        setInfo(
          `${res.data.emailMessage}. Bağlantı token: ${res.data.inviteToken}`
        )
      }
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Davet oluşturulamadı'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: number) => teamApi.resendInvite(id),
    onSuccess: (res) => {
      setInfo(res.data?.emailMessage || 'Yeniden gönderildi')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Yeniden gönderilemedi'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => teamApi.revokeInvite(id),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.error || 'İptal edilemedi'),
  })

  const assignableRoles = useMemo(() => {
    if (user?.tenant_role === 'OWNER') return ROLES
    if (user?.tenant_role === 'ADMIN') return ROLES.filter((r) => r !== 'OWNER')
    return ROLES.filter((r) => r === 'AGENT' || r === 'VIEWER')
  }, [user?.tenant_role])

  const onInvite = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    inviteMutation.mutate()
  }

  return (
    <div className="mc-shell pt-1 pb-8 h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <div className="mb-4 flex items-end justify-between gap-4 shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Organizasyon</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Ekip</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} tenant ekibi, roller ve davetler.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm"
        >
          <UserPlus className="w-4 h-4" />
          Davet et
        </button>
      </div>

      {(error || info) && (
        <div
          className={`mb-3 p-3 rounded-xl text-sm shrink-0 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {error || info}
        </div>
      )}

      <div className="flex gap-2 mb-3 shrink-0">
        <button
          type="button"
          className={`px-3 py-1.5 rounded-xl text-sm ${
            tab === 'members' ? 'bg-dock text-white' : 'bg-canvas-soft text-ink-soft'
          }`}
          onClick={() => setTab('members')}
        >
          Üyeler
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-xl text-sm ${
            tab === 'invites' ? 'bg-dock text-white' : 'bg-canvas-soft text-ink-soft'
          }`}
          onClick={() => setTab('invites')}
        >
          Davetler
        </button>
      </div>

      {tab === 'members' ? (
        <div className="flex flex-col lg:flex-row gap-3 min-h-0 flex-1">
          <section className="mc-panel mc-panel-asymmetric w-full lg:w-[22rem] shrink-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-canvas-line/40 rounded-lg" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-soft">Üye yok</div>
              ) : (
                <ul className="divide-y divide-canvas-line/70">
                  {members.map((m: any) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedId === m.id ? 'bg-signal/10' : 'hover:bg-canvas-soft/80'
                        }`}
                      >
                        <p className="text-sm font-medium text-ink truncate">
                          {m.name || m.email}
                        </p>
                        <p className="text-xs text-ink-soft truncate">{m.email}</p>
                        <div className="flex gap-2 mt-1 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                          <span>{roleLabel[m.tenant_role] || m.tenant_role}</span>
                          <span>{m.is_active === false ? 'Pasif' : 'Aktif'}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mc-panel mc-panel-asymmetric flex-1 min-w-0 p-5 overflow-y-auto">
            {!detail && !selected ? (
              <div className="h-full flex flex-col items-center justify-center text-ink-soft text-sm">
                <Users className="w-10 h-10 mb-3 text-ink-faint" />
                Bir ekip üyesi seçin
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl text-ink">
                    {(detail || selected)?.name || (detail || selected)?.email}
                  </h2>
                  <p className="text-sm text-ink-soft">{(detail || selected)?.email}</p>
                  <p className="text-xs text-ink-faint mt-1">
                    Son giriş: {formatTime((detail || selected)?.last_login_at)}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    Rol
                  </label>
                  <select
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                    value={(detail || selected)?.tenant_role || ''}
                    disabled={(detail || selected)?.id === user?.id}
                    onChange={(e) => roleMutation.mutate(e.target.value)}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                    disabled={(detail || selected)?.id === user?.id}
                    onClick={() =>
                      statusMutation.mutate((detail || selected)?.is_active === false)
                    }
                  >
                    {(detail || selected)?.is_active === false ? 'Aktifleştir' : 'Pasifleştir'}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs"
                    disabled={(detail || selected)?.id === user?.id}
                    onClick={() => {
                      if (window.confirm('Üyeyi pasifleştirip ekipten kaldırmak istiyor musunuz?')) {
                        removeMutation.mutate()
                      }
                    }}
                  >
                    Ekipten kaldır
                  </button>
                </div>

                {Array.isArray((detail || selected)?.permission_overrides) &&
                  (detail || selected).permission_overrides.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">
                        Özel yetkiler
                      </p>
                      <ul className="text-xs text-ink-soft space-y-1">
                        {(detail || selected).permission_overrides.map((o: any) => (
                          <li key={`${o.permission_key}-${o.effect}`}>
                            {o.effect}: {o.permission_key}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="mc-panel mc-panel-asymmetric flex-1 overflow-y-auto p-4 space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-10">Bekleyen veya geçmiş davet yok</p>
          ) : (
            invites.map((inv: any) => (
              <article
                key={inv.id}
                className="rounded-2xl border border-canvas-line bg-canvas/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{inv.email}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {roleLabel[inv.tenant_role] || inv.tenant_role} · {inv.status}
                    {inv.invited_by_email ? ` · davet: ${inv.invited_by_email}` : ''}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-1">
                    {inv.email_send_message || formatTime(inv.expires_at)}
                  </p>
                </div>
                {inv.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-dock text-white text-xs"
                      onClick={() => resendMutation.mutate(inv.id)}
                    >
                      Tekrar gönder
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                      onClick={() => revokeMutation.mutate(inv.id)}
                    >
                      İptal
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={onInvite}
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3"
          >
            <h2 className="font-display text-lg text-ink">Yeni ekip üyesi davet et</h2>
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              type="email"
              required
              placeholder="E-posta"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={inviteForm.tenantRole}
              onChange={(e) => setInviteForm({ ...inviteForm, tenantRole: e.target.value })}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-faint">
              Davet maili tenant’ın aktif e-posta göndericisi üzerinden kuyruğa alınır. Gönderici yoksa
              davet yine de kaydedilir.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm"
              >
                İptal
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm">
                Davet oluştur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
