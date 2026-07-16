import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Copy, Shield } from 'lucide-react'
import { brandApi, deliverabilityApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

type HealthStatus = 'NOT_CHECKED' | 'VALID' | 'WARNING' | 'INVALID' | 'ERROR'

const statusMeta: Record<
  HealthStatus,
  { label: string; color: string; ring: string }
> = {
  NOT_CHECKED: { label: 'Kontrol edilmedi', color: '#94a3b8', ring: 'rgba(148,163,184,0.35)' },
  VALID: { label: 'Geçerli', color: '#0f9aa8', ring: 'rgba(15,154,168,0.45)' },
  WARNING: { label: 'Uyarı', color: '#d97706', ring: 'rgba(217,119,6,0.4)' },
  INVALID: { label: 'Geçersiz', color: '#dc2626', ring: 'rgba(220,38,38,0.4)' },
  ERROR: { label: 'Hata', color: '#7f1d1d', ring: 'rgba(127,29,29,0.45)' },
}

function formatTime(value?: string | null) {
  if (!value) return 'Henüz kontrol edilmedi'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return 'Henüz kontrol edilmedi'
  }
}

function NodeBadge({
  label,
  status,
  angle,
}: {
  label: string
  status: HealthStatus
  angle: number
}) {
  const meta = statusMeta[status] || statusMeta.NOT_CHECKED
  const rad = (angle * Math.PI) / 180
  const radius = 118
  const x = Math.cos(rad) * radius
  const y = Math.sin(rad) * radius

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
    >
      <div
        className="min-w-[88px] rounded-xl px-3 py-2 text-center shadow-sm border bg-white/95"
        style={{ borderColor: meta.ring }}
      >
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: meta.color }}>
          {meta.label}
        </p>
      </div>
    </div>
  )
}

export default function Deliverability() {
  const queryClient = useQueryClient()
  const [brandId, setBrandId] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [selectorInput, setSelectorInput] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [scanning, setScanning] = useState(false)

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  useEffect(() => {
    if (!brandId && brands[0]) setBrandId(String(brands[0].id))
  }, [brands, brandId])

  const { data: health, isLoading } = useQuery({
    queryKey: ['deliverability', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await deliverabilityApi.get(Number(brandId))
      return res.data
    },
  })

  useEffect(() => {
    if (!health) return
    setDomainInput(health.domain || health.brand_domain || '')
    setSelectorInput(health.dkim_selector || '')
  }, [health])

  const saveSettings = useMutation({
    mutationFn: () =>
      deliverabilityApi.updateSettings(Number(brandId), {
        domain: domainInput || null,
        dkim_selector: selectorInput || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverability', brandId] })
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setInfo('Ayarlar kaydedildi')
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Ayarlar kaydedilemedi'),
  })

  const checkMutation = useMutation({
    mutationFn: async () => {
      setScanning(true)
      if (domainInput || selectorInput) {
        await deliverabilityApi.updateSettings(Number(brandId), {
          domain: domainInput || null,
          dkim_selector: selectorInput || null,
        })
      }
      return deliverabilityApi.check(Number(brandId), {
        domain: domainInput || undefined,
        dkim_selector: selectorInput || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverability', brandId] })
      setInfo('DNS kontrolü tamamlandı')
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'DNS kontrolü başarısız'),
    onSettled: () => {
      window.setTimeout(() => setScanning(false), 600)
    },
  })

  const overall = (health?.overall_status || 'NOT_CHECKED') as HealthStatus
  const overallMeta = statusMeta[overall]

  const copyText = async (value?: string | null) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setInfo('Kayıt panoya kopyalandı')
    } catch {
      setError('Kopyalama başarısız')
    }
  }

  const warnings = useMemo(() => {
    return Array.isArray(health?.warnings) ? health.warnings : []
  }, [health])

  const selectedBrand = brands.find((b: any) => String(b.id) === String(brandId))

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Koruma</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Teslimat Sağlığı</h1>
        <p className="text-sm text-ink-soft mt-1 max-w-2xl">
          {APP_DISPLAY_NAME} marka alan adınızın SPF, DKIM, DMARC ve MX hazırlığını kontrol eder.
          Bu ekran spam klasörüne düşmeyeceğini garanti etmez; yalnızca teknik DNS durumunu gösterir.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}
      {info && !error && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{info}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <section className="mc-panel mc-panel-asymmetric p-5 lg:p-8">
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <label className="space-y-1 min-w-[200px] flex-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Marka</span>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              >
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!brandId || checkMutation.isPending || scanning}
              onClick={() => checkMutation.mutate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${scanning || checkMutation.isPending ? 'animate-spin' : ''}`} />
              Yeniden Kontrol Et
            </button>
          </div>

          {isLoading ? (
            <div className="h-80 animate-pulse rounded-2xl bg-canvas-line/40" />
          ) : (
            <div className="relative mx-auto w-full max-w-[420px] aspect-square">
              <div
                className={`absolute inset-[12%] rounded-full border ${scanning ? 'deliverability-scan-ring' : ''}`}
                style={{ borderColor: overallMeta.ring }}
              />
              <div
                className="absolute inset-[26%] rounded-full border border-dashed"
                style={{ borderColor: overallMeta.ring }}
              />
              {scanning && <div className="deliverability-scan-beam absolute inset-[12%] rounded-full pointer-events-none" />}

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4 max-w-[180px]">
                  <Shield className="w-6 h-6 mx-auto mb-2" style={{ color: overallMeta.color }} />
                  <p className="font-display text-lg text-ink break-all leading-tight">
                    {health?.domain || domainInput || selectedBrand?.domain || 'alan-adı'}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.14em] mt-2" style={{ color: overallMeta.color }}>
                    {overallMeta.label}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-2">{formatTime(health?.last_checked_at)}</p>
                </div>
              </div>

              <NodeBadge label="SPF" status={(health?.spf_status || 'NOT_CHECKED') as HealthStatus} angle={-90} />
              <NodeBadge label="DKIM" status={(health?.dkim_status || 'NOT_CHECKED') as HealthStatus} angle={0} />
              <NodeBadge label="DMARC" status={(health?.dmarc_status || 'NOT_CHECKED') as HealthStatus} angle={90} />
              <NodeBadge label="MX" status={(health?.mx_status || 'NOT_CHECKED') as HealthStatus} angle={180} />
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="mc-panel mc-panel-asymmetric p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Ayarlar</p>
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">Alan adı</span>
              <input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="ornek.com"
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">DKIM selector</span>
              <input
                value={selectorInput}
                onChange={(e) => setSelectorInput(e.target.value)}
                placeholder="örn. default veya google"
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              />
              <p className="text-[11px] text-ink-faint">
                Selector’ı mail sağlayıcınızdan alın. Uygulama uydurma DKIM değeri üretmez.
              </p>
            </label>
            <button
              type="button"
              onClick={() => saveSettings.mutate()}
              className="w-full py-2.5 rounded-xl bg-canvas-soft text-sm"
            >
              Ayarları kaydet
            </button>
          </section>

          <section className="mc-panel mc-panel-asymmetric p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Bulunan kayıtlar</p>
            {[
              { key: 'SPF', value: health?.spf_record },
              { key: 'DKIM', value: health?.dkim_record },
              { key: 'DMARC', value: health?.dmarc_record },
            ].map((row) => (
              <div key={row.key} className="rounded-xl bg-canvas-soft p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-ink">{row.key}</p>
                  <button
                    type="button"
                    disabled={!row.value}
                    onClick={() => copyText(row.value)}
                    className="p-1.5 rounded-lg text-ink-faint hover:text-ink disabled:opacity-30"
                    aria-label="Kopyala"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-ink-soft break-all whitespace-pre-wrap">
                  {row.value || 'Kayıt bulunamadı / henüz kontrol edilmedi'}
                </p>
              </div>
            ))}

            <div className="rounded-xl bg-canvas-soft p-3">
              <p className="text-xs font-medium text-ink mb-1">MX</p>
              {Array.isArray(health?.mx_records) && health.mx_records.length > 0 ? (
                <ul className="space-y-1">
                  {health.mx_records.map((mx: any, idx: number) => (
                    <li key={`${mx.exchange}-${idx}`} className="text-xs text-ink-soft">
                      [{mx.priority}] {mx.exchange}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-soft">MX kaydı yok / kontrol edilmedi</p>
              )}
            </div>
          </section>

          <section className="mc-panel mc-panel-asymmetric p-5 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">Sorunlar ve öneriler</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-ink-soft">Henüz uyarı yok. Kontrol çalıştırın.</p>
            ) : (
              warnings.map((w: any, idx: number) => (
                <div
                  key={`${w.code}-${idx}`}
                  className={`rounded-xl p-3 text-sm border ${
                    w.severity === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : w.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-canvas-soft border-canvas-line text-ink-soft'
                  }`}
                >
                  <p className="font-medium">{w.message}</p>
                  {w.recommendation && <p className="text-xs mt-1 opacity-90">{w.recommendation}</p>}
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
