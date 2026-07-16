import { Navigate } from 'react-router-dom'
import { useAuthStore, Permission } from '../../store/authStore'
import Forbidden from '../../pages/Forbidden'

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission | Permission[]
  children: React.ReactNode
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission(permission)) {
    return <Forbidden />
  }
  return <>{children}</>
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
