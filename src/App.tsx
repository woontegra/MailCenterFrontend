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
import ChannelSmsSetup from './pages/ChannelSmsSetup'
import ChannelWhatsAppSetup from './pages/ChannelWhatsAppSetup'
import SenderIdentities from './pages/SenderIdentities'
import Templates from './pages/Templates'
import TemplateEditorPage from './pages/TemplateEditor'
import Compose from './pages/Compose'
import ComposeSms from './pages/ComposeSms'
import ComposeWhatsApp from './pages/ComposeWhatsApp'
import WhatsAppInbox from './pages/WhatsAppInbox'
import Drafts from './pages/Drafts'
import Deliverability from './pages/Deliverability'
import OutboundCenter from './pages/OutboundCenter'
import CampaignWizard from './pages/CampaignWizard'
import Contacts from './pages/Contacts'
import Team from './pages/Team'
import BillingUsage from './pages/BillingUsage'
import Forbidden from './pages/Forbidden'
import ToastContainer from './components/common/Toast'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import InviteAccept from './pages/auth/InviteAccept'
import { RequirePermission } from './components/auth/RequirePermission'
import { RequireSuperAdmin } from './components/auth/RequireSuperAdmin'
import PlatformLayout from './layouts/PlatformLayout'
import PlatformOverview from './pages/platform/PlatformOverview'
import PlatformTenants from './pages/platform/PlatformTenants'
import PlatformTenantDetail from './pages/platform/PlatformTenantDetail'
import PlatformPlans from './pages/platform/PlatformPlans'
import AdminOverview from './pages/admin/AdminOverview'
import AdminTenants from './pages/admin/AdminTenants'
import AdminTenantDetail from './pages/admin/AdminTenantDetail'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCreateUser from './pages/admin/AdminCreateUser'
import AdminShell from './layouts/AdminShell'
import {
  AdminSubscriptions,
  AdminLicenses,
  AdminSupport,
  AdminLiveChat,
  AdminSendStats,
  AdminSystemHealth,
  AdminQueues,
  AdminAuditPage,
  AdminLogs,
  AdminDevices,
  AdminDemo,
  AdminMeta,
  AdminSecurity,
} from './pages/admin/AdminModules'
import {
  AdminChannels,
  AdminBrands,
  AdminMailAccounts,
  AdminWhatsApp,
} from './pages/admin/AdminResourcePages'
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

        {/* Legacy dark platform shell — keep for compatibility; primary UI is /admin */}
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<PlatformOverview />} />
          <Route path="tenants" element={<PlatformTenants />} />
          <Route path="tenants/:id" element={<PlatformTenantDetail />} />
          <Route path="plans" element={<PlatformPlans />} />
        </Route>

        <Route path="/" element={token && user ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route
            path="admin"
            element={
              <RequireSuperAdmin>
                <AdminShell />
              </RequireSuperAdmin>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="yeni-kullanici" element={<AdminCreateUser />} />
            <Route path="firmalar" element={<AdminTenants />} />
            <Route path="firmalar/:id" element={<AdminTenantDetail />} />
            <Route path="kullanicilar" element={<AdminUsers />} />
            <Route path="abonelikler" element={<AdminSubscriptions />} />
            <Route path="lisanslar" element={<AdminLicenses />} />
            <Route path="kanallar" element={<AdminChannels />} />
            <Route path="markalar" element={<AdminBrands />} />
            <Route path="mail-hesaplari" element={<AdminMailAccounts />} />
            <Route path="whatsapp" element={<AdminWhatsApp />} />
            <Route path="destek" element={<AdminSupport />} />
            <Route path="canli-sohbet" element={<AdminLiveChat />} />
            <Route path="gonderim" element={<AdminSendStats />} />
            <Route path="sistem-sagligi" element={<AdminSystemHealth />} />
            <Route path="kuyruklar" element={<AdminQueues />} />
            <Route path="islem-kayitlari" element={<AdminAuditPage />} />
            <Route path="sistem-loglari" element={<AdminLogs />} />
            <Route path="cihazlar" element={<AdminDevices />} />
            <Route path="demo" element={<AdminDemo />} />
            <Route path="meta" element={<AdminMeta />} />
            <Route path="guvenlik" element={<AdminSecurity />} />
            {/* Eski yollar */}
            <Route path="firma-olustur" element={<Navigate to="/admin/yeni-kullanici" replace />} />
            <Route path="hesap-olustur" element={<Navigate to="/admin/yeni-kullanici" replace />} />
            <Route path="yeni-firma" element={<Navigate to="/admin/yeni-kullanici" replace />} />
            <Route path="tenants/create" element={<Navigate to="/admin/yeni-kullanici" replace />} />
            <Route path="tenants" element={<Navigate to="/admin/firmalar" replace />} />
            <Route path="tenants/:id" element={<AdminTenantDetail />} />
            <Route path="users" element={<Navigate to="/admin/kullanicilar" replace />} />
            <Route path="audit" element={<Navigate to="/admin/islem-kayitlari" replace />} />
            <Route path="loglar" element={<Navigate to="/admin/sistem-loglari" replace />} />
          </Route>
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
            path="outbound/campaigns/new"
            element={
              <RequirePermission permission="EMAIL_SEND">
                <CampaignWizard />
              </RequirePermission>
            }
          />
          <Route
            path="outbound/campaigns/:id/edit"
            element={
              <RequirePermission permission="EMAIL_SEND">
                <CampaignWizard />
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
          <Route path="channels">
            <Route index element={<Channels />} />
            <Route
              path="sms/setup"
              element={
                <RequirePermission permission="CHANNEL_MANAGE">
                  <ChannelSmsSetup />
                </RequirePermission>
              }
            />
            <Route
              path="whatsapp/setup"
              element={
                <RequirePermission permission="CHANNEL_MANAGE">
                  <ChannelWhatsAppSetup />
                </RequirePermission>
              }
            />
          </Route>
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
            path="templates/new"
            element={
              <RequirePermission permission="TEMPLATE_VIEW">
                <TemplateEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="templates/:id/edit"
            element={
              <RequirePermission permission="TEMPLATE_VIEW">
                <TemplateEditorPage />
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
