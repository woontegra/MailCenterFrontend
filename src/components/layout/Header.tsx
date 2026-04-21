import { Search, User, Menu } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Maillerde ara..."
            className="w-full pl-11 pr-4 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:bg-white focus:shadow-sm transition-all"
          />
        </div>
      </div>

      {/* User menu */}
      <div className="flex items-center gap-2 lg:gap-3 ml-2 lg:ml-6">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Demo Modu</p>
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  )
}
