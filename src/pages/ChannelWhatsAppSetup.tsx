import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FlaskConical,
  Loader2,
  RefreshCw,
  Save,
  Smartphone,
  Unplug,
} from 'lucide-react'
import { brandApi, channelConnectionApi, templateApi } from '../services/api'
import { channelSetupApiError } from '../utils/channelSetupErrors'
import {
  buildEmbeddedSignupLoginOptions,
  createSyncFbLoginCallback,
  EMBEDDED_SIGNUP_TIMEOUT_MESSAGE,
  EMBEDDED_SIGNUP_TIMEOUT_MS,
  EmbeddedSignupMode,
  isTrustedMetaOrigin,
  parseWaEmbeddedSignupMessage,
  ParsedWaEmbeddedSignupEvent,
} from '../utils/metaEmbeddedSignup'

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

const META_APP_ID = String(import.meta.env.VITE_META_APP_ID || '').trim()
const META_CONFIG_ID = String(import.meta.env.VITE_META_WHATSAPP_CONFIG_ID || '').trim()

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve()
      return
    }
    window.fbAsyncInit = () => {
      try {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: String(import.meta.env.VITE_META_GRAPH_API_VERSION || 'v23.0').replace(
            /^\/+/,
            ''
          ),
        })
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    if (document.getElementById('facebook-jssdk')) {
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.onerror = () => reject(new Error('Facebook SDK yüklenemedi'))
    document.body.appendChild(script)
  })
}

export default function ChannelWhatsAppSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const presetBrandId = searchParams.get('brandId') || ''

  const [brandId, setBrandId] = useState(presetBrandId)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkLoading, setSdkLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [activeMode, setActiveMode] = useState<EmbeddedSignupMode | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testTemplateId, setTestTemplateId] = useState('')
  const [testingMsg, setTestingMsg] = useState(false)

  const sessionRef = useRef<ParsedWaEmbeddedSignupEvent | null>(null)
  const completingRef = useRef(false)
  const onboardingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearOnboardingTimeout = useCallback(() => {
    if (onboardingTimeoutRef.current != null) {
      clearTimeout(onboardingTimeoutRef.current)
      onboardingTimeoutRef.current = null
    }
  }, [])

  const stopConnecting = useCallback(() => {
    clearOnboardingTimeout()
    setConnecting(false)
    completingRef.current = false
  }, [clearOnboardingTimeout])

  // Advanced manual form
  const [manual, setManual] = useState({
    display_name: 'WhatsApp Meta',
    waba_id: '',
    phone_number_id: '',
    business_phone_number: '',
    access_token: '',
    app_secret: '',
    webhook_verify_token: '',
  })

  const frontendMetaReady = Boolean(META_APP_ID && META_CONFIG_ID)

  const { data: setupStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['whatsapp-meta-setup-status'],
    queryFn: async () => (await channelConnectionApi.metaSetupStatus()).data,
    retry: false,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [], refetch: refetchConnections } = useQuery({
    queryKey: ['channel-connections', 'WHATSAPP'],
    queryFn: async () => {
      const res = await channelConnectionApi.list({ channel_type: 'WHATSAPP' })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const connection = useMemo(() => {
    if (!brandId) return null
    const forBrand = connections.filter(
      (c: any) =>
        String(c.brand_id) === String(brandId) && c.channel_type === 'WHATSAPP'
    )
    if (forBrand.length === 0) return null
    const active = forBrand.filter((c: any) => String(c.status).toUpperCase() === 'ACTIVE')
    const pool = active.length ? active : forBrand
    const real = pool.find((c: any) => {
      const phone =
        c.phone_number ||
        c.settings?.business_phone_number ||
        c.settings?.business_phone ||
        ''
      const digits = String(phone).replace(/\D/g, '')
      return digits && digits !== '15551548955' && !digits.endsWith('5551548955')
    })
    return real || pool[0] || null
  }, [connections, brandId])

  const { data: approvedTemplates = [] } = useQuery({
    queryKey: ['templates-wa-approved', brandId, connection?.id],
    enabled: Boolean(brandId && connection?.id),
    queryFn: async () => {
      const res = await templateApi.list({ brand_id: brandId, channel_type: 'WHATSAPP' })
      const rows = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : []
      return rows.filter(
        (t: any) => String(t.provider_approval_status || '').toUpperCase() === 'APPROVED'
      )
    },
  })

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedMetaOrigin(event.origin)) return
      const parsed = parseWaEmbeddedSignupMessage(event.data)
      if (!parsed) return

      if (parsed.isCancel) {
        stopConnecting()
        setInfo('Bağlantı iptal edildi. Kanal kaydı oluşturulmadı.')
        setError('')
        return
      }
      if (parsed.isError) {
        stopConnecting()
        const detail = String(
          (parsed.data as any)?.error_message ||
            (parsed.data as any)?.message ||
            ''
        ).slice(0, 180)
        setError(
          detail
            ? `Meta Embedded Signup hatası: ${detail}`
            : 'Meta Embedded Signup sırasında bir hata oluştu'
        )
        setInfo('')
        return
      }
      if (parsed.isFinish) {
        sessionRef.current = parsed
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [stopConnecting])

  useEffect(() => {
    if (!frontendMetaReady) {
      setSdkReady(false)
      return
    }
    let cancelled = false
    setSdkLoading(true)
    loadFacebookSdk(META_APP_ID)
      .then(() => {
        if (!cancelled) setSdkReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setSdkReady(false)
          setError('Facebook SDK yüklenemedi. Ağ veya App ID ayarını kontrol edin.')
        }
      })
      .finally(() => {
        if (!cancelled) setSdkLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [frontendMetaReady])

  useEffect(() => {
    return () => {
      clearOnboardingTimeout()
    }
  }, [clearOnboardingTimeout])

  const completeMutation = useMutation({
    mutationFn: (payload: {
      brandId: number
      authorizationCode: string
      sessionInfo?: Record<string, unknown> | null
      onboardingMode: EmbeddedSignupMode
      preferredPhone?: string
    }) => channelConnectionApi.completeEmbeddedSignup(payload),
    onSuccess: async (res) => {
      const mode = res.data?.connectionType || activeMode
      setInfo(
        mode === 'WHATSAPP_BUSINESS_APP_ONBOARDING' || mode === 'COEXISTENCE'
          ? 'WhatsApp Business numarası MailCenter’a bağlandı (uygulama silinmedi).'
          : 'WhatsApp Embedded Signup tamamlandı. Bağlantı aktif.'
      )
      setError('')
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      await refetchConnections()
    },
    onError: (err: any) => {
      setError(channelSetupApiError(err, 'Embedded Signup tamamlanamadı'))
      setInfo('')
    },
  })

  const waitForFinishSession = useCallback(async (timeoutMs = 4000) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if (sessionRef.current?.isFinish) return sessionRef.current
      await new Promise((r) => setTimeout(r, 100))
    }
    return sessionRef.current
  }, [])

  const handleFacebookLoginResponse = useCallback(
    async (response: any, mode: EmbeddedSignupMode) => {
      try {
        const code = response?.authResponse?.code
        if (!code) {
          stopConnecting()
          if (response?.status === 'unknown' || !response?.authResponse) {
            setInfo('Bağlantı iptal edildi. Kayıt oluşturulmadı.')
            setError('')
          } else {
            setError('Meta yetkilendirme kodu alınamadı')
            setInfo('')
          }
          return
        }

        if (completingRef.current) {
          return
        }
        completingRef.current = true

        const finished = await waitForFinishSession()
        const sessionInfo = finished
          ? {
              ...finished.raw,
              waba_id: finished.wabaId,
              phone_number_id: finished.phoneNumberId,
              business_id: finished.businessId,
              event: finished.event,
            }
          : null

        completeMutation.mutate(
          {
            brandId: Number(brandId),
            authorizationCode: code,
            sessionInfo,
            onboardingMode: mode,
            ...(mode === 'WHATSAPP_BUSINESS_APP_ONBOARDING'
              ? { preferredPhone: '+905323171755' }
              : {}),
          },
          {
            onSettled: () => {
              stopConnecting()
            },
          }
        )
      } catch {
        stopConnecting()
        setError('Embedded Signup tamamlanamadı')
        setInfo('')
      }
    },
    [brandId, completeMutation, stopConnecting, waitForFinishSession]
  )

  const launchEmbeddedSignup = useCallback(
    (mode: EmbeddedSignupMode) => {
      setError('')
      setInfo('')
      if (!frontendMetaReady || !setupStatus?.embeddedSignupReady) {
        setError('Meta WhatsApp yapılandırması tamamlanmamış')
        return
      }
      if (!brandId) {
        setError('Önce marka seçin')
        return
      }
      if (!window.FB || !sdkReady) {
        setError('Facebook SDK henüz hazır değil')
        return
      }
      if (connecting || completeMutation.isPending || completingRef.current) {
        return
      }

      sessionRef.current = null
      setActiveMode(mode)
      setConnecting(true)
      clearOnboardingTimeout()
      onboardingTimeoutRef.current = setTimeout(() => {
        stopConnecting()
        setError(EMBEDDED_SIGNUP_TIMEOUT_MESSAGE)
        setInfo('')
      }, EMBEDDED_SIGNUP_TIMEOUT_MS)

      const loginOptions = buildEmbeddedSignupLoginOptions({
        configId: META_CONFIG_ID,
        mode,
      })

      // FB.login must receive a *sync* function — never an AsyncFunction.
      const syncCallback = createSyncFbLoginCallback((response) =>
        handleFacebookLoginResponse(response, mode)
      )

      try {
        window.FB.login(syncCallback, loginOptions)
      } catch {
        stopConnecting()
        setError('Meta Embedded Signup başlatılamadı. Lütfen tekrar deneyin.')
        setInfo('')
      }
    },
    [
      brandId,
      clearOnboardingTimeout,
      completeMutation.isPending,
      connecting,
      frontendMetaReady,
      handleFacebookLoginResponse,
      sdkReady,
      setupStatus?.embeddedSignupReady,
      stopConnecting,
    ]
  )

  const verifyMutation = useMutation({
    mutationFn: () => channelConnectionApi.verifyWhatsApp(connection!.id),
    onSuccess: (res) => {
      setInfo(res.data?.message || 'Bağlantı doğrulandı')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
    },
    onError: (err: any) => setError(channelSetupApiError(err, 'Doğrulama başarısız')),
  })

  const syncMutation = useMutation({
    mutationFn: () => channelConnectionApi.syncWhatsAppTemplates(connection!.id),
    onSuccess: (res) => {
      setInfo(
        `Şablonlar senkronize edildi: ${res.data?.synced ?? 0} kayıt, ${res.data?.approved ?? 0} onaylı`
      )
      setError('')
      queryClient.invalidateQueries({ queryKey: ['templates-wa-approved'] })
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
    },
    onError: (err: any) => setError(channelSetupApiError(err, 'Şablon senkronizasyonu başarısız')),
  })

  const disconnectMutation = useMutation({
    mutationFn: () => channelConnectionApi.disconnectWhatsApp(connection!.id),
    onSuccess: (res) => {
      setInfo(res.data?.message || 'Bağlantı kaldırıldı')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
    },
    onError: (err: any) => setError(channelSetupApiError(err, 'Bağlantı kaldırılamadı')),
  })

  const manualSave = useMutation({
    mutationFn: async () => {
      const payload: any = {
        brand_id: Number(brandId),
        channel_type: 'WHATSAPP',
        display_name: manual.display_name.trim() || 'WhatsApp Meta',
        provider: 'META_WHATSAPP_CLOUD',
        status: 'ACTIVE',
        settings: {
          waba_id: manual.waba_id.trim(),
          phone_number_id: manual.phone_number_id.trim(),
          business_phone_number: manual.business_phone_number.trim(),
          connection_method: 'MANUAL',
        },
        access_token: manual.access_token.trim(),
        app_secret: manual.app_secret.trim(),
        webhook_verify_token: manual.webhook_verify_token.trim(),
      }
      if (connection?.id) {
        return channelConnectionApi.update(connection.id, payload)
      }
      return channelConnectionApi.create(payload)
    },
    onSuccess: () => {
      setInfo('Gelişmiş bağlantı kaydedildi')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
    },
    onError: (err: any) => setError(channelSetupApiError(err, 'Manuel kayıt başarısız')),
  })

  const onManualSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!brandId) {
      setError('Marka seçin')
      return
    }
    await manualSave.mutateAsync()
  }

  const sendTestTemplate = async () => {
    setError('')
    setInfo('')
    if (!connection?.id) return
    const tpl = approvedTemplates.find((t: any) => String(t.id) === String(testTemplateId))
    if (!testPhone.trim() || !tpl?.provider_template_name) {
      setError('Test telefonu ve onaylı şablon seçin')
      return
    }
    setTestingMsg(true)
    try {
      const res = await channelConnectionApi.testWhatsAppTemplate(connection.id, {
        to: testPhone.trim(),
        templateName: tpl.provider_template_name,
        language: tpl.provider_template_language || 'tr',
      })
      if (!res.data?.wamid) {
        setError('Meta wamid dönmedi; test başarısız sayıldı')
      } else {
        setInfo(`Test mesajı gönderildi. wamid: ${res.data.wamid}`)
      }
    } catch (err: any) {
      setError(channelSetupApiError(err, 'Test mesajı başarısız'))
    } finally {
      setTestingMsg(false)
    }
  }

  const copyWebhook = async () => {
    const url = setupStatus?.webhookUrl
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setInfo('Webhook URL kopyalandı')
    } catch {
      setError('Webhook URL kopyalanamadı')
    }
  }

  const metaButtonsDisabled =
    connecting ||
    completeMutation.isPending ||
    sdkLoading ||
    !setupStatus?.embeddedSignupReady ||
    !frontendMetaReady ||
    !brandId

  const connectionTypeLabel = String(
    connection?.settings?.connection_type || connection?.settings?.connection_method || ''
  )
  const isCoexistence =
    connectionTypeLabel === 'WHATSAPP_BUSINESS_APP_ONBOARDING' ||
    connectionTypeLabel === 'COEXISTENCE'

  const statusRows = [
    { label: 'App ID mevcut', ok: Boolean(setupStatus?.appIdPresent && META_APP_ID) },
    { label: 'Config ID mevcut', ok: Boolean(setupStatus?.configIdPresent && META_CONFIG_ID) },
    { label: 'Public HTTPS webhook mevcut', ok: Boolean(setupStatus?.publicBackendUrlPresent) },
    {
      label: 'Webhook verify token yapılandırıldı',
      ok: Boolean(setupStatus?.webhookVerifyTokenPresent),
    },
    {
      label: 'WABA subscription (bağlantı sonrası)',
      ok: connection?.settings?.webhook_status === 'SUBSCRIBED',
    },
    {
      label: 'App Review / izinler',
      ok: false,
      note: 'Meta Dashboard’da doğrulanır',
    },
  ]

  return (
    <div className="mc-shell pt-1 pb-10 max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/channels')}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Kanal Bağlantıları
      </button>

      <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">
        WhatsApp kanalını bağla
      </h1>
      <p className="text-sm text-ink-soft mt-1 mb-6">
        Ana yöntem: Meta Embedded Signup. Token ve secret değerleri yalnızca sunucuda saklanır.
      </p>

      {(error || info) && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm ${
            error
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {error || info}
        </div>
      )}

      <section className="mc-panel mc-panel-asymmetric p-5 mb-5 space-y-4">
        <h2 className="font-semibold text-ink">Meta Kurulum Durumu</h2>
        {statusLoading ? (
          <p className="text-sm text-ink-soft">Kontrol ediliyor…</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {statusRows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">
                  {row.label}
                  {row.note ? ` · ${row.note}` : ''}
                </span>
                <span
                  className={
                    row.ok ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'
                  }
                >
                  {row.ok ? 'Tamam' : 'Eksik / manuel'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {setupStatus?.webhookUrl && (
          <div className="pt-2">
            <p className="text-xs text-ink-faint mb-1">Webhook URL</p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-canvas-soft rounded-lg px-3 py-2 break-all">
                {setupStatus.webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyWebhook()}
                className="px-3 py-2 rounded-xl border border-canvas-line text-sm"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Eski uyumluluk: /api/webhooks/whatsapp/meta
            </p>
          </div>
        )}
        {!setupStatus?.embeddedSignupReady && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Meta WhatsApp yapılandırması tamamlanmamış. Embedded Signup butonu çalışmaz.
            {Array.isArray(setupStatus?.missing) && setupStatus.missing.length > 0
              ? ` Eksik: ${setupStatus.missing.join(', ')}`
              : !frontendMetaReady
                ? ' Frontend: VITE_META_APP_ID / VITE_META_WHATSAPP_CONFIG_ID'
                : ''}
          </p>
        )}
      </section>

      <section className="mc-panel mc-panel-asymmetric p-5 mb-5 space-y-4">
        <label className="block text-sm">
          <span className="text-ink-soft font-medium">Marka</span>
          <select
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line bg-white"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
          >
            <option value="">Marka seçin</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3 space-y-2">
          <p className="text-sm text-emerald-900 font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            Mevcut WhatsApp Business numaranızı uygulamadan silmeden MailCenter’a
            bağlayabilirsiniz.
          </p>
          <p className="text-xs text-emerald-900/80">
            Örn. +90 532 317 17 55 — Meta ekranında WhatsApp Business uygulamasındaki
            numarayı seçin. Numara uygulamadan silinmez; Cloud API ile birlikte (coexistence)
            çalışır.
          </p>
        </div>

        <button
          type="button"
          disabled={metaButtonsDisabled}
          onClick={() => launchEmbeddedSignup('WHATSAPP_BUSINESS_APP_ONBOARDING')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1877F2] text-white text-sm font-semibold disabled:opacity-50"
        >
          {connecting && activeMode === 'WHATSAPP_BUSINESS_APP_ONBOARDING' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Mevcut WhatsApp Business numarasını bağla
        </button>

        <button
          type="button"
          disabled={metaButtonsDisabled}
          onClick={() => launchEmbeddedSignup('STANDARD')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#1877F2] text-[#1877F2] bg-white text-sm font-semibold disabled:opacity-50"
        >
          {connecting && activeMode === 'STANDARD' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Yeni bir numara bağla
        </button>

        <p className="text-xs text-ink-faint">
          Kullanıcı iptal ederse kanal kaydı oluşturulmaz. Authorization code yalnızca bir kez
          backend’e gönderilir; access token frontend’de saklanmaz.
        </p>
      </section>

      {connection && (
        <section className="mc-panel mc-panel-asymmetric p-5 mb-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">Bağlı kanal</h2>
              <p className="text-sm text-ink-soft mt-1">
                {connection.settings?.verified_name || connection.display_name}
              </p>
              <p className="text-sm text-ink">
                {connection.settings?.business_phone_number || '—'}
              </p>
              <p className="text-xs text-ink-faint mt-1">
                Durum: {connection.status} · Webhook:{' '}
                {connection.settings?.webhook_status || '—'} · Onaylı şablon:{' '}
                {connection.settings?.approved_template_count ?? approvedTemplates.length}
                {isCoexistence ? ' · Tür: WhatsApp Business App (coexistence)' : ''}
              </p>
            </div>
            {connection.status === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bağlı
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FlaskConical className="w-4 h-4" />
              )}
              Bağlantıyı doğrula
            </button>
            <button
              type="button"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Şablonları senkronize et
            </button>
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (window.confirm('WhatsApp bağlantısı kaldırılsın mı? Geçmiş konuşmalar silinmez.')) {
                  disconnectMutation.mutate()
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm"
            >
              <Unplug className="w-4 h-4" />
              Bağlantıyı kaldır
            </button>
          </div>

          <div className="border-t border-canvas-line pt-4 space-y-3">
            <h3 className="text-sm font-medium text-ink">Test şablon mesajı</h3>
            <input
              className="w-full px-3 py-2 rounded-xl border text-sm"
              placeholder="Test telefonu (E.164, örn. +905xxxxxxxxx)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <select
              className="w-full px-3 py-2 rounded-xl border text-sm"
              value={testTemplateId}
              onChange={(e) => setTestTemplateId(e.target.value)}
            >
              <option value="">Onaylı şablon seçin</option>
              {approvedTemplates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.provider_template_name} ({t.provider_template_language})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={testingMsg || approvedTemplates.length === 0}
              onClick={() => void sendTestTemplate()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
            >
              {testingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Test mesajı gönder
            </button>
            {approvedTemplates.length === 0 && (
              <p className="text-xs text-amber-800">
                Önce onaylı WhatsApp şablonlarını senkronize edin.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mc-panel mc-panel-asymmetric p-5">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-medium text-ink"
        >
          Gelişmiş bağlantı (manuel credential)
          {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {advancedOpen && (
          <form onSubmit={onManualSubmit} className="mt-4 space-y-3">
            <p className="text-xs text-ink-faint">
              Yalnızca geliştirme / yönetici amaçlı. Üretimde Embedded Signup kullanın.
            </p>
            {(
              [
                ['display_name', 'Görünen ad'],
                ['waba_id', 'WABA ID'],
                ['phone_number_id', 'Phone Number ID'],
                ['business_phone_number', 'İşletme telefonu'],
                ['access_token', 'Access token'],
                ['app_secret', 'App secret'],
                ['webhook_verify_token', 'Webhook verify token'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-ink-soft">{label}</span>
                <input
                  type={
                    key.includes('token') || key.includes('secret') ? 'password' : 'text'
                  }
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                  value={(manual as any)[key]}
                  onChange={(e) => setManual({ ...manual, [key]: e.target.value })}
                  autoComplete="off"
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={manualSave.isPending || !brandId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-sm disabled:opacity-50"
            >
              {manualSave.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet ve aktifleştir
            </button>
            {setupStatus?.webhookUrl && (
              <p className="text-xs text-ink-faint break-all">Webhook: {setupStatus.webhookUrl}</p>
            )}
          </form>
        )}
      </section>

      <p className="mt-4 text-sm text-ink-soft">
        <Link to="/channels" className="underline text-signal-deep">
          Kanal Bağlantıları’na dön
        </Link>
      </p>
    </div>
  )
}
