import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Cable,
  CheckCircle2,
  CircleDashed,
  Mail,
  MessageCircle,
  MessageSquare,
  Radio,
} from 'lucide-react'
import { accountApi, brandApi, channelConnectionApi, templateApi } from '../services/api'

type ChannelType = 'EMAIL' | 'SMS' | 'WHATSAPP'

const statusMeta: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ACTIVE: {
    label: 'Bağlı',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  NOT_CONFIGURED: {
    label: 'Bağlı değil',
    className: 'bg-canvas-soft text-ink-soft border-canvas-line',
    icon: CircleDashed,
  },
  DISABLED: {
    label: 'Pasif',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: CircleDashed,
  },
  ERROR: {
    label: 'Hatalı',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  TESTING: {
    label: 'Test ediliyor',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Radio,
  },
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function idleLabel(status?: string | null) {
  const s = String(status || '').toUpperCase()
  if (s === 'LISTENING' || s === 'IDLE' || s === 'ACTIVE') return 'Canlı dinleme açık'
  if (s === 'CONNECTING') return 'Bağlanıyor'
  if (s === 'ERROR') return 'Dinleme hatası'
  if (s === 'DISABLED' || !s) return 'Canlı dinleme kapalı'
  return s
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] || statusMeta.NOT_CONFIGURED
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  )
}

export default function Channels() {
  const [brandFilter, setBrandFilter] = useState('')

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => {
      const res = await channelConnectionApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountApi.getAccounts()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: waTemplates = [] } = useQuery({
    queryKey: ['templates-wa-all'],
    queryFn: async () => {
      const res = await templateApi.list({ channel_type: 'WHATSAPP' })
      const rows = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      return rows
    },
  })

  const visibleBrands = useMemo(() => {
    if (!brandFilter) return brands
    return brands.filter((b: any) => String(b.id) === brandFilter)
  }, [brands, brandFilter])

  const isLoading = brandsLoading || connectionsLoading

  const rows = useMemo(() => {
    return visibleBrands.map((brand: any) => {
      const brandConnections = connections.filter((c: any) => Number(c.brand_id) === Number(brand.id))
      const emailConn = brandConnections.find((c: any) => c.channel_type === 'EMAIL') || null
      const smsConn = brandConnections.find((c: any) => c.channel_type === 'SMS') || null
      const waConn = brandConnections.find((c: any) => c.channel_type === 'WHATSAPP') || null
      const brandAccounts = accounts.filter((a: any) => Number(a.brand_id) === Number(brand.id))
      const listening = brandAccounts.some((a: any) => {
        const s = String(a.imap_idle_status || '').toUpperCase()
        return s === 'LISTENING' || s === 'IDLE' || s === 'ACTIVE'
      })

      return {
        brand,
        email: {
          connection: emailConn,
          accountCount: brandAccounts.length,
          imapOk: brandAccounts.some((a: any) => a.imap_connection_status === 'ok' || a.is_active),
          smtpOk: brandAccounts.some((a: any) => a.smtp_connection_status === 'ok' || a.is_active),
          idle: listening
            ? 'Canlı dinleme açık'
            : brandAccounts.length
              ? idleLabel(brandAccounts[0]?.imap_idle_status)
              : 'Canlı dinleme yok',
        },
        sms: {
          connection: smsConn,
          provider: smsConn?.provider || null,
          header: smsConn?.settings?.default_msgheader || null,
          lastTest: smsConn?.last_tested_at || null,
        },
        whatsapp: {
          connections: brandConnections.filter((c: any) => c.channel_type === 'WHATSAPP'),
          connection: waConn,
          phone: waConn?.phone_number || waConn?.settings?.business_phone_number || null,
          verifiedName: waConn?.settings?.verified_name || waConn?.display_name || null,
          wabaName: waConn?.settings?.waba_name || null,
          webhookStatus: waConn?.settings?.webhook_status || null,
          approvedTemplates:
            waConn?.settings?.approved_template_count ??
            waTemplates.filter(
              (t: any) =>
                Number(t.brand_id) === Number(brand.id) &&
                String(t.provider_approval_status || '').toUpperCase() === 'APPROVED'
            ).length,
          lastInbound: waConn?.settings?.last_inbound_at || null,
          lastOutbound: waConn?.settings?.last_outbound_at || null,
          lastTest: waConn?.last_tested_at || null,
        },
      }
    })
  }, [visibleBrands, connections, accounts, waTemplates])

  function channelStatus(connection: any, fallbackConnected?: boolean): string {
    if (!connection && !fallbackConnected) return 'NOT_CONFIGURED'
    if (!connection && fallbackConnected) return 'ACTIVE'
    return connection.status || 'NOT_CONFIGURED'
  }

  function whatsappCardStatus(waConnections: any[]): string {
    if (!waConnections.length) return 'NOT_CONFIGURED'
    if (waConnections.some((c) => String(c.status).toUpperCase() === 'ACTIVE')) return 'ACTIVE'
    if (waConnections.some((c) => String(c.status).toUpperCase() === 'ERROR')) return 'ERROR'
    if (waConnections.some((c) => String(c.status).toUpperCase() === 'DISABLED')) return 'DISABLED'
    return waConnections[0]?.status || 'NOT_CONFIGURED'
  }

  function waPhoneLabel(c: any): string {
    return (
      c.phone_number ||
      c.settings?.business_phone_number ||
      c.settings?.business_phone ||
      '—'
    )
  }

  function waNameLabel(c: any): string {
    return c.settings?.verified_name || c.display_name || 'WhatsApp'
  }

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Entegrasyon</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">
            Kanal Bağlantıları
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-2xl">
            Her marka için e-posta, SMS ve WhatsApp bağlantılarını buradan yönetin. Kanal
            kurulumu Gönderim Kimlikleri sayfasından ayrıdır.
          </p>
        </div>
        <select
          className="px-3 py-2 rounded-xl bg-white border border-canvas-line text-sm min-w-[12rem]"
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="">Tüm markalar</option>
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-canvas-line/40" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center">
          <Cable className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">Önce bir marka oluşturun</p>
          <p className="text-sm text-ink-soft mt-1 mb-4">
            Kanal bağlantıları markaya bağlanır.
          </p>
          <Link
            to="/brands"
            className="inline-flex px-4 py-2 rounded-xl bg-dock text-white text-sm"
          >
            Markalara git
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map(({ brand, email, sms, whatsapp }: any) => (
            <section key={brand.id} className="mc-panel mc-panel-asymmetric overflow-hidden">
              <header className="px-5 py-4 border-b border-canvas-line/70 flex items-center gap-3 bg-white/70">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: brand.accent_color || '#1a2332' }}
                />
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">{brand.name}</h2>
                  <p className="text-xs text-ink-faint">{brand.slug || brand.domain || '—'}</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                {/* EMAIL */}
                <article className="rounded-xl border border-canvas-line bg-white p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-dock/8 text-dock flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-medium text-ink">E-posta</p>
                        <p className="text-xs text-ink-faint">IMAP / SMTP</p>
                      </div>
                    </div>
                    <StatusBadge
                      status={channelStatus(email.connection, email.accountCount > 0)}
                    />
                  </div>
                  <ul className="text-sm text-ink-soft space-y-1.5 flex-1">
                    <li>
                      Bağlı hesap:{' '}
                      <span className="text-ink font-medium">{email.accountCount}</span>
                    </li>
                    <li>
                      IMAP/SMTP:{' '}
                      <span className="text-ink font-medium">
                        {email.accountCount === 0
                          ? 'Bağlı değil'
                          : email.imapOk || email.smtpOk
                            ? 'Yapılandırıldı'
                            : 'Kontrol edilmeli'}
                      </span>
                    </li>
                    <li>
                      Dinleme:{' '}
                      <span className="text-ink font-medium">{email.idle}</span>
                    </li>
                  </ul>
                  <Link
                    to="/accounts"
                    className="mt-4 w-full py-2.5 rounded-xl bg-dock text-white text-sm font-medium hover:bg-dock-raised transition-colors text-center block"
                  >
                    E-posta hesabı bağla
                  </Link>
                </article>

                {/* SMS */}
                <article className="rounded-xl border border-canvas-line bg-white p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-signal/10 text-signal-deep flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-medium text-ink">SMS</p>
                        <p className="text-xs text-ink-faint">Netgsm ve diğerleri</p>
                      </div>
                    </div>
                    <StatusBadge status={channelStatus(sms.connection)} />
                  </div>
                  <ul className="text-sm text-ink-soft space-y-1.5 flex-1">
                    <li>
                      Sağlayıcı:{' '}
                      <span className="text-ink font-medium">{sms.provider || '—'}</span>
                    </li>
                    <li>
                      Gönderici başlığı:{' '}
                      <span className="text-ink font-medium">{sms.header || '—'}</span>
                    </li>
                    <li>
                      Son başarılı gönderim / test:{' '}
                      <span className="text-ink font-medium">{formatTime(sms.lastTest)}</span>
                    </li>
                  </ul>
                  <Link
                    to={`/channels/sms/setup?brandId=${brand.id}`}
                    className="mt-4 w-full py-2.5 rounded-xl bg-signal text-white text-sm font-medium hover:bg-signal-deep transition-colors text-center block"
                  >
                    {sms.connection ? 'SMS kanalını düzenle' : 'SMS kanalını bağla'}
                  </Link>
                </article>

                {/* WhatsApp */}
                <article className="rounded-xl border border-canvas-line bg-white p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-medium text-ink">WhatsApp</p>
                        <p className="text-xs text-ink-faint">Meta Cloud</p>
                      </div>
                    </div>
                    <StatusBadge status={whatsappCardStatus(whatsapp.connections)} />
                  </div>
                  <p className="text-xs text-ink-soft mb-3 leading-relaxed">
                    {whatsapp.connections.some((c: any) => {
                      const phone = String(
                        c.phone_number ||
                          c.settings?.business_phone_number ||
                          c.settings?.business_phone ||
                          ''
                      )
                      const d = phone.replace(/\D/g, '')
                      return d === '15551548955' || d.endsWith('5551548955')
                    })
                      ? 'Meta inceleme test bağlantısı. Gerçek müşteri numarası bağlantısı Advanced Access onayından sonra kullanılabilir.'
                      : 'Test numarası bağlı olsa bile mevcut WhatsApp Business numaranızı ayrıca bağlayabilirsiniz.'}
                  </p>
                  <ul className="text-sm text-ink-soft space-y-1.5 flex-1">
                    {whatsapp.connections.length === 0 ? (
                      <li>
                        Bağlantı:{' '}
                        <span className="text-ink font-medium">Yok</span>
                      </li>
                    ) : (
                      whatsapp.connections.map((c: any) => (
                        <li key={c.id}>
                          <span className="text-ink font-medium">{waNameLabel(c)}</span>
                          {' · '}
                          <span className="text-ink">{waPhoneLabel(c)}</span>
                          {' · '}
                          <span className="text-xs">{c.status}</span>
                        </li>
                      ))
                    )}
                    <li>
                      Onaylı şablon:{' '}
                      <span className="text-ink font-medium">{whatsapp.approvedTemplates}</span>
                    </li>
                    <li>
                      Son gönderim:{' '}
                      <span className="text-ink font-medium">
                        {formatTime(whatsapp.lastOutbound || whatsapp.lastTest)}
                      </span>
                    </li>
                  </ul>
                  <div className="mt-4 space-y-2">
                    <Link
                      to={`/channels/whatsapp/setup?brandId=${brand.id}&intent=coexistence`}
                      className="w-full py-2.5 rounded-xl bg-[#1877F2] text-white text-sm font-medium hover:opacity-95 transition-opacity text-center block"
                    >
                      Mevcut WhatsApp Business numarasını bağla
                    </Link>
                    <Link
                      to={`/channels/whatsapp/setup?brandId=${brand.id}`}
                      className="w-full py-2.5 rounded-xl bg-dock text-white text-sm font-medium hover:bg-dock-raised transition-colors text-center block"
                    >
                      {whatsapp.connections.length
                        ? 'Bağlantıyı yönet'
                        : 'WhatsApp kanalını bağla'}
                    </Link>
                  </div>
                </article>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl border border-canvas-line bg-canvas-soft/50 text-sm text-ink-soft flex items-start gap-2">
        <Radio className="w-4 h-4 mt-0.5 shrink-0 text-signal" />
        <p>
          Gönderim Kimlikleri sayfası yalnızca gönderen adres / başlık / numara tanımlarını
          yönetir. Kanal API bağlantısını burada kurun.
        </p>
      </div>
    </div>
  )
}

export type { ChannelType }
