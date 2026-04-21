import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

// TODO: Auth sayfaları veritabanı hazır olunca eklenecek
// import Login from './pages/auth/Login'
// import Register from './pages/auth/Register'
// import { useAuthStore } from './store/authStore'

function App() {
  // Geçici olarak auth kontrolü kapalı
  // const { token } = useAuthStore()

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Auth routes - veritabanı hazır olunca açılacak */}
        {/* <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} /> */}
        
        {/* Ana routes - şimdilik auth olmadan erişilebilir */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="tags" element={<Tags />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="automation" element={<Automation />} />
          <Route path="companies" element={<CompanyInbox />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
