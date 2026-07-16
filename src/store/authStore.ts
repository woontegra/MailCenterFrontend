import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Permission =
  | 'TEAM_MANAGE'
  | 'BRAND_MANAGE'
  | 'CHANNEL_MANAGE'
  | 'SENDER_IDENTITY_MANAGE'
  | 'TEMPLATE_VIEW'
  | 'TEMPLATE_MANAGE'
  | 'CONTACT_VIEW'
  | 'CONTACT_MANAGE'
  | 'CONVERSATION_VIEW'
  | 'CONVERSATION_REPLY'
  | 'CONVERSATION_ASSIGN'
  | 'INTERNAL_NOTE_CREATE'
  | 'EMAIL_SEND'
  | 'SMS_SEND'
  | 'WHATSAPP_SEND'
  | 'OUTBOUND_VIEW'
  | 'OUTBOUND_RETRY'
  | 'DELIVERABILITY_VIEW'
  | 'DELIVERABILITY_MANAGE'
  | 'ANALYTICS_VIEW'
  | 'SETTINGS_MANAGE'
  | 'AUTOMATION_VIEW'
  | 'AUTOMATION_MANAGE'
  | 'AUTOMATION_RUN'

export type TenantRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER'

interface User {
  id: number
  email: string
  tenant_id: number
  name?: string | null
  role?: string
  tenant_role?: TenantRole | null
  permissions?: Permission[]
  permission_version?: number
  entitlements?: any
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
  hasPermission: (permission: Permission | Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      hasPermission: (permission) => {
        const perms = new Set(get().user?.permissions || [])
        const needed = Array.isArray(permission) ? permission : [permission]
        return needed.every((p) => perms.has(p))
      },
      hasAnyPermission: (permissions) => {
        const perms = new Set(get().user?.permissions || [])
        return permissions.some((p) => perms.has(p))
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
