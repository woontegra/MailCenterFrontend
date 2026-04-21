import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="w-full min-h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
