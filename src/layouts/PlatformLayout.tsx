import { NavLink, Outlet, Navigate, Link } from 'react-router-dom'
import { Building2, LayoutDashboard, Layers, LogOut, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { APP_DISPLAY_NAME } from '../config/app'

const nav = [
  { to: '/platform', end: true, icon: LayoutDashboard, label: 'Genel Bakış' },
  { to: '/platform/tenants', end: false, icon: Building2, label: 'Firmalar' },
  { to: '/platform/plans', end: false, icon: Layers, label: 'Planlar' },
]

export default function PlatformLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/forbidden" replace />
  }

  return (
    <div className="min-h-screen flex bg-[#0f141c] text-white">
      <aside className="w-60 shrink-0 border-r border-white/10 p-4 flex flex-col">
        <p className="font-display text-lg font-semibold mb-1">{APP_DISPLAY_NAME}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/80 mb-6">
          Platform Yönetim Merkezi
        </p>
        <nav className="space-y-1 flex-1">
          {nav.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-teal-500/20 text-teal-200' : 'text-white/70 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white mb-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana uygulamaya dön
        </Link>
        <button
          type="button"
          onClick={() => {
            logout()
            window.location.href = '/login'
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Çıkış
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-[#121820] to-[#1a2332]">
        <Outlet />
      </main>
    </div>
  )
}
