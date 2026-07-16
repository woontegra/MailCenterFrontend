import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import CommunicationInbox from './pages/CommunicationInbox'
import Accounts from './pages/Accounts'
import Tags from './pages/Tags'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import Automation from './pages/Automation'
import CompanyInbox from './pages/CompanyInbox'
import Brands from './pages/Brands'
import Channels from './pages/Channels'
import SenderIdentities from './pages/SenderIdentities'
import Templates from './pages/Templates'
import Compose from './pages/Compose'
import ComposeSms from './pages/ComposeSms'
import ComposeWhatsApp from './pages/ComposeWhatsApp'
import WhatsAppInbox from './pages/WhatsAppInbox'
import Drafts from './pages/Drafts'
import Deliverability from './pages/Deliverability'
import OutboundCenter from './pages/OutboundCenter'
import Contacts from './pages/Contacts'
import Team from './pages/Team'
import BillingUsage from './pages/BillingUsage'
import Forbidden from './pages/Forbidden'
import ToastContainer from './components/common/Toast'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import InviteAccept from './pages/auth/InviteAccept'
import { RequirePermission } from './components/auth/RequirePermission'
import PlatformLayout from './layouts/PlatformLayout'
import PlatformOverview from './pages/platform/PlatformOverview'
import PlatformTenants from './pages/platform/PlatformTenants'
import PlatformTenantDetail from './pages/platform/PlatformTenantDetail'
import PlatformPlans from './pages/platform/PlatformPlans'
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
          name: data.name,
          role: data.role,
          tenant_role: data.tenant_role,
          permissions: data.permissions || [],
          permission_version: data.permission_version,
          entitlements: data.entitlements || null,
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
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/forbidden" element={<Forbidden />} />

        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<PlatformOverview />} />
          <Route path="tenants" element={<PlatformTenants />} />
          <Route path="tenants/:id" element={<PlatformTenantDetail />} />
          <Route path="plans" element={<PlatformPlans />} />
        </Route>

        <Route path="/" element={token && user ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route
            path="conversations"
            element={
              <RequirePermission permission="CONVERSATION_VIEW">
                <CommunicationInbox />
              </RequirePermission>
            }
          />
          <Route
            path="communication-inbox"
            element={
              <RequirePermission permission="CONVERSATION_VIEW">
                <CommunicationInbox />
              </RequirePermission>
            }
          />
          <Route path="inbox" element={<Inbox />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="brands" element={<Brands />} />
          <Route path="deliverability" element={<Deliverability />} />
          <Route
            path="outbound"
            element={
              <RequirePermission permission="OUTBOUND_VIEW">
                <OutboundCenter />
              </RequirePermission>
            }
          />
          <Route
            path="contacts"
            element={
              <RequirePermission permission="CONTACT_VIEW">
                <Contacts />
              </RequirePermission>
            }
          />
          <Route path="channels" element={<Channels />} />
          <Route path="sender-identities" element={<SenderIdentities />} />
          <Route
            path="templates"
            element={
              <RequirePermission permission="TEMPLATE_VIEW">
                <Templates />
              </RequirePermission>
            }
          />
          <Route
            path="compose"
            element={
              <RequirePermission permission="EMAIL_SEND">
                <Compose />
              </RequirePermission>
            }
          />
          <Route
            path="compose/sms"
            element={
              <RequirePermission permission="SMS_SEND">
                <ComposeSms />
              </RequirePermission>
            }
          />
          <Route
            path="compose/whatsapp"
            element={
              <RequirePermission permission="WHATSAPP_SEND">
                <ComposeWhatsApp />
              </RequirePermission>
            }
          />
          <Route path="inbox/whatsapp" element={<WhatsAppInbox />} />
          <Route path="drafts" element={<Drafts />} />
          <Route
            path="team"
            element={
              <RequirePermission permission="TEAM_MANAGE">
                <Team />
              </RequirePermission>
            }
          />
          <Route path="tags" element={<Tags />} />
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="automation"
            element={
              <RequirePermission permission="AUTOMATION_VIEW">
                <Automation />
              </RequirePermission>
            }
          />
          <Route path="companies" element={<CompanyInbox />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/billing" element={<BillingUsage />} />
          <Route path="billing" element={<BillingUsage />} />
        </Route>
        <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
