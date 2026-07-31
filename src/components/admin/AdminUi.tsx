import { Link } from 'react-router-dom'
import { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Yönetim</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function AdminStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="mc-panel mc-panel-asymmetric p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-1">{value}</p>
    </div>
  )
}

export function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-canvas-line/40" />
      ))}
    </div>
  )
}

export function AdminEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mc-panel mc-panel-asymmetric p-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-soft mt-1">{hint}</p>}
    </div>
  )
}

export function AdminError({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
      {message}
    </div>
  )
}

export function AdminSearch({
  value,
  onChange,
  placeholder = 'Ara…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="px-3 py-2 rounded-xl border text-sm flex-1 min-w-[12rem] bg-white"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="mc-panel overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function AdminLinkButton({
  to,
  children,
  primary,
}: {
  to: string
  children: ReactNode
  primary?: boolean
}) {
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-xl text-sm transition-colors ${
        primary ? 'bg-signal text-white' : 'border border-canvas-line text-ink hover:bg-canvas-soft'
      }`}
    >
      {children}
    </Link>
  )
}
