import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FlaskConical, Loader2, Save } from 'lucide-react'
import { brandApi, channelConnectionApi } from '../services/api'
import { channelSetupApiError } from '../utils/channelSetupErrors'

const STEPS = ['Marka', 'Sağlayıcı', 'Kimlik bilgileri', 'Test ve kaydet'] as const

export default function ChannelSmsSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const presetBrandId = searchParams.get('brandId') || ''

  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [testing, setTesting] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    brand_id: presetBrandId,
    provider: 'NETGSM',
    display_name: 'SMS Netgsm',
    username: '',
    password: '',
    appname: '',
    default_msgheader: '',
    encoding: 'TR',
    iysfilter: '0',
    status: 'ACTIVE',
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [] } = useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => {
      const res = await channelConnectionApi.list({ channel_type: 'SMS' })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const existing = useMemo(() => {
    if (!form.brand_id) return null
    return (
      connections.find(
        (c: any) =>
          String(c.brand_id) === String(form.brand_id) && c.channel_type === 'SMS'
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
      provider: existing.provider || 'NETGSM',
      default_msgheader: existing.settings?.default_msgheader || '',
      encoding: existing.settings?.encoding || 'TR',
      iysfilter: existing.settings?.iysfilter || '0',
      status: existing.status === 'ACTIVE' ? 'ACTIVE' : 'ACTIVE',
      username: '',
      password: '',
      appname: '',
    }))
  }, [existing?.id])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        brand_id: Number(form.brand_id),
        channel_type: 'SMS',
        display_name: form.display_name.trim() || 'SMS Netgsm',
        provider: form.provider,
        status: form.status,
        settings: {
          default_msgheader: form.default_msgheader.trim() || null,
          encoding: form.encoding || 'TR',
          iysfilter: form.iysfilter || '0',
        },
        username: form.username.trim(),
      }
      if (form.password.trim()) payload.password = form.password
      if (form.appname.trim()) payload.appname = form.appname.trim()

      if (editId) {
        if (!form.username.trim()) delete payload.username
        return channelConnectionApi.update(editId, payload)
      }
      if (!form.username.trim() || !form.password.trim()) {
        throw { response: { data: { error: 'API kullanıcı adı ve parola gerekli' } } }
      }
      return channelConnectionApi.create(payload)
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      const id = res.data?.id || editId
      setInfo('Kanal kaydedildi')
      setError('')
      if (id) setEditId(Number(id))
    },
    onError: (err: any) => {
      setError(channelSetupApiError(err, 'SMS kanalı kaydedilemedi'))
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
    if (!editId && (!form.username.trim() || !form.password.trim())) {
      setError('Eksik bilgi: API kullanıcı adı ve parola gerekli.')
      return
    }
    if (!form.default_msgheader.trim() && !editId) {
      setError('Eksik bilgi: gönderici başlığı gerekli.')
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

  const canNext = () => {
    if (step === 0) return Boolean(form.brand_id)
    if (step === 1) return Boolean(form.provider)
    if (step === 2) {
      if (editId) return Boolean(form.default_msgheader.trim() || form.username.trim() || existing)
      return Boolean(form.username.trim() && form.password.trim() && form.default_msgheader.trim())
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
        SMS kanalını bağla
      </h1>
      <p className="text-sm text-ink-soft mt-1 mb-6">
        Netgsm API bilgilerinizi girin. Parola ve anahtarlar şifreli saklanır; ekrana geri
        döndürülmez.
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
            <p className="text-sm text-ink-soft">Sağlayıcı</p>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-signal bg-signal/5 cursor-pointer">
              <input
                type="radio"
                name="provider"
                checked={form.provider === 'NETGSM'}
                onChange={() => setForm({ ...form, provider: 'NETGSM' })}
              />
              <div>
                <p className="font-medium text-ink">Netgsm</p>
                <p className="text-xs text-ink-soft">REST v2 SMS API</p>
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {editId && (
              <p className="text-xs text-ink-faint bg-canvas-soft rounded-lg px-3 py-2">
                Mevcut bağlantı düzenleniyor. Parola alanını boş bırakırsanız önceki değer
                korunur.
              </p>
            )}
            <label className="block text-sm">
              <span className="text-ink-soft">API kullanıcı adı</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="off"
                placeholder={editId ? 'Değiştirmek için yeni değer girin' : ''}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">API parola / anahtar</span>
              <input
                type="password"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                placeholder={editId ? '•••••••• (değiştirmek için yazın)' : ''}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Uygulama adı (opsiyonel)</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.appname}
                onChange={(e) => setForm({ ...form, appname: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-soft">Gönderici başlığı (msgheader)</span>
              <input
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-canvas-line"
                value={form.default_msgheader}
                onChange={(e) => setForm({ ...form, default_msgheader: e.target.value })}
                required={!editId}
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
                <span className="text-ink-faint">Sağlayıcı:</span> {form.provider}
              </p>
              <p>
                <span className="text-ink-faint">Başlık:</span> {form.default_msgheader || '—'}
              </p>
              <p className="text-xs text-ink-faint pt-2">
                Kimlik bilgileri API yanıtında geri gösterilmez.
              </p>
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
