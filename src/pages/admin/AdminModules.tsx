import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSearch,
  AdminSkeleton,
  AdminStatCard,
  AdminTable,
} from '../../components/admin/AdminUi'

function useAdminQuery<T>(key: any[], fn: () => Promise<T>) {
  return useQuery({ queryKey: key, queryFn: fn })
}

function Crumb({ label }: { label: string }) {
  return <AdminBreadcrumb items={[{ label }]} />
}

export function AdminSubscriptions() {
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const { data, isLoading, error } = useAdminQuery(['admin-subs', q], async () =>
    ((await adminPlatformApi.subscriptions({ q: q || undefined })).data?.data || []) as any[]
  )
  const mut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      adminPlatformApi.updateSubscription(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subs'] }),
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Abonelikler yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  return (
    <div className="space-y-4">
      <Crumb label="Abonelik Yönetimi" />
      <AdminPageHeader title="Abonelik Yönetimi" subtitle="Plan, deneme, yenileme ve askıya alma" />
      <AdminSearch value={q} onChange={setQ} />
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Firma</th>
            <th className="p-3">Plan</th>
            <th className="p-3">Durum</th>
            <th className="p-3">Başlangıç</th>
            <th className="p-3">Bitiş</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-ink-soft">
                Abonelik kaydı yok
              </td>
            </tr>
          ) : (
            rows.map((s: any) => (
              <tr key={s.id} className="border-b border-canvas-line/50">
                <td className="p-3">
                  <Link className="underline text-signal-deep" to={`/admin/firmalar/${s.tenant_id}`}>
                    {s.tenant_name}
                  </Link>
                </td>
                <td className="p-3">{s.plan_name || '—'}</td>
                <td className="p-3">
                  {String(s.status || '').toUpperCase() === 'ACTIVE'
                    ? 'Aktif'
                    : String(s.status || '').toUpperCase() === 'TRIAL' ||
                        String(s.status || '').toUpperCase() === 'TRIALING'
                      ? 'Deneme'
                      : String(s.status || '').toUpperCase() === 'CANCELLED' ||
                          String(s.status || '').toUpperCase() === 'CANCELED'
                        ? 'İptal'
                        : String(s.status || '').toUpperCase() === 'SUSPENDED'
                          ? 'Askıda'
                          : s.status || '—'}
                </td>
                <td className="p-3 text-xs">
                  {s.current_period_start
                    ? new Date(s.current_period_start).toLocaleDateString('tr-TR')
                    : '—'}
                </td>
                <td className="p-3 text-xs">
                  {s.current_period_end
                    ? new Date(s.current_period_end).toLocaleDateString('tr-TR')
                    : '—'}
                </td>
                <td className="p-3 space-x-2 text-xs">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => mut.mutate({ id: s.id, body: { extendDays: 30 } })}
                  >
                    Uzat
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      mut.mutate({ id: s.id, body: { suspend: true, notes: 'Manuel askı' } })
                    }
                  >
                    Askıya al
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => mut.mutate({ id: s.id, body: { cancel: true } })}
                  >
                    İptal
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </div>
  )
}

export function AdminLicenses() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useAdminQuery(['admin-licenses'], async () =>
    ((await adminPlatformApi.licenses()).data?.data || []) as any[]
  )
  const create = useMutation({
    mutationFn: () =>
      adminPlatformApi.createLicense({
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-licenses'] }),
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      adminPlatformApi.updateLicense(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-licenses'] }),
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Lisanslar yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  return (
    <div className="space-y-4">
      <Crumb label="Lisans Yönetimi" />
      <AdminPageHeader
        title="Lisans Yönetimi"
        actions={
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-dock text-white text-sm"
            onClick={() => create.mutate()}
          >
            Lisans oluştur
          </button>
        }
      />
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Anahtar</th>
            <th className="p-3">Firma</th>
            <th className="p-3">Durum</th>
            <th className="p-3">Bitiş</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l: any) => (
            <tr key={l.id} className="border-b border-canvas-line/50">
              <td className="p-3 font-mono text-xs">{l.license_key}</td>
              <td className="p-3">{l.tenant_name || '—'}</td>
              <td className="p-3">
                {l.status === 'ACTIVE' ? 'Aktif' : l.status === 'REVOKED' ? 'İptal' : l.status}
              </td>
              <td className="p-3 text-xs">
                {l.expires_at ? new Date(l.expires_at).toLocaleDateString('tr-TR') : '—'}
              </td>
              <td className="p-3 space-x-2 text-xs">
                <button
                  type="button"
                  className="underline"
                  onClick={() => update.mutate({ id: l.id, body: { extendDays: 30 } })}
                >
                  Uzat
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() => update.mutate({ id: l.id, body: { revoke: true } })}
                >
                  İptal et
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {rows.length === 0 && <AdminEmpty title="Lisans yok" hint="Yeni lisans oluşturabilirsiniz." />}
    </div>
  )
}

export function AdminSupport() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [subject, setSubject] = useState('')
  const { data, isLoading, error } = useAdminQuery(['admin-support', status], async () =>
    ((await adminPlatformApi.supportTickets({ status: status || undefined })).data?.data ||
      []) as any[]
  )
  const create = useMutation({
    mutationFn: () => adminPlatformApi.createSupportTicket({ subject, priority: 'NORMAL' }),
    onSuccess: () => {
      setSubject('')
      qc.invalidateQueries({ queryKey: ['admin-support'] })
    },
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      adminPlatformApi.updateSupportTicket(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-support'] }),
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Destek talepleri yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  const statusLabel: Record<string, string> = {
    OPEN: 'Açık',
    IN_PROGRESS: 'İşleniyor',
    WAITING: 'Bekliyor',
    RESOLVED: 'Çözüldü',
    CLOSED: 'Kapalı',
  }
  return (
    <div className="space-y-4">
      <Crumb label="Destek Talepleri" />
      <AdminPageHeader title="Destek Talepleri" />
      <div className="flex flex-wrap gap-2">
        <select
          className="px-3 py-2 rounded-xl border text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          <option value="OPEN">Açık</option>
          <option value="IN_PROGRESS">İşleniyor</option>
          <option value="RESOLVED">Çözüldü</option>
        </select>
        <form
          className="flex flex-wrap gap-2 flex-1"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (subject.trim()) create.mutate()
          }}
        >
          <input
            className="px-3 py-2 rounded-xl border text-sm flex-1 min-w-[12rem]"
            placeholder="Yeni talep konusu"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <button type="submit" className="px-3 py-2 rounded-xl bg-dock text-white text-sm">
            Oluştur
          </button>
        </form>
      </div>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Konu</th>
            <th className="p-3">Firma</th>
            <th className="p-3">Durum</th>
            <th className="p-3">Öncelik</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t: any) => (
            <tr key={t.id} className="border-b border-canvas-line/50">
              <td className="p-3">{t.subject}</td>
              <td className="p-3">{t.tenant_name || '—'}</td>
              <td className="p-3">{statusLabel[t.status] || t.status}</td>
              <td className="p-3">
                {t.priority === 'HIGH' ? 'Yüksek' : t.priority === 'URGENT' ? 'Acil' : 'Normal'}
              </td>
              <td className="p-3 text-xs space-x-2">
                <button
                  type="button"
                  className="underline"
                  onClick={() => update.mutate({ id: t.id, body: { status: 'IN_PROGRESS' } })}
                >
                  Üstlen
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    update.mutate({
                      id: t.id,
                      body: {
                        status: 'RESOLVED',
                        resolutionNote: 'Çözüldü',
                        internalNote: 'Kapatıldı',
                      },
                    })
                  }
                >
                  Çöz
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {rows.length === 0 && <AdminEmpty title="Açık talep yok" />}
    </div>
  )
}

export function AdminLiveChat() {
  const { data, isLoading, error } = useAdminQuery(['admin-live-chat'], async () =>
    (await adminPlatformApi.liveChat()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Canlı sohbet yüklenemedi" />
  return (
    <div className="space-y-4">
      <Crumb label="Canlı Sohbet" />
      <AdminPageHeader title="Canlı Sohbet" />
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard label="Aktif konuşma" value={(data.conversations || []).length} />
        <AdminStatCard label="Bekleyen" value={data.waiting || 0} />
        <AdminStatCard label="Çevrimiçi kullanıcı" value={data.onlineUsers || 0} />
      </div>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Firma</th>
            <th className="p-3">Kanal</th>
            <th className="p-3">Durum</th>
            <th className="p-3">Mesaj</th>
            <th className="p-3">Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          {(data.conversations || []).map((c: any) => (
            <tr key={c.id} className="border-b border-canvas-line/50">
              <td className="p-3">{c.tenant_name}</td>
              <td className="p-3">{c.channel_type || '—'}</td>
              <td className="p-3">{c.status}</td>
              <td className="p-3">{c.message_count ?? '—'}</td>
              <td className="p-3 text-xs">
                {c.updated_at ? new Date(c.updated_at).toLocaleString('tr-TR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {(data.conversations || []).length === 0 && (
        <AdminEmpty title="Aktif konuşma yok" hint="Bekleyen müşteri konuşmaları burada listelenir." />
      )}
    </div>
  )
}

export function AdminSendStats() {
  const { data, isLoading, error } = useAdminQuery(['admin-send-stats'], async () =>
    (await adminPlatformApi.sendStats()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Gönderim istatistikleri yüklenemedi" />
  const t = data.totals || {}
  return (
    <div className="space-y-4">
      <Crumb label="Gönderim İstatistikleri" />
      <AdminPageHeader title="Gönderim İstatistikleri" subtitle="Son 30 gün" />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard label="Mail" value={t.mail || 0} />
        <AdminStatCard label="WhatsApp" value={t.whatsapp || 0} />
        <AdminStatCard label="SMS" value={t.sms || 0} />
        <AdminStatCard label="Başarılı" value={t.success || 0} />
        <AdminStatCard label="Başarısız" value={t.failed || 0} />
        <AdminStatCard label="Bekleyen" value={t.pending || 0} />
      </div>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Gün</th>
            <th className="p-3">Mail</th>
            <th className="p-3">WhatsApp</th>
            <th className="p-3">SMS</th>
            <th className="p-3">Başarılı</th>
            <th className="p-3">Başarısız</th>
          </tr>
        </thead>
        <tbody>
          {(data.days || []).map((d: any) => (
            <tr key={String(d.day)} className="border-b border-canvas-line/50">
              <td className="p-3 text-xs">
                {d.day ? new Date(d.day).toLocaleDateString('tr-TR') : '—'}
              </td>
              <td className="p-3">{d.mail}</td>
              <td className="p-3">{d.whatsapp}</td>
              <td className="p-3">{d.sms}</td>
              <td className="p-3">{d.success}</td>
              <td className="p-3">{d.failed}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  )
}

export function AdminSystemHealth() {
  const { data, isLoading, error } = useAdminQuery(['admin-health'], async () =>
    (await adminPlatformApi.systemHealth()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Sistem sağlığı yüklenemedi" />
  const label = (v: string) =>
    v === 'ok' ? 'Sağlıklı' : v === 'error' ? 'Hatalı' : v === 'disabled' ? 'Kapalı' : 'Bilinmiyor'
  return (
    <div className="space-y-4">
      <Crumb label="Sistem Sağlığı" />
      <AdminPageHeader title="Sistem Sağlığı" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="API" value={label(data.api)} />
        <AdminStatCard label="Veritabanı" value={label(data.database)} />
        <AdminStatCard label="Redis" value={label(data.redis)} />
        <AdminStatCard label="Kuyruk" value={label(data.queue)} />
        <AdminStatCard label="Mail işçisi" value={label(data.mailWorker)} />
        <AdminStatCard label="WhatsApp işçisi" value={label(data.whatsappWorker)} />
        <AdminStatCard label="RAM (MB)" value={data.ram?.heapUsedMb ?? '—'} />
        <AdminStatCard label="RSS (MB)" value={data.ram?.rssMb ?? '—'} />
      </div>
    </div>
  )
}

export function AdminQueues() {
  const { data, isLoading, error } = useAdminQuery(['admin-queues'], async () =>
    (await adminPlatformApi.queues()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Kuyruklar yüklenemedi" />
  const mail = data.mail || {}
  return (
    <div className="space-y-4">
      <Crumb label="Gönderim Kuyruğu" />
      <AdminPageHeader title="Gönderim Kuyruğu" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Mail bekleyen" value={mail.waiting ?? '—'} />
        <AdminStatCard label="Mail aktif" value={mail.active ?? '—'} />
        <AdminStatCard label="Mail başarısız" value={mail.failed ?? '—'} />
        <AdminStatCard label="Mail gecikmeli" value={mail.delayed ?? '—'} />
      </div>
      <h2 className="font-semibold text-ink">Başarısız işler</h2>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Kimlik</th>
            <th className="p-3">Ad</th>
            <th className="p-3">Neden</th>
          </tr>
        </thead>
        <tbody>
          {(data.failedJobs || []).map((j: any) => (
            <tr key={j.id} className="border-b border-canvas-line/50">
              <td className="p-3 font-mono text-xs">{j.id}</td>
              <td className="p-3">{j.name}</td>
              <td className="p-3 text-xs text-ink-soft">{j.failedReason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {(data.failedJobs || []).length === 0 && <AdminEmpty title="Başarısız iş yok" />}
    </div>
  )
}

export function AdminAuditPage() {
  const { data, isLoading, error } = useAdminQuery(['admin-audit-page'], async () =>
    ((await adminPlatformApi.audit()).data?.data || []) as any[]
  )
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Denetim kayıtları yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  return (
    <div className="space-y-4">
      <Crumb label="Audit / İşlem Kayıtları" />
      <AdminPageHeader title="Audit / İşlem Kayıtları" subtitle="Kim, ne yaptı, ne zaman" />
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Zaman</th>
            <th className="p-3">İşlem</th>
            <th className="p-3">Hedef</th>
            <th className="p-3">Firma</th>
            <th className="p-3">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a: any) => (
            <tr key={a.id} className="border-b border-canvas-line/50">
              <td className="p-3 text-xs">
                {a.created_at ? new Date(a.created_at).toLocaleString('tr-TR') : '—'}
              </td>
              <td className="p-3">{a.action}</td>
              <td className="p-3 text-xs">
                {a.entity_type}
                {a.entity_id ? `#${a.entity_id}` : ''}
              </td>
              <td className="p-3">{a.tenant_id || '—'}</td>
              <td className="p-3 text-xs">{a.ip_address || '—'}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  )
}

export function AdminLogs() {
  const [type, setType] = useState('application')
  const { data, isLoading, error } = useAdminQuery(['admin-logs', type], async () =>
    (await adminPlatformApi.logs({ type })).data
  )
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Loglar yüklenemedi" />
  const rows = Array.isArray(data?.data) ? data.data : []
  return (
    <div className="space-y-4">
      <Crumb label="Sistem Logları" />
      <AdminPageHeader title="Sistem Logları" />
      <select
        className="px-3 py-2 rounded-xl border text-sm"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="application">Uygulama / denetim</option>
        <option value="worker">İşçi / görev</option>
      </select>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Zaman</th>
            <th className="p-3">Mesaj</th>
            <th className="p-3">Firma</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-b border-canvas-line/50">
              <td className="p-3 text-xs">
                {r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—'}
              </td>
              <td className="p-3 text-xs">{r.message || r.action || r.job_type || '—'}</td>
              <td className="p-3">{r.tenant_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  )
}

export function AdminDevices() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useAdminQuery(['admin-devices'], async () =>
    ((await adminPlatformApi.devices()).data?.data || []) as any[]
  )
  const revoke = useMutation({
    mutationFn: (id: number) => adminPlatformApi.revokeDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-devices'] }),
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Cihazlar yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  return (
    <div className="space-y-4">
      <Crumb label="Cihaz Yönetimi" />
      <AdminPageHeader title="Cihaz Yönetimi" />
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Kullanıcı</th>
            <th className="p-3">Firma</th>
            <th className="p-3">IP</th>
            <th className="p-3">Son kullanım</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d: any) => (
            <tr key={d.id} className="border-b border-canvas-line/50">
              <td className="p-3">{d.email}</td>
              <td className="p-3">{d.tenant_name}</td>
              <td className="p-3 text-xs">{d.ip_address || '—'}</td>
              <td className="p-3 text-xs">
                {d.last_activity_at
                  ? new Date(d.last_activity_at).toLocaleString('tr-TR')
                  : '—'}
              </td>
              <td className="p-3 text-xs">
                <button type="button" className="underline" onClick={() => revoke.mutate(d.id)}>
                  Oturumu kapat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {rows.length === 0 && <AdminEmpty title="Aktif cihaz yok" />}
    </div>
  )
}

export function AdminDemo() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useAdminQuery(['admin-demo'], async () =>
    ((await adminPlatformApi.demoAccounts()).data?.data || []) as any[]
  )
  const extend = useMutation({
    mutationFn: (id: number) => adminPlatformApi.updateTenant(id, { extendDays: 14 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-demo'] }),
  })
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError message="Demo hesaplar yüklenemedi" />
  const rows = Array.isArray(data) ? data : []
  const expired = rows.filter((r: any) => r.expires_at && new Date(r.expires_at) < new Date())
  return (
    <div className="space-y-4">
      <Crumb label="Demo Yönetimi" />
      <AdminPageHeader title="Demo Yönetimi" />
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard label="Deneme hesabı" value={rows.length} />
        <AdminStatCard label="Süresi biten" value={expired.length} />
        <AdminStatCard label="Aktif deneme" value={rows.length - expired.length} />
      </div>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Firma</th>
            <th className="p-3">Sahip</th>
            <th className="p-3">Kalan gün</th>
            <th className="p-3">Bitiş</th>
            <th className="p-3">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t: any) => (
            <tr key={t.id} className="border-b border-canvas-line/50">
              <td className="p-3">
                <Link className="underline text-signal-deep" to={`/admin/firmalar/${t.id}`}>
                  {t.name}
                </Link>
              </td>
              <td className="p-3">{t.owner_email || '—'}</td>
              <td className="p-3">{t.days_left ?? '—'}</td>
              <td className="p-3 text-xs">
                {t.expires_at ? new Date(t.expires_at).toLocaleString('tr-TR') : '—'}
              </td>
              <td className="p-3 text-xs">
                <button type="button" className="underline" onClick={() => extend.mutate(t.id)}>
                  14 gün uzat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  )
}

export function AdminMeta() {
  const { data, isLoading, error } = useAdminQuery(['admin-meta'], async () =>
    (await adminPlatformApi.meta()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Meta yönetimi yüklenemedi" />
  return (
    <div className="space-y-4">
      <Crumb label="Meta Yönetimi" />
      <AdminPageHeader
        title="Meta Yönetimi"
        actions={
          <Link
            to="/admin/yeni-kullanici"
            className="px-3 py-2 rounded-xl bg-dock text-white text-sm"
          >
            Yeni Kullanıcı
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard label="İnceleme hesabı" value={(data.reviewAccounts || []).length} />
        <AdminStatCard label="WhatsApp bağlantısı" value={(data.whatsappConnections || []).length} />
        <AdminStatCard label="Onay bekleyen şablon" value={(data.pendingTemplates || []).length} />
      </div>
      <section className="mc-panel p-4">
        <h2 className="font-semibold mb-2">İnceleme hesapları</h2>
        <ul className="text-sm space-y-2">
          {(data.reviewAccounts || []).map((a: any) => (
            <li key={a.id}>
              <Link className="underline text-signal-deep" to={`/admin/firmalar/${a.id}`}>
                {a.name}
              </Link>
              <span className="text-ink-faint text-xs ml-2">
                {a.expires_at ? new Date(a.expires_at).toLocaleString('tr-TR') : ''}
              </span>
            </li>
          ))}
          {(data.reviewAccounts || []).length === 0 && (
            <li className="text-ink-soft">Kayıt yok</li>
          )}
        </ul>
      </section>
      <section className="mc-panel p-4">
        <h2 className="font-semibold mb-2">WhatsApp bağlantıları / webhook</h2>
        <p className="text-xs text-ink-soft mb-2">
          Doğrulanmış: {data.webhookSummary?.verified ?? 0} / {data.webhookSummary?.total ?? 0}
        </p>
        <ul className="text-sm space-y-2 max-h-64 overflow-auto">
          {(data.whatsappConnections || []).map((c: any) => (
            <li key={c.id} className="border-b border-canvas-line/40 pb-1">
              {c.tenant_name} · {c.display_name || '—'} ·{' '}
              {c.status === 'ACTIVE' ? 'Aktif' : c.status}
              {c.webhook_status ? ` · webhook: ${c.webhook_status}` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section className="mc-panel p-4">
        <h2 className="font-semibold mb-2">Onay bekleyen şablonlar</h2>
        <ul className="text-sm space-y-1">
          {(data.pendingTemplates || []).map((t: any) => (
            <li key={t.id}>{t.name} · Bekliyor</li>
          ))}
          {(data.pendingTemplates || []).length === 0 && (
            <li className="text-ink-soft">Bekleyen şablon yok</li>
          )}
        </ul>
      </section>
    </div>
  )
}

export function AdminSecurity() {
  const { data, isLoading, error } = useAdminQuery(['admin-security'], async () =>
    (await adminPlatformApi.security()).data?.data
  )
  if (isLoading) return <AdminSkeleton />
  if (error || !data) return <AdminError message="Güvenlik özeti yüklenemedi" />
  return (
    <div className="space-y-4">
      <Crumb label="Güvenlik Merkezi" />
      <AdminPageHeader title="Güvenlik Merkezi" />
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard label="Aktif oturum" value={data.activeSessions || 0} />
        <AdminStatCard label="Kanal hatası" value={data.channelErrors || 0} />
        <AdminStatCard label="API anahtarı" value={(data.apiKeys || []).length} />
      </div>
      <p className="text-sm text-ink-soft">{data.rateLimitNote}</p>
      <h2 className="font-semibold">Son girişler</h2>
      <AdminTable>
        <thead>
          <tr className="text-left text-ink-faint border-b border-canvas-line">
            <th className="p-3">Kullanıcı</th>
            <th className="p-3">IP</th>
            <th className="p-3">Zaman</th>
          </tr>
        </thead>
        <tbody>
          {(data.recentLogins || []).map((l: any) => (
            <tr key={l.id} className="border-b border-canvas-line/50">
              <td className="p-3">#{l.user_id}</td>
              <td className="p-3 text-xs">{l.ip_address || '—'}</td>
              <td className="p-3 text-xs">
                {l.login_at ? new Date(l.login_at).toLocaleString('tr-TR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </div>
  )
}
