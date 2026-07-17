import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Copy, FlaskConical, Loader2, Save } from 'lucide-react'
import { brandApi, channelConnectionApi } from '../services/api'
import { channelSetupApiError } from '../utils/channelSetupErrors'

const STEPS = ['Marka', 'Sağlayıcı', 'Hesap bilgileri', 'Test ve kaydet'] as const

function webhookUrl() {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const base = String(api).replace(/\/api\/?$/, '')
  return `${base}/api/webhooks/whatsapp/meta`
}

export default function ChannelWhatsAppSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const presetBrandId = searchParams.get('brandId') || ''
  const hookUrl = webhookUrl()

  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    brand_id: presetBrandId,
    provider: 'META_WHATSAPP_CLOUD',
    display_name: 'WhatsApp Meta',
    waba_id: '',
    phone_number_id: '',
    business_phone_number: '',
    access_token: '',
    app_secret: '',
    webhook_verify_token: '',
    api_version: 'v23.0',
    status: 'ACTIVE',
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [] } = useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => {
      const res = await channelConnectionApi.list({ channel_type: 'WHATSAPP' })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const existing = useMemo(() => {
    if (!form.brand_id) return null
    return (
      connections.find(
        (c: any) =>
          String(c.brand_id) === String(form.brand_id) && c.channel_type === 'WHATSAPP'
      ) || null
    )
  }, [connections, form.brand_id])

  useEffect(() => {
    if (!existing) {
      setEditId(null)
      return
    }
    setEditId(existing.id)
    setForm((prev) => ({
      ...prev,
      display_name: existing.display_name || prev.display_name,
      provider: existing.provider || 'META_WHATSAPP_CLOUD',
      waba_id: existing.settings?.waba_id || '',
      phone_number_id: existing.settings?.phone_number_id || '',
      business_phone_number: existing.settings?.business_phone_number || '',
      api_version: existing.settings?.api_version || 'v23.0',
      access_token: '',
      app_secret: '',
      webhook_verify_token: '',
    }))
  }, [existing?.id])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        brand_id: Number(form.brand_id),
        channel_type: 'WHATSAPP',
        display_name: form.display_name.trim() || 'WhatsApp Meta',
        provider: form.provider,
        status: form.status,
        settings: {
          waba_id: form.waba_id.trim(),
          phone_number_id: form.phone_number_id.trim(),
          business_phone_number: form.business_phone_number.trim(),
          api_version: form.api_version.trim() || 'v23.0',
        },
      }
      if (form.access_token.trim()) payload.access_token = form.access_token.trim()
      if (form.app_secret.trim()) payload.app_secret = form.app_secret.trim()
      if (form.webhook_verify_token.trim()) {
        payload.webhook_verify_token = form.webhook_verify_token.trim()
      }

      if (editId) return channelConnectionApi.update(editId, payload)
      if (!form.access_token.trim() || !form.phone_number_id.trim()) {
        throw {
          response: {
            data: { error: 'Access token ve telefon numarası ID gerekli' },
          },
        }
      }
      return channelConnectionApi.create(payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      const id = res.data?.id || editId
      setInfo('Kanal kaydedildi')
      setError('')
      if (id) setEditId(Number(id))
    },
    onError: (err: any) => {
      setError(channelSetupApiError(err, 'WhatsApp kanalı kaydedilemedi'))
      setInfo('')
    },
  })

  const onTest = async () => {
    setError('')
    setInfo('')
    if (!form.brand_id) {
      setError('Eksik bilgi: önce marka seçin.')
      return
    }
    if (!editId && (!form.access_token.trim() || !form.phone_number_id.trim())) {
      setError('Eksik bilgi: Access token ve Phone Number ID gerekli.')
      return
    }
    setTesting(true)
    try {
      let id = editId
      if (!id) {
        const saved = await saveMutation.mutateAsync()
        id = saved.data?.id
        if (id) setEditId(Number(id))
      }
      if (!id) {
        setError('Kayıt başarısız. Önce kaydı tamamlayın.')
        return
      }
      const res = await channelConnectionApi.test(Number(id))
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      if (res.data?.success === false) {
        setError(
          res.data?.error ||
            res.data?.message ||
            'Bağlantı testi başarısız. Sağlayıcı bilgilerini kontrol edin.'
        )
      } else {
        setInfo(res.data?.message || 'Bağlantı testi başarılı')
      }
    } catch (err: any) {
      setError(channelSetupApiError(err, 'Bağlantı testi başarısız'))
    } finally {
      setTesting(false)
    }
  }

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(hookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Webhook URL kopyalanamadı')
    }
  }

  const canNext = () => {
    if (step === 0) return Boolean(form.brand_id)
    if (step === 1) return Boolean(form.provider)
    if (step === 2) {
      if (editId) {
        return Boolean(form.phone_number_id.trim() && form.business_phone_number.trim())
      }
      return Boolean(
        form.waba_id.trim() &&
          form.phone_number_id.trim() &&
          form.business_phone_number.trim() &&
          form.access_token.trim() &&
          form.webhook_verify_token.trim()
      )
    }
    return true
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await saveMutation.mutateAsync()
      navigate('/channels')
    } catch {
      /* error state set in mutation */
    }
  }

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
        Meta WhatsApp Business Platform (Cloud API) bilgilerini girin. Token ve secret
        değerleri şifreli saklanır; API yanıtında geri dönmez.
      </p>

      <ol className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              i === step
                ? 'bg-signal text-white border-signal'
                : i < step
                  ? 'bg-signal/10 text-signal-deep border-signal/20'
                  : 'bg-white text-ink-faint border-canvas-line'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

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

      <form onSubmit={onSubmit} className="mc-panel mc-panel-asymmetric p-5 space-y-4">
        {step === 0 && (
          <label className="block text-sm">
            <span className="text-ink-soft font-medium">Marka</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line bg-white"
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              required
            >
              <option value="">Marka seçin</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-signal bg-signal/5 cursor-pointer">
              <input
                type="radio"
                name="provider"
                checked={form.provider === 'META_WHATSAPP_CLOUD'}
                onChange={() => setForm({ ...form, provider: 'META_WHATSAPP_CLOUD' })}
              />
              <div>
                <p className="font-medium text-ink">Meta WhatsApp Cloud</p>
                <p className="text-xs text-ink-soft">WhatsApp Business Platform</p>
              </div>
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Görünen ad</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </label>
            <div className="rounded-xl border border-canvas-line bg-canvas-soft/50 p-3">
              <p className="text-xs text-ink-faint mb-1.5">Webhook URL (Meta konsoluna yapıştırın)</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs break-all bg-white border border-canvas-line rounded-lg px-2.5 py-2">
                  {hookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyWebhook()}
                  className="shrink-0 px-3 rounded-lg border border-canvas-line text-xs hover:bg-white"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1" />
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {editId && (
              <p className="text-xs text-ink-faint bg-canvas-soft rounded-lg px-3 py-2">
                Mevcut bağlantı düzenleniyor. Token alanlarını boş bırakırsanız önceki değerler
                korunur.
              </p>
            )}
            <label className="block text-sm">
              <span className="text-ink-soft">WABA ID</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.waba_id}
                onChange={(e) => setForm({ ...form, waba_id: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Phone Number ID</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.phone_number_id}
                onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">İşletme telefon numarası</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.business_phone_number}
                onChange={(e) => setForm({ ...form, business_phone_number: e.target.value })}
                placeholder="+90..."
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Access token</span>
              <input
                type="password"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                autoComplete="new-password"
                placeholder={editId ? '•••••••• (değiştirmek için yazın)' : ''}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">App secret</span>
              <input
                type="password"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.app_secret}
                onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
                autoComplete="new-password"
                placeholder={editId ? '••••••••' : ''}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Webhook verify token</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.webhook_verify_token}
                onChange={(e) => setForm({ ...form, webhook_verify_token: e.target.value })}
                placeholder={editId ? 'Değiştirmek için yeni değer' : ''}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">API sürümü</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.api_version}
                onChange={(e) => setForm({ ...form, api_version: e.target.value })}
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-canvas-soft/60 border border-canvas-line p-4 text-sm space-y-1">
              <p>
                <span className="text-ink-faint">Marka:</span>{' '}
                {brands.find((b: any) => String(b.id) === form.brand_id)?.name || '—'}
              </p>
              <p>
                <span className="text-ink-faint">Telefon:</span>{' '}
                {form.business_phone_number || '—'}
              </p>
              <p>
                <span className="text-ink-faint">Phone Number ID:</span>{' '}
                {form.phone_number_id || '—'}
              </p>
              <p className="text-xs text-ink-faint pt-2 break-all">Webhook: {hookUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onTest()}
                disabled={testing || saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-canvas-line text-sm hover:bg-canvas-soft disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                Bağlantıyı test et
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-sm font-medium disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Kaydet ve aktifleştir
              </button>
            </div>
            {info && !error && (
              <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {info} ·{' '}
                <Link to="/channels" className="underline">
                  Bağlantılara dön
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-canvas-line/70">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 text-sm rounded-xl border border-canvas-line disabled:opacity-40"
          >
            Geri
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-4 py-2 text-sm rounded-xl bg-dock text-white disabled:opacity-40"
            >
              İleri
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
