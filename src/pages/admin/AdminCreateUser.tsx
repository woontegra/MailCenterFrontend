import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, Plus } from 'lucide-react'
import { adminPlatformApi } from '../../services/api'
import { AdminBreadcrumb } from '../../layouts/AdminShell'
import { AdminError, AdminSkeleton } from '../../components/admin/AdminUi'
import {
  TENANT_ROLES,
  isUserCreatePickerCompany,
  tenantRoleLabel,
} from '../../utils/displayLabels'
import { useNotificationStore } from '../../store/notificationStore'

type SuccessPayload = {
  tenant: { id: number; name: string; expires_at?: string | null }
  user: { id: number; email: string; name?: string | null; tenant_role: string }
  temporaryPassword: string
  periodEnd?: string | null
  meta?: boolean
}

function defaultExpiresLocal(days = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function defaultPeriodEndLocal(days = 30): string {
  return defaultExpiresLocal(days)
}

export default function AdminCreateUser() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useNotificationStore((s) => s.addToast)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SuccessPayload | null>(null)
  const [metaMode, setMetaMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [firmModalOpen, setFirmModalOpen] = useState(false)
  const [justCreatedFirmIds, setJustCreatedFirmIds] = useState<number[]>([])

  const [tenantId, setTenantId] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [tenantRole, setTenantRole] = useState('AGENT')

  const [planCode, setPlanCode] = useState('STARTER')
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEndLocal())
  const [isTrial, setIsTrial] = useState(false)
  const [trialDays, setTrialDays] = useState(14)
  const [expiresAt, setExpiresAt] = useState('')

  const [modalName, setModalName] = useState('')
  const [modalEmail, setModalEmail] = useState('')
  const [modalError, setModalError] = useState('')

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin-platform-tenants-user-create'],
    queryFn: async () =>
      (await adminPlatformApi.tenants({ limit: 100 })).data?.data || [],
  })

  const companies = useMemo(() => {
    const rows = Array.isArray(tenantsData) ? tenantsData : []
    return rows.filter(isUserCreatePickerCompany)
  }, [tenantsData])

  const selectedCompany = companies.find((c: any) => String(c.id) === String(tenantId))
  const isFirstUser =
    metaMode ||
    justCreatedFirmIds.includes(Number(tenantId)) ||
    (selectedCompany && Number(selectedCompany.users_count || 0) === 0)
  const roleLocked = Boolean(isFirstUser)

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-platform-plans'],
    queryFn: async () => (await adminPlatformApi.plans()).data?.data || [],
  })
  const plans = Array.isArray(plansData) ? plansData : []
  const hasPlans = plans.length > 0
  const showSubscriptionFields = hasPlans && (metaMode || isFirstUser)

  useEffect(() => {
    if (roleLocked) setTenantRole('OWNER')
  }, [roleLocked, tenantId])

  useEffect(() => {
    if (metaMode) {
      setTenantId('')
      setTenantRole('OWNER')
      setIsTrial(true)
      setExpiresAt((v) => v || defaultExpiresLocal(14))
    }
  }, [metaMode])

  const firmMutation = useMutation({
    mutationFn: () =>
      adminPlatformApi.createFirm({
        companyName: modalName.trim(),
        companyEmail: modalEmail.trim() || undefined,
      }),
    onSuccess: (res) => {
      const tenant = res.data?.data?.tenant
      setModalError('')
      setFirmModalOpen(false)
      setModalName('')
      setModalEmail('')
      queryClient.invalidateQueries({ queryKey: ['admin-platform-tenants-user-create'] })
      if (tenant?.id) {
        setJustCreatedFirmIds((ids) => [...ids, Number(tenant.id)])
        setTenantId(String(tenant.id))
        setTenantRole('OWNER')
        setMetaMode(false)
        addToast({ type: 'success', title: 'Firma oluşturuldu', message: tenant.name })
      }
    },
    onError: (err: any) =>
      setModalError(err.response?.data?.error || 'Firma oluşturulamadı'),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (metaMode) {
        return adminPlatformApi.createAccount({
          mode: 'meta_review',
          companyName: 'Meta Review',
          companyEmail: userEmail,
          userName,
          userEmail,
          temporaryPassword: temporaryPassword || undefined,
          tenantRole: 'OWNER',
          isTestAccount: true,
          expiresAt: expiresAt || undefined,
          planCode: hasPlans ? planCode : undefined,
          periodEnd: hasPlans && periodEnd ? periodEnd : undefined,
          isTrial: true,
          notes: 'Meta App Review inceleme hesabı',
        })
      }
      return adminPlatformApi.createAccount({
        mode: 'existing',
        tenantId: Number(tenantId),
        userName,
        userEmail,
        temporaryPassword: temporaryPassword || undefined,
        tenantRole: roleLocked ? 'OWNER' : tenantRole,
        planCode: showSubscriptionFields ? planCode : undefined,
        periodEnd: showSubscriptionFields && periodEnd ? periodEnd : undefined,
        isTrial: showSubscriptionFields ? isTrial : undefined,
        expiresAt:
          showSubscriptionFields && (expiresAt || (isTrial && trialDays))
            ? expiresAt ||
              (() => {
                const d = new Date()
                d.setDate(d.getDate() + trialDays)
                return d.toISOString()
              })()
            : undefined,
      })
    },
    onSuccess: (res) => {
      const data = res.data?.data
      setError('')
      setSuccess({
        tenant: data.tenant,
        user: data.user,
        temporaryPassword: data.temporaryPassword,
        periodEnd: periodEnd || data.tenant?.expires_at || null,
        meta: metaMode,
      })
      addToast({ type: 'success', title: 'Kullanıcı oluşturuldu' })
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-platform-tenants-user-create'] })
      queryClient.invalidateQueries({ queryKey: ['admin-control-center'] })
    },
    onError: (err: any) =>
      setError(
        err.response?.data?.error ||
          (err.response?.status === 409
            ? 'Bu e-posta adresi zaten kullanılıyor.'
            : 'Kullanıcı oluşturulamadı')
      ),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!metaMode && !tenantId) return setError('Firma seçimi zorunlu')
    if (!userName.trim()) return setError('Ad soyad zorunlu')
    if (!userEmail.includes('@')) return setError('Geçerli bir e-posta girin')
    if (metaMode && !expiresAt) return setError('Son kullanma tarihi zorunlu')
    createMutation.mutate()
  }

  const resetForm = () => {
    setSuccess(null)
    setError('')
    setMetaMode(false)
    setTenantId('')
    setUserName('')
    setUserEmail('')
    setTemporaryPassword('')
    setTenantRole('AGENT')
    setIsTrial(false)
    setExpiresAt('')
    setPeriodEnd(defaultPeriodEndLocal())
  }

  const copySuccess = () => {
    if (!success) return
    const text = [
      `Firma: ${success.tenant.name}`,
      `Ad Soyad: ${success.user.name || '—'}`,
      `E-posta: ${success.user.email}`,
      `Rol: ${tenantRoleLabel(success.user.tenant_role)}`,
      `Geçici Parola: ${success.temporaryPassword}`,
      success.tenant.expires_at
        ? `Son kullanma: ${new Date(success.tenant.expires_at).toLocaleString('tr-TR')}`
        : '',
      success.periodEnd
        ? `Abonelik bitiş: ${new Date(success.periodEnd).toLocaleString('tr-TR')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
    void navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: 'Bilgiler kopyalandı' })
  }

  if (tenantsLoading || plansLoading) return <AdminSkeleton rows={8} />

  if (success) {
    return (
      <div className="space-y-4 w-full">
        <AdminBreadcrumb
          withHome
          items={[
            { label: 'Kullanıcı Yönetimi', to: '/admin/kullanicilar' },
            { label: 'Yeni Kullanıcı' },
          ]}
        />
        <div className="mc-panel mc-panel-asymmetric p-6 lg:p-8 max-w-3xl">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Kullanıcı Başarıyla Oluşturuldu
          </h1>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
            Geçici parola yalnızca bu ekranda gösterilir.
          </p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-faint">Firma</dt>
              <dd className="font-medium text-ink">{success.tenant.name}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Ad Soyad</dt>
              <dd className="font-medium text-ink">{success.user.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">E-posta</dt>
              <dd className="font-medium text-ink">{success.user.email}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Rol</dt>
              <dd className="font-medium text-ink">
                {tenantRoleLabel(success.user.tenant_role)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-faint">Geçici Parola</dt>
              <dd className="font-mono font-semibold text-ink text-base mt-0.5">
                {success.temporaryPassword}
              </dd>
            </div>
            {(success.periodEnd || success.tenant.expires_at) && (
              <div>
                <dt className="text-ink-faint">Abonelik / Son kullanma</dt>
                <dd className="font-medium text-ink">
                  {new Date(
                    success.periodEnd || success.tenant.expires_at!
                  ).toLocaleString('tr-TR')}
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              type="button"
              onClick={copySuccess}
              className="px-4 py-2.5 rounded-xl bg-dock text-white text-sm"
            >
              Bilgileri Kopyala
            </button>
            <Link
              to="/admin/kullanicilar"
              className="px-4 py-2.5 rounded-xl border text-sm hover:bg-canvas-soft"
            >
              Kullanıcı Yönetimine Git
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl border text-sm hover:bg-canvas-soft"
            >
              Yeni Kullanıcı Oluştur
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <AdminBreadcrumb
        withHome
        items={[
          { label: 'Kullanıcı Yönetimi', to: '/admin/kullanicilar' },
          { label: 'Yeni Kullanıcı' },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/kullanicilar')}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm text-ink hover:bg-canvas-soft transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">
              Yeni Kullanıcı
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              Yeni bir kullanıcı ve gerekli hesap bilgilerini oluşturun.
            </p>
          </div>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm mc-panel px-4 py-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={metaMode}
          onChange={(e) => setMetaMode(e.target.checked)}
          className="rounded border-canvas-line"
        />
        <span>
          <span className="font-medium text-ink">Meta İnceleme Hesabı Oluştur</span>
          <span className="block text-xs text-ink-faint">
            Ayrı test firması; gerçek veri kopyalanmaz.
          </span>
        </span>
      </label>

      {error && <AdminError message={error} />}

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Firma Bilgisi */}
        <section className="mc-panel mc-panel-asymmetric p-5 lg:p-6">
          <h2 className="font-semibold text-ink mb-4">Firma Bilgisi</h2>
          {metaMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink-soft">Firma</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm bg-canvas-soft"
                  value="Meta Review"
                  readOnly
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-soft">Son kullanma tarihi</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <label className="block text-sm flex-1 min-w-0">
                <span className="text-ink-soft">Firma</span>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm bg-white"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  required
                >
                  <option value="">Firma seçiniz</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {Number(c.users_count || 0) === 0 ? ' · Yeni' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setModalError('')
                  setFirmModalOpen(true)
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-signal/30 text-signal-deep text-sm hover:bg-signal/5 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Yeni Firma Ekle
              </button>
            </div>
          )}
        </section>

        {/* Kullanıcı Bilgisi */}
        <section className="mc-panel mc-panel-asymmetric p-5 lg:p-6">
          <h2 className="font-semibold text-ink mb-4">Kullanıcı Bilgisi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-soft">Ad Soyad</span>
              <input
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">E-posta</span>
              <input
                type="email"
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Parola</span>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 rounded-xl border text-sm font-mono"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Boş bırakılırsa otomatik üretilir"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Gizle' : 'Göster'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Rol</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm disabled:bg-canvas-soft"
                value={roleLocked ? 'OWNER' : tenantRole}
                onChange={(e) => setTenantRole(e.target.value)}
                disabled={roleLocked}
              >
                {TENANT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {tenantRoleLabel(r)}
                  </option>
                ))}
              </select>
              {roleLocked && (
                <span className="text-[11px] text-ink-faint mt-1 block">
                  İlk kullanıcı otomatik olarak Sahip atanır.
                </span>
              )}
            </label>
          </div>
        </section>

        {/* Abonelik */}
        {hasPlans && (
          <section className="mc-panel mc-panel-asymmetric p-5 lg:p-6">
            <h2 className="font-semibold text-ink mb-4">Abonelik Bilgisi</h2>
            {showSubscriptionFields ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-ink-soft">Abonelik Planı</span>
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                  >
                    {plans.map((p: any) => (
                      <option key={p.id || p.code} value={String(p.code || p.name).toUpperCase()}>
                        {p.display_name || p.name || p.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-ink-soft">Abonelik Bitiş Tarihi</span>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={isTrial || metaMode}
                    disabled={metaMode}
                    onChange={(e) => setIsTrial(e.target.checked)}
                  />
                  Deneme Hesabı
                </label>
                {(isTrial || metaMode) && (
                  <>
                    <label className="block text-sm">
                      <span className="text-ink-soft">Deneme Süresi (gün)</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                        value={trialDays}
                        onChange={(e) => {
                          const days = Number(e.target.value)
                          setTrialDays(days)
                          setExpiresAt(defaultExpiresLocal(days))
                          setPeriodEnd(defaultPeriodEndLocal(days))
                        }}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-soft">Son Kullanma Tarihi</span>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                Mevcut firmanın aboneliği korunur. Abonelik değişiklikleri için Abonelik Yönetimi
                ekranını kullanın.
              </p>
            )}
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => navigate('/admin/kullanicilar')}
            className="px-4 py-2.5 rounded-xl border text-sm hover:bg-canvas-soft"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-60"
          >
            {createMutation.isPending ? 'Oluşturuluyor…' : 'Kullanıcı Oluştur'}
          </button>
        </div>
      </form>

      {firmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md mc-panel p-5 shadow-2xl animate-[fadeIn_0.2s_ease]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yeni-firma-baslik"
          >
            <h3 id="yeni-firma-baslik" className="font-display text-lg font-semibold text-ink">
              Yeni Firma Ekle
            </h3>
            {modalError && (
              <div className="mt-3">
                <AdminError message={modalError} />
              </div>
            )}
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-ink-soft">Firma Adı</span>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-soft">Firma E-posta Adresi</span>
                <input
                  type="email"
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  placeholder="Opsiyonel"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-xl border text-sm"
                onClick={() => setFirmModalOpen(false)}
              >
                İptal
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-60"
                disabled={firmMutation.isPending || !modalName.trim()}
                onClick={() => firmMutation.mutate()}
              >
                {firmMutation.isPending ? 'Oluşturuluyor…' : 'Firma Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
