import { useState, useRef, useEffect } from 'react'
import { Search, Menu, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const email = user?.email || ''
  const initial = email ? email.charAt(0).toUpperCase() : '?'

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 mc-shell pt-4 lg:pt-5 pb-2">
      <div className="flex items-center gap-3 lg:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-xl bg-white/80 border border-canvas-line text-ink-soft hover:text-ink transition-colors"
          aria-label="Menüyü aç"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              type="search"
              placeholder="Maillerde, kişilerde ve şablonlarda ara"
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-white/70 border border-canvas-line/90
                rounded-2xl rounded-tr-md text-ink placeholder:text-ink-faint
                focus:outline-none focus:border-signal/50 focus:bg-white focus:shadow-panel
                transition-all duration-200"
            />
          </div>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl
              bg-white/80 border border-canvas-line hover:border-signal/40 hover:bg-white
              transition-all duration-200"
            aria-label="Kullanıcı menüsü"
          >
            <div className="w-8 h-8 rounded-lg rounded-tr-sm bg-dock text-signal-soft font-display text-sm font-semibold flex items-center justify-center">
              {initial}
            </div>
            <span className="hidden md:block text-sm text-ink max-w-[10rem] truncate">{email}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-faint transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 mc-panel mc-panel-asymmetric p-2 z-50">
              <div className="px-3 py-2 border-b border-canvas-line/70 mb-1">
                <p className="text-xs text-ink-faint">Oturum</p>
                <p className="text-sm text-ink truncate">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-canvas-soft rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
