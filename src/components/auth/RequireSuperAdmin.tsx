import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Platform SUPER_ADMIN gate (users.role === 'super_admin'). No separate login. */
export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'super_admin') return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
