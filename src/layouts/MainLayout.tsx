import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="w-full min-h-screen flex overflow-hidden mc-dot-grid">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <div className="pointer-events-none absolute inset-0 mc-tech-lines opacity-60" />
        <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto pb-20 lg:pb-0">
            <Outlet />
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
