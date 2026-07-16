import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Inbox, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Akış' },
  { to: '/inbox', icon: Inbox, label: 'Gelen' },
  { to: '/settings', icon: Settings, label: 'Ayarlar' },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-3 mb-3 rounded-2xl rounded-tr-md border border-canvas-line bg-white/90 backdrop-blur shadow-panel">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-colors ${
                  isActive ? 'text-signal-deep' : 'text-ink-faint active:text-ink-soft'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute -top-px h-[2px] rounded-full bg-signal transition-all duration-300 ${
                      isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
