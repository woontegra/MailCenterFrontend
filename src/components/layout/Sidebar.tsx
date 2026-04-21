import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Inbox, Mail, Tag, Settings, BarChart3, Zap, Building2, X } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Genel Bakış' },
  { to: '/inbox', icon: Inbox, label: 'Gelen Kutusu' },
  { to: '/companies', icon: Building2, label: 'Firmalar' },
  { to: '/accounts', icon: Mail, label: 'Hesaplar' },
  { to: '/tags', icon: Tag, label: 'Etiketler' },
  { to: '/analytics', icon: BarChart3, label: 'Analitik' },
  { to: '/automation', icon: Zap, label: 'Otomasyon' },
  { to: '/settings', icon: Settings, label: 'Ayarlar' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-100 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gray-800">MailCenter</h1>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-gray-100 text-black font-medium'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
