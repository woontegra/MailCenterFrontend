import { Link } from 'react-router-dom'
import { Outlet } from 'react-router-dom'

/** Admin layout: no top tabs — hub cards on /admin, pages use breadcrumbs. */
export default function AdminShell() {
  return (
    <div className="mc-shell pt-1 pb-8 min-h-[calc(100vh-4rem)]">
      <Outlet />
    </div>
  )
}

export function AdminBreadcrumb({
  items,
  withHome = false,
}: {
  items: { label: string; to?: string }[]
  withHome?: boolean
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft mb-4">
      {withHome && (
        <>
          <Link to="/" className="hover:text-signal-deep transition-colors">
            Ana Sayfa
          </Link>
          <span className="text-ink-faint">›</span>
        </>
      )}
      <Link to="/admin" className="hover:text-signal-deep transition-colors">
        Admin Paneli
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
          <span className="text-ink-faint">›</span>
          {item.to ? (
            <Link to={item.to} className="hover:text-signal-deep transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
