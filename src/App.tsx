import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Accounts from './pages/Accounts'
import Tags from './pages/Tags'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Automation from './pages/Automation'
import CompanyInbox from './pages/CompanyInbox'
import ToastContainer from './components/common/Toast'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import { useAuthStore } from './store/authStore'
import { authApi } from './services/api'

function App() {
  const { token, user, logout, setAuth } = useAuthStore()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setCheckingAuth(false)
        return
      }

      try {
        const { data } = await authApi.me()
        setAuth(token, {
          id: data.id,
          email: data.email,
          tenant_id: data.tenant_id,
        })
      } catch (_error) {
        logout()
      } finally {
        setCheckingAuth(false)
      }
    }

    verifySession()
  }, [token, setAuth, logout])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        Oturum doğrulanıyor...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />

        <Route path="/" element={token && user ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="tags" element={<Tags />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="automation" element={<Automation />} />
          <Route path="companies" element={<CompanyInbox />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
