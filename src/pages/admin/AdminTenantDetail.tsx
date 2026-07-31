import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import { tenantRoleLabel } from '../../utils/displayLabels'

const tabs = [
  'Genel',
  'Abonelik',
  'Kullanıcılar',
  'Markalar',
  'Kanallar',
  'Notlar',
  'Denetim',
] as const

export default function AdminTenantDetail() {
  const { id } = useParams()
  const tenantId = Number(id)
  const [tab, setTab] = useState<(typeof tabs)[number]>('Genel')
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-tenant', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => (await adminPlatformApi.tenant(tenantId)).data?.data,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-platform-tenant', tenantId] })

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => adminPlatformApi.setTenantStatus(tenantId, { active }),
    onSuccess: invalidate,
    onError: (err: any) => setError(err.response?.data?.error || 'Durum güncellenemedi'),
  })

  const patchMutation = useMutation({
    mutationFn: (body: any) => adminPlatformApi.updateTenant(tenantId, body),
    onSuccess: () => {
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Firma güncellenemedi'),
  })

  if (isLoading || !data) {
    return <div className="animate-pulse h-40 bg-canvas-line/40 rounded-2xl" />
  }

  const t = data.tenant
  if (notes === '' && t.admin_notes && notes !== t.admin_notes) {
    // initialize once
  }

  const mailChannels = (data.channels || []).filter(
    (c: any) => String(c.channel_type).toUpperCase() === 'EMAIL'
  )
  const waChannels = (data.channels || []).filter(
    (c: any) => String(c.channel_type).toUpperCase() === 'WHATSAPP'
  )
  const smsChannels = (data.channels || []).filter(
    (c: any) => String(c.channel_type).toUpperCase() === 'SMS'
  )

  return (
    <div className="space-y-4">
      <AdminBreadcrumb
        items={[
          { label: 'Firma Yönetimi', to: '/admin/firmalar' },
          { label: t.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t.name}</h1>
          <p className="text-sm text-ink-soft">
            #{t.id} · {t.is_active !== false && t.status !== 'SUSPENDED' ? 'Aktif' : 'Pasif'}
            {t.is_test_account ? ' · Test / inceleme' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl border text-sm"
            onClick={() =>
              statusMutation.mutate(!(t.is_active !== false && t.status !== 'SUSPENDED'))
            }
          >
            {t.is_active !== false && t.status !== 'SUSPENDED' ? 'Askıya al' : 'Aktif et'}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border text-sm"
            onClick={() =>
              patchMutation.mutate({ isTestAccount: !t.is_test_account })
            }
          >
            {t.is_test_account ? 'Test işaretini kaldır' : 'Test hesabı işaretle'}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border text-sm"
            onClick={() => patchMutation.mutate({ extendDays: 30 })}
          >
            Süre uzat (+30g)
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm"
            onClick={() => {
              if (window.confirm('Firma arşivlensin mi? (pasif + arşiv)')) {
                patchMutation.mutate({ archive: true })
              }
            }}
          >
            Firmayı sil
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              tab === name ? 'bg-dock text-white' : 'bg-canvas-soft text-ink'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mc-panel mc-panel-asymmetric p-4 text-sm">
        {tab === 'Genel' && (
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-ink-faint">Plan</dt>
              <dd>{t.subscription_plan || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Bitiş</dt>
              <dd>{t.expires_at ? new Date(t.expires_at).toLocaleString('tr-TR') : '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Oluşturulma</dt>
              <dd>{t.created_at ? new Date(t.created_at).toLocaleString('tr-TR') : '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Depolama (MB)</dt>
              <dd>{t.storage_used_mb ?? '—'}</dd>
            </div>
          </dl>
        )}
        {tab === 'Abonelik' && (
          <p className="text-ink-soft">
            Plan: <strong>{t.subscription_plan || '—'}</strong>
            <br />
            Detaylı abonelik işlemleri için{' '}
            <Link className="underline" to="/admin/abonelikler">
              Abonelikler
            </Link>{' '}
            sayfasını kullanın.
          </p>
        )}
        {tab === 'Kullanıcılar' && (
          <ul className="space-y-2">
            {(data.users || []).map((u: any) => (
              <li key={u.id} className="flex justify-between border-b border-canvas-line/50 pb-2">
                <span>
                  {u.email} · {tenantRoleLabel(u.tenant_role)}
                </span>
                <span className="text-ink-faint">{u.is_active ? 'Aktif' : 'Pasif'}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === 'Markalar' && (
          <ul className="space-y-2">
            {(data.brands || []).map((b: any) => (
              <li key={b.id}>{b.name}</li>
            ))}
            {(!data.brands || data.brands.length === 0) && (
              <li className="text-ink-soft">Marka yok</li>
            )}
          </ul>
        )}
        {tab === 'Kanallar' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Mail hesapları / e-posta kanalları</h3>
              <ul className="space-y-1">
                {mailChannels.map((c: any) => (
                  <li key={c.id}>
                    {c.display_name} · {c.status === 'ACTIVE' ? 'Aktif' : c.status}
                  </li>
                ))}
                {mailChannels.length === 0 && <li className="text-ink-soft">Yok</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">WhatsApp</h3>
              <ul className="space-y-1">
                {waChannels.map((c: any) => (
                  <li key={c.id}>
                    {c.display_name} · {c.phone_or_email || '—'} ·{' '}
                    {c.status === 'ACTIVE' ? 'Aktif' : c.status}
                  </li>
                ))}
                {waChannels.length === 0 && <li className="text-ink-soft">Yok</li>}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">SMS</h3>
              <ul className="space-y-1">
                {smsChannels.map((c: any) => (
                  <li key={c.id}>
                    {c.display_name} · {c.status === 'ACTIVE' ? 'Aktif' : c.status}
                  </li>
                ))}
                {smsChannels.length === 0 && <li className="text-ink-soft">Yok</li>}
              </ul>
            </div>
          </div>
        )}
        {tab === 'Notlar' && (
          <div className="space-y-2">
            <textarea
              className="w-full px-3 py-2 rounded-xl border text-sm min-h-[120px]"
              defaultValue={t.admin_notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yönetici notu"
            />
            <button
              type="button"
              className="px-3 py-2 rounded-xl bg-dock text-white text-sm"
              onClick={() => patchMutation.mutate({ adminNotes: notes || t.admin_notes || '' })}
            >
              Notu kaydet
            </button>
          </div>
        )}
        {tab === 'Denetim' && (
          <ul className="space-y-2">
            {(data.audit || []).map((a: any) => (
              <li key={a.id} className="text-xs border-b border-canvas-line/50 pb-2">
                {new Date(a.created_at).toLocaleString('tr-TR')} · {a.action} · {a.entity_type}#
                {a.entity_id}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
