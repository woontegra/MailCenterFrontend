import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import { AdminEmpty, AdminError, AdminSkeleton, AdminTable } from '../../components/admin/AdminUi'

function OverviewPage({
  title,
  crumb,
  queryKey,
  fetcher,
  columns,
  empty,
}: {
  title: string
  crumb: string
  queryKey: string
  fetcher: () => Promise<any[]>
  columns: { key: string; label: string; render: (row: any) => ReactNode }[]
  empty: string
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: fetcher,
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message={`${title} yüklenemedi`} />
  const rows = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <AdminBreadcrumb items={[{ label: crumb }]} />
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      {rows.length === 0 ? (
        <AdminEmpty title={empty} />
      ) : (
        <AdminTable>
          <thead>
            <tr className="text-left text-ink-faint border-b border-canvas-line">
              {columns.map((c) => (
                <th key={c.key} className="p-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id} className="border-b border-canvas-line/60">
                {columns.map((c) => (
                  <td key={c.key} className="p-3">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  )
}

export function AdminChannels() {
  return (
    <OverviewPage
      title="Kanal Bağlantıları"
      crumb="Kanal Bağlantıları"
      queryKey="admin-channels-overview"
      fetcher={async () => (await adminPlatformApi.channelsOverview()).data?.data || []}
      empty="Kanal bağlantısı yok"
      columns={[
        {
          key: 'tenant',
          label: 'Firma',
          render: (r) => (
            <Link className="underline text-signal-deep" to={`/admin/firmalar/${r.tenant_id}`}>
              {r.tenant_name}
            </Link>
          ),
        },
        {
          key: 'type',
          label: 'Kanal',
          render: (r) => {
            const t = String(r.channel_type || '').toUpperCase()
            if (t === 'WHATSAPP') return 'WhatsApp'
            if (t === 'EMAIL' || t === 'MAIL') return 'E-posta'
            if (t === 'SMS') return 'SMS'
            return t || '—'
          },
        },
        { key: 'name', label: 'Görünen ad', render: (r) => r.display_name || '—' },
        {
          key: 'status',
          label: 'Durum',
          render: (r) => {
            const s = String(r.status || '').toUpperCase()
            if (s === 'ACTIVE' || s === 'CONNECTED') return 'Aktif'
            if (s === 'INACTIVE' || s === 'DISCONNECTED') return 'Pasif'
            return s || '—'
          },
        },
        {
          key: 'created',
          label: 'Oluşturma',
          render: (r) =>
            r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—',
        },
      ]}
    />
  )
}

export function AdminBrands() {
  return (
    <OverviewPage
      title="Marka Yönetimi"
      crumb="Marka Yönetimi"
      queryKey="admin-brands-overview"
      fetcher={async () => (await adminPlatformApi.brandsOverview()).data?.data || []}
      empty="Marka kaydı yok"
      columns={[
        {
          key: 'tenant',
          label: 'Firma',
          render: (r) => (
            <Link className="underline text-signal-deep" to={`/admin/firmalar/${r.tenant_id}`}>
              {r.tenant_name}
            </Link>
          ),
        },
        { key: 'name', label: 'Marka', render: (r) => r.name },
        { key: 'slug', label: 'Kısa ad', render: (r) => r.slug || '—' },
        {
          key: 'status',
          label: 'Durum',
          render: (r) => (r.is_active !== false ? 'Aktif' : 'Pasif'),
        },
        {
          key: 'created',
          label: 'Oluşturma',
          render: (r) =>
            r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—',
        },
      ]}
    />
  )
}

export function AdminMailAccounts() {
  return (
    <OverviewPage
      title="Mail Hesapları"
      crumb="Mail Hesapları"
      queryKey="admin-mail-accounts-overview"
      fetcher={async () => (await adminPlatformApi.mailAccountsOverview()).data?.data || []}
      empty="Mail hesabı yok"
      columns={[
        {
          key: 'tenant',
          label: 'Firma',
          render: (r) => (
            <Link className="underline text-signal-deep" to={`/admin/firmalar/${r.tenant_id}`}>
              {r.tenant_name}
            </Link>
          ),
        },
        { key: 'email', label: 'E-posta', render: (r) => r.email },
        {
          key: 'status',
          label: 'Durum',
          render: (r) => (r.is_active !== false ? 'Aktif' : 'Pasif'),
        },
        {
          key: 'created',
          label: 'Oluşturma',
          render: (r) =>
            r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—',
        },
      ]}
    />
  )
}

export function AdminWhatsApp() {
  return (
    <OverviewPage
      title="WhatsApp Yönetimi"
      crumb="WhatsApp Yönetimi"
      queryKey="admin-whatsapp-overview"
      fetcher={async () => {
        const rows = (await adminPlatformApi.channelsOverview()).data?.data || []
        return rows.filter((r: any) => String(r.channel_type).toUpperCase() === 'WHATSAPP')
      }}
      empty="WhatsApp bağlantısı yok"
      columns={[
        {
          key: 'tenant',
          label: 'Firma',
          render: (r) => (
            <Link className="underline text-signal-deep" to={`/admin/firmalar/${r.tenant_id}`}>
              {r.tenant_name}
            </Link>
          ),
        },
        { key: 'name', label: 'Görünen ad', render: (r) => r.display_name || '—' },
        {
          key: 'status',
          label: 'Durum',
          render: (r) => {
            const s = String(r.status || '').toUpperCase()
            if (s === 'ACTIVE' || s === 'CONNECTED') return 'Aktif'
            if (s === 'INACTIVE' || s === 'DISCONNECTED') return 'Pasif'
            return s || '—'
          },
        },
        {
          key: 'created',
          label: 'Oluşturma',
          render: (r) =>
            r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—',
        },
      ]}
    />
  )
}
