import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  Mail,
  Tag,
  Settings,
  BarChart3,
  Zap,
  Building2,
  X,
  FileText,
  LayoutTemplate,
  PenSquare,
  BadgeCheck,
  Cable,
  Briefcase,
  ShieldCheck,
  Radio,
  UserRound,
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  Users,
  ChevronDown,
} from 'lucide-react'
import { APP_DISPLAY_NAME, APP_TAGLINE } from '../../config/app'
import { useAuthStore, Permission } from '../../store/authStore'

type NavItem = {
  to: string
  icon: typeof LayoutDashboard
  label: string
  permission?: Permission | Permission[]
}

type NavCategory = {
  id: string
  label: string
  defaultOpen: boolean
  items: NavItem[]
}

const STORAGE_KEY = 'mc-sidebar-categories'

const navCategories: NavCategory[] = [
  {
    id: 'ana',
    label: 'Ana',
    defaultOpen: true,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Akış' },
      {
        to: '/conversations',
        icon: MessagesSquare,
        label: 'İletişim Kutusu',
        permission: 'CONVERSATION_VIEW',
      },
    ],
  },
  {
    id: 'mesajlasma',
    label: 'Mesajlaşma',
    defaultOpen: true,
    items: [
      { to: '/compose/sms', icon: MessageSquare, label: 'SMS Yaz', permission: 'SMS_SEND' },
      {
        to: '/compose/whatsapp',
        icon: MessageCircle,
        label: 'WhatsApp Yaz',
        permission: 'WHATSAPP_SEND',
      },
      { to: '/drafts', icon: FileText, label: 'Taslaklar' },
      { to: '/outbound', icon: Radio, label: 'Gönderim Merkezi', permission: 'OUTBOUND_VIEW' },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim Yönetimi',
    defaultOpen: true,
    items: [
      { to: '/contacts', icon: UserRound, label: 'Kişiler', permission: 'CONTACT_VIEW' },
      { to: '/companies', icon: Briefcase, label: 'Firmalar' },
      { to: '/tags', icon: Tag, label: 'Etiketler' },
      { to: '/templates', icon: LayoutTemplate, label: 'Şablonlar', permission: 'TEMPLATE_VIEW' },
    ],
  },
  {
    id: 'marka',
    label: 'Marka ve Kanallar',
    defaultOpen: true,
    items: [
      { to: '/brands', icon: Building2, label: 'Markalar' },
      { to: '/accounts', icon: Mail, label: 'Hesaplar' },
      { to: '/channels', icon: Cable, label: 'Kanallar' },
      { to: '/sender-identities', icon: BadgeCheck, label: 'Gönderen Kimlikleri' },
      { to: '/deliverability', icon: ShieldCheck, label: 'Teslimat Sağlığı' },
    ],
  },
  {
    id: 'operasyon',
    label: 'Operasyon',
    defaultOpen: true,
    items: [
      { to: '/automation', icon: Zap, label: 'Otomasyon', permission: 'AUTOMATION_VIEW' },
      { to: '/analytics', icon: BarChart3, label: 'Analitik' },
      { to: '/team', icon: Users, label: 'Ekip', permission: 'TEAM_MANAGE' },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    defaultOpen: true,
    items: [
      {
        to: '/settings/billing',
        icon: Radio,
        label: 'Plan ve Kullanım',
        permission: 'SETTINGS_MANAGE',
      },
      { to: '/settings', icon: Settings, label: 'Ayarlar' },
    ],
  },
  {
    id: 'eski',
    label: 'Eski Görünümler',
    defaultOpen: false,
    items: [
      { to: '/inbox', icon: Inbox, label: 'Gelen Kutusu' },
      { to: '/inbox/whatsapp', icon: MessageCircle, label: 'WhatsApp Gelen' },
    ],
  },
]

function pathMatchesItem(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function readStoredOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredOpen(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const user = useAuthStore((s) => s.user)
  const isPlatformAdmin = user?.role === 'super_admin'

  const visibleCategories = useMemo(() => {
    return navCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) =>
          item.permission ? hasPermission(item.permission) : true
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [hasPermission])

  const activeCategoryId = useMemo(() => {
    for (const cat of visibleCategories) {
      if (cat.items.some((item) => pathMatchesItem(location.pathname, item.to))) {
        return cat.id
      }
    }
    return null
  }, [visibleCategories, location.pathname])

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const stored = readStoredOpen()
    const initial: Record<string, boolean> = {}
    for (const cat of navCategories) {
      initial[cat.id] = stored[cat.id] !== undefined ? Boolean(stored[cat.id]) : cat.defaultOpen
    }
    return initial
  })

  useEffect(() => {
    if (!activeCategoryId) return
    setOpenMap((prev) => {
      if (prev[activeCategoryId]) return prev
      const next = { ...prev, [activeCategoryId]: true }
      writeStoredOpen(next)
      return next
    })
  }, [activeCategoryId])

  const toggleCategory = useCallback(
    (id: string) => {
      setOpenMap((prev) => {
        const nextOpen = !prev[id]
        // Active category cannot be closed while its route is current
        if (!nextOpen && id === activeCategoryId) return prev
        const next = { ...prev, [id]: nextOpen }
        writeStoredOpen(next)
        return next
      })
    },
    [activeCategoryId]
  )

  const isCategoryOpen = (id: string) =>
    Boolean(openMap[id]) || id === activeCategoryId

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-[2px]"
          style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          mc-dock fixed lg:static inset-y-0 left-0 z-50
          w-[17.5rem] flex flex-col
          transform transition-transform duration-300 ease-out
          lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="relative shrink-0 px-5 pt-6 pb-5 border-b mc-dock-edge">
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(15,154,168,0.6), transparent)',
            }}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[1.35rem] font-semibold tracking-tight leading-none text-white">
                {APP_DISPLAY_NAME}
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] mc-dock-muted">
                {APP_TAGLINE}
              </p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg mc-dock-muted hover:text-white mc-dock-raised transition-colors"
              aria-label="Menüyü kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/compose')
              onClose()
            }}
            className="mc-dock-signal mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5
              text-white text-sm font-medium rounded-xl rounded-tr-sm transition-colors duration-200"
          >
            <PenSquare className="w-4 h-4" />
            Yeni Mail
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 scrollbar-hide">
          {visibleCategories.map((cat) => {
            const open = isCategoryOpen(cat.id)
            const isActiveCat = cat.id === activeCategoryId

            return (
              <div key={cat.id} className="pb-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md
                    text-[10px] font-medium uppercase tracking-[0.18em] transition-colors duration-200
                    ${isActiveCat ? 'text-signal-deep/90' : 'mc-dock-muted opacity-80 hover:opacity-100'}`}
                >
                  <span>{cat.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-out
                      ${open ? 'rotate-0' : '-rotate-90'}
                      ${isActiveCat ? 'text-signal-deep/80' : ''}`}
                  />
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out
                    ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="space-y-0.5 pt-0.5 pb-1">
                      {cat.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={
                            item.to === '/' ||
                            item.to === '/settings' ||
                            item.to === '/inbox'
                          }
                          onClick={onClose}
                          className={({ isActive }) =>
                            `group relative flex items-center gap-2.5 px-3 py-2 text-[13px] transition-all duration-200
                            rounded-lg rounded-br-none
                            ${isActive ? 'mc-dock-link-active' : 'mc-dock-link'}`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`mc-dock-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300 ease-out
                                  ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0 group-hover:h-2.5 group-hover:opacity-40'}`}
                              />
                              <item.icon
                                className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'mc-dock-indicator-glow' : ''}`}
                              />
                              <span className="font-medium tracking-tight truncate">
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 px-5 py-4 border-t mc-dock-edge space-y-3">
          {isPlatformAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/platform')
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-signal/30 text-signal-deep hover:bg-signal/10 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Platform Yönetim Merkezi
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full mc-dock-indicator animate-pulse-soft" />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: '#1bb8c7' }}
              />
            </span>
            <span className="text-[11px] mc-dock-muted tracking-wide">Sistem aktif</span>
          </div>
        </div>
      </aside>
    </>
  )
}
