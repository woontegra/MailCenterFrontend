import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  Building2,
  ClipboardList,
  FileText,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageCircle,
  PlusCircle,
  Radio,
  Send,
  Shield,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { adminPlatformApi } from '../../services/api'
import { AdminError, AdminSkeleton } from '../../components/admin/AdminUi'

type HubStats = Record<string, number | string | undefined>

type HubCard = {
  key: string
  title: string
  description: string
  to: string
  icon: LucideIcon
  accent: string
  stats: (hub: any) => { label: string; value: string | number }[]
}

const CARDS: HubCard[] = [
  {
    key: 'control',
    title: 'Kontrol Merkezi',
    description: 'Platform genel nabız ve özet durum.',
    to: '/admin',
    icon: LayoutDashboard,
    accent: 'from-teal-600/15 to-cyan-500/5',
    stats: (h) => [
      { label: 'Firma', value: h?.control?.firms ?? 0 },
      { label: 'Kullanıcı', value: h?.control?.users ?? 0 },
      { label: 'Kritik hata', value: h?.control?.errors ?? 0 },
    ],
  },
  {
    key: 'firms',
    title: 'Firma Yönetimi',
    description: 'Firmaları ara, filtrele ve yönet.',
    to: '/admin/firmalar',
    icon: Building2,
    accent: 'from-sky-600/15 to-blue-500/5',
    stats: (h) => [
      { label: 'Toplam firma', value: h?.firms?.total ?? 0 },
      { label: 'Aktif', value: h?.firms?.active ?? 0 },
      { label: 'Deneme', value: h?.firms?.trial ?? 0 },
      { label: 'Pasif', value: h?.firms?.inactive ?? 0 },
    ],
  },
  {
    key: 'users',
    title: 'Kullanıcı Yönetimi',
    description: 'Kullanıcıları listeleyin ve yönetin.',
    to: '/admin/kullanicilar',
    icon: Users,
    accent: 'from-indigo-600/15 to-violet-500/5',
    stats: (h) => [
      { label: 'Toplam', value: h?.users?.total ?? 0 },
      { label: 'Aktif', value: h?.users?.active ?? 0 },
      { label: 'Pasif', value: h?.users?.inactive ?? 0 },
    ],
  },
  {
    key: 'createUser',
    title: 'Yeni Kullanıcı',
    description: 'Mevcut veya yeni firmaya kullanıcı oluşturun.',
    to: '/admin/yeni-kullanici',
    icon: PlusCircle,
    accent: 'from-emerald-600/15 to-teal-500/5',
    stats: (h) => [
      { label: 'Toplam kullanıcı', value: h?.users?.total ?? 0 },
      { label: 'Bugün firma', value: h?.createFirm?.today ?? 0 },
    ],
  },
  {
    key: 'subscriptions',
    title: 'Abonelik Yönetimi',
    description: 'Plan, deneme ve yenileme işlemleri.',
    to: '/admin/abonelikler',
    icon: ClipboardList,
    accent: 'from-amber-600/15 to-orange-500/5',
    stats: (h) => [
      { label: 'Toplam', value: h?.subscriptions?.total ?? 0 },
      { label: 'Aktif', value: h?.subscriptions?.active ?? 0 },
      { label: 'İptal', value: h?.subscriptions?.cancelled ?? 0 },
    ],
  },
  {
    key: 'licenses',
    title: 'Lisans Yönetimi',
    description: 'Lisans anahtarları ve durumları.',
    to: '/admin/lisanslar',
    icon: KeyRound,
    accent: 'from-fuchsia-600/15 to-pink-500/5',
    stats: (h) => [
      { label: 'Toplam', value: h?.licenses?.total ?? 0 },
      { label: 'Aktif', value: h?.licenses?.active ?? 0 },
      { label: 'İptal', value: h?.licenses?.revoked ?? 0 },
    ],
  },
  {
    key: 'channels',
    title: 'Kanal Bağlantıları',
    description: 'E-posta, WhatsApp ve SMS bağlantıları.',
    to: '/admin/kanallar',
    icon: Radio,
    accent: 'from-cyan-600/15 to-sky-500/5',
    stats: (h) => [
      { label: 'Toplam', value: h?.channels?.total ?? 0 },
      { label: 'Aktif', value: h?.channels?.active ?? 0 },
      { label: 'WhatsApp', value: h?.channels?.whatsapp ?? 0 },
      { label: 'SMS', value: h?.channels?.sms ?? 0 },
    ],
  },
  {
    key: 'brands',
    title: 'Marka Yönetimi',
    description: 'Tüm firmalardaki markaları görüntüle.',
    to: '/admin/markalar',
    icon: Tags,
    accent: 'from-rose-600/15 to-red-500/5',
    stats: (h) => [{ label: 'Toplam marka', value: h?.brands?.total ?? 0 }],
  },
  {
    key: 'mail',
    title: 'Mail Hesapları',
    description: 'Platform genelindeki e-posta hesapları.',
    to: '/admin/mail-hesaplari',
    icon: Mail,
    accent: 'from-blue-600/15 to-indigo-500/5',
    stats: (h) => [{ label: 'Toplam hesap', value: h?.mailAccounts?.total ?? 0 }],
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp Yönetimi',
    description: 'WhatsApp bağlantıları ve gönderimler.',
    to: '/admin/whatsapp',
    icon: MessageCircle,
    accent: 'from-green-600/15 to-emerald-500/5',
    stats: (h) => [
      { label: 'Bağlantı', value: h?.whatsapp?.connections ?? 0 },
      { label: 'Son 24s gönderim', value: h?.whatsapp?.sent24h ?? 0 },
    ],
  },
  {
    key: 'queues',
    title: 'Gönderim Kuyruğu',
    description: 'Bekleyen, başarısız ve günlük gönderimler.',
    to: '/admin/kuyruklar',
    icon: Send,
    accent: 'from-slate-600/15 to-zinc-500/5',
    stats: (h) => [
      { label: 'Bekleyen', value: h?.queues?.waiting ?? 0 },
      { label: 'Başarısız', value: h?.queues?.failed ?? 0 },
      { label: 'Son 24s', value: h?.queues?.sent24h ?? 0 },
    ],
  },
  {
    key: 'support',
    title: 'Destek Talepleri',
    description: 'Açık talepler ve destek işlemleri.',
    to: '/admin/destek',
    icon: LifeBuoy,
    accent: 'from-orange-600/15 to-amber-500/5',
    stats: (h) => [{ label: 'Açık talep', value: h?.support?.open ?? 0 }],
  },
  {
    key: 'health',
    title: 'Sistem Sağlığı',
    description: 'Veritabanı ve kritik sistem durumu.',
    to: '/admin/sistem-sagligi',
    icon: HeartPulse,
    accent: 'from-red-600/15 to-rose-500/5',
    stats: (h) => [
      { label: 'Hata', value: h?.health?.errors ?? 0 },
      { label: 'Veritabanı', value: h?.health?.db === 'ok' ? 'Sağlıklı' : 'Kontrol' },
    ],
  },
  {
    key: 'audit',
    title: 'Audit / İşlem Kayıtları',
    description: 'Yönetim işlemlerinin denetim izi.',
    to: '/admin/islem-kayitlari',
    icon: Activity,
    accent: 'from-violet-600/15 to-purple-500/5',
    stats: (h) => [
      { label: 'Toplam kayıt', value: h?.audit?.total ?? 0 },
      { label: 'Son kayıtlar', value: h?.audit?.recent ?? 0 },
    ],
  },
  {
    key: 'logs',
    title: 'Sistem Logları',
    description: 'Uygulama ve sistem günlükleri.',
    to: '/admin/sistem-loglari',
    icon: FileText,
    accent: 'from-stone-600/15 to-neutral-500/5',
    stats: (h) => [{ label: 'Son kayıt', value: h?.logs?.recent ?? 0 }],
  },
  {
    key: 'security',
    title: 'Güvenlik Merkezi',
    description: 'Oturumlar, cihazlar ve güvenlik olayları.',
    to: '/admin/guvenlik',
    icon: Shield,
    accent: 'from-teal-700/15 to-emerald-600/5',
    stats: (h) => [
      { label: 'Aktif oturum', value: h?.security?.sessions ?? 0 },
      { label: 'Hata', value: h?.security?.errors ?? 0 },
    ],
  },
]

function HubCardView({
  card,
  hub,
  index,
}: {
  card: HubCard
  hub: HubStats
  index: number
}) {
  const Icon = card.icon
  const stats = card.stats(hub)
  return (
    <Link
      to={card.to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br ${card.accent} bg-white/80 p-5 shadow-[0_18px_50px_-28px_rgba(15,40,55,0.45)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-24px_rgba(15,40,55,0.55)] hover:border-signal/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/40 blur-2xl transition-opacity group-hover:opacity-80" />
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dock text-white shadow-lg shadow-dock/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-ink leading-tight">{card.title}</h2>
          <p className="mt-1 text-sm text-ink-soft line-clamp-2">{card.description}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-ink-faint truncate">{s.label}</dt>
            <dd className="font-semibold text-ink tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto pt-5 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-signal-deep transition-all group-hover:gap-2">
          Yönet
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}

export default function AdminOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-control-center'],
    queryFn: async () => (await adminPlatformApi.controlCenter()).data?.data,
    refetchInterval: 60_000,
  })

  if (isLoading) return <AdminSkeleton rows={10} />
  if (error || !data) return <AdminError message="Kontrol merkezi yüklenemedi" />

  const hub = data.hub || {}

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(14,116,144,0.12),_transparent_60%)]" />

      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.2em] text-signal-deep mb-1">Admin Paneli</p>
        <h1 className="font-display text-3xl lg:text-4xl font-semibold text-ink">Kontrol Merkezi</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          MailCenter platform yönetimine hoş geldiniz. Aşağıdaki kartlardan ilgili modüle geçin;
          özetler canlı sistem verilerinden üretilir.
        </p>
      </header>

      <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 animate-[fadeIn_0.5s_ease]">
        {CARDS.map((card, i) => (
          <HubCardView key={card.key} card={card} hub={hub} index={i} />
        ))}
      </div>
    </div>
  )
}
