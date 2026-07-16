import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cable, Plus, FlaskConical } from 'lucide-react'
import { brandApi, channelConnectionApi, accountApi } from '../services/api'

const CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'] as const

const statusLabel: Record<string, string> = {
  NOT_CONFIGURED: 'Yapılandırılmadı',
  ACTIVE: 'Aktif',
  DISABLED: 'Devre dışı',
  ERROR: 'Hata',
}

const emptyForm = {
  brand_id: '',
  channel_type: 'EMAIL',
  display_name: '',
  provider: '',
  mail_account_id: '',
  status: 'NOT_CONFIGURED',
  username: '',
  password: '',
  appname: '',
  default_msgheader: '',
  encoding: 'TR',
  iysfilter: '0',
  waba_id: '',
  phone_number_id: '',
  business_phone_number: '',
  access_token: '',
  app_secret: '',
  webhook_verify_token: '',
  api_version: 'v23.0',
}

export default function Channels() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [form, setForm] = useState({ ...emptyForm })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => (await channelConnectionApi.list()).data,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountApi.getAccounts()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const grouped = useMemo(() => {
    return brands.map((brand: any) => {
      const brandConnections = connections.filter((c: any) => c.brand_id === brand.id)
      return {
        brand,
        channels: CHANNELS.map((type) => ({
          type,
          connection: brandConnections.find((c: any) => c.channel_type === type) || null,
        })),
      }
    })
  }, [brands, connections])

  const isSmsNetgsm =
    form.channel_type === 'SMS' &&
    (form.provider.toUpperCase() === 'NETGSM' || form.provider === '')

  const isWhatsAppMeta =
    form.channel_type === 'WHATSAPP' &&
    (form.provider.toUpperCase() === 'META_WHATSAPP_CLOUD' || form.provider === '')

  const createMutation = useMutation({
    mutationFn: () => {
      const provider =
        form.channel_type === 'SMS' && !form.provider
          ? 'NETGSM'
          : form.channel_type === 'WHATSAPP' && !form.provider
            ? 'META_WHATSAPP_CLOUD'
            : form.provider || null
      const settings =
        form.channel_type === 'SMS'
          ? {
              default_msgheader: form.default_msgheader || null,
              encoding: form.encoding || 'TR',
              iysfilter: form.iysfilter || '0',
            }
          : form.channel_type === 'WHATSAPP'
            ? {
                waba_id: form.waba_id.trim(),
                phone_number_id: form.phone_number_id.trim(),
                business_phone_number: form.business_phone_number.trim(),
                api_version: form.api_version.trim() || 'v23.0',
              }
            : {}
      const payload: any = {
        brand_id: Number(form.brand_id),
        channel_type: form.channel_type,
        display_name: form.display_name,
        provider,
        mail_account_id: form.mail_account_id ? Number(form.mail_account_id) : null,
        status: form.status,
        settings,
      }
      if (form.channel_type === 'SMS' && provider === 'NETGSM') {
        payload.username = form.username
        if (form.password.trim()) payload.password = form.password
        if (form.appname.trim()) payload.appname = form.appname
      }
      if (form.channel_type === 'WHATSAPP' && provider === 'META_WHATSAPP_CLOUD') {
        if (form.access_token.trim()) payload.access_token = form.access_token.trim()
        if (form.app_secret.trim()) payload.app_secret = form.app_secret.trim()
        if (form.webhook_verify_token.trim()) {
          payload.webhook_verify_token = form.webhook_verify_token.trim()
        }
      }
      if (editId) return channelConnectionApi.update(editId, payload)
      return channelConnectionApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      setShowForm(false)
      setEditId(null)
      setForm({ ...emptyForm })
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Kanal kaydedilemedi'),
  })

  const testMutation = useMutation({
    mutationFn: (id: number) => channelConnectionApi.test(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      setInfo(res.data?.message || (res.data?.success ? 'Test başarılı' : 'Test başarısız'))
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Test başarısız'),
  })

  const openEdit = (connection: any) => {
    setEditId(connection.id)
    setForm({
      ...emptyForm,
      brand_id: String(connection.brand_id),
      channel_type: connection.channel_type,
      display_name: connection.display_name || '',
      provider: connection.provider || '',
      mail_account_id: connection.mail_account_id ? String(connection.mail_account_id) : '',
      status: connection.status || 'NOT_CONFIGURED',
      username: '',
      password: '',
      appname: '',
      default_msgheader: connection.settings?.default_msgheader || '',
      encoding: connection.settings?.encoding || 'TR',
      iysfilter: connection.settings?.iysfilter || '0',
      waba_id: connection.settings?.waba_id || '',
      phone_number_id: connection.settings?.phone_number_id || '',
      business_phone_number: connection.settings?.business_phone_number || '',
      api_version: connection.settings?.api_version || 'v23.0',
      access_token: '',
      app_secret: '',
      webhook_verify_token: '',
    })
    setShowForm(true)
  }

  const canTest = (connection: any) =>
    (connection.channel_type === 'SMS' &&
      connection.provider?.toUpperCase() === 'NETGSM') ||
    (connection.channel_type === 'WHATSAPP' &&
      connection.provider?.toUpperCase() === 'META_WHATSAPP_CLOUD')

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Bağlantılar</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Kanallar</h1>
          <p className="text-sm text-ink-soft mt-1">
            E-posta, SMS (Netgsm) ve WhatsApp (Meta Cloud) bağlantılarını yönetin.
          </p>
        </div>
        <button
          onClick={() => {
            setEditId(null)
            setForm({ ...emptyForm })
            setShowForm(true)
          }}
          disabled={brands.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm hover:bg-dock-raised transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Kanal ekle
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {info && <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{info}</div>}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-40 bg-canvas-line/50 rounded-2xl" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-ink-soft">Önce bir marka oluşturun.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ brand, channels }: any) => (
            <div key={brand.id} className="mc-panel mc-panel-asymmetric p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brand.accent_color || '#0f9aa8' }} />
                <h2 className="font-display text-lg text-ink">{brand.name}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {channels.map(({ type, connection }: any) => (
                  <div key={type} className="rounded-2xl rounded-bl-md border border-canvas-line bg-canvas/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-ink">{type}</p>
                      <Cable className="w-4 h-4 text-ink-faint" />
                    </div>
                    {connection ? (
                      <>
                        <p className="text-sm text-ink-soft truncate">{connection.display_name}</p>
                        <p className="text-xs text-ink-faint mt-1">{connection.provider || '—'}</p>
                        {type === 'WHATSAPP' && connection.settings?.business_phone_number && (
                          <p className="text-xs text-ink-soft mt-1">
                            {connection.settings.business_phone_number}
                          </p>
                        )}
                        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                          {statusLabel[connection.status] || connection.status}
                          {connection.has_credentials ? ' · kimlik var' : ''}
                          {connection.last_tested_at
                            ? ` · test ${new Date(connection.last_tested_at).toLocaleString('tr-TR')}`
                            : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded-lg border border-canvas-line"
                            onClick={() => openEdit(connection)}
                          >
                            Düzenle
                          </button>
                          {canTest(connection) && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-dock text-white"
                              onClick={() => testMutation.mutate(connection.id)}
                            >
                              <FlaskConical className="w-3 h-3" />
                              Test
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-ink-faint mt-1">Yapılandırılmadı</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-display text-lg text-ink">
              {editId ? 'Kanalı düzenle' : 'Kanal bağlantısı'}
            </h2>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              required
              value={form.brand_id}
              disabled={Boolean(editId)}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            >
              <option value="">Marka seçin</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.channel_type}
              disabled={Boolean(editId)}
              onChange={(e) =>
                setForm({
                  ...form,
                  channel_type: e.target.value,
                  status: 'NOT_CONFIGURED',
                  provider:
                    e.target.value === 'SMS'
                      ? 'NETGSM'
                      : e.target.value === 'WHATSAPP'
                        ? 'META_WHATSAPP_CLOUD'
                        : '',
                })
              }
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Görünen ad"
              required
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Sağlayıcı"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            />

            {form.channel_type === 'EMAIL' && (
              <select
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={form.mail_account_id}
                onChange={(e) => setForm({ ...form, mail_account_id: e.target.value })}
              >
                <option value="">Mail hesabı bağlama (opsiyonel)</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.email}
                  </option>
                ))}
              </select>
            )}

            {isSmsNetgsm && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Netgsm kullanıcı / abone"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required={!editId}
                  autoComplete="off"
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder={editId ? 'Parola (boş = koru)' : 'API parola'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editId}
                  autoComplete="new-password"
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="App name (opsiyonel)"
                  value={form.appname}
                  onChange={(e) => setForm({ ...form, appname: e.target.value })}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Varsayılan gönderici başlığı"
                  value={form.default_msgheader}
                  onChange={(e) => setForm({ ...form, default_msgheader: e.target.value })}
                />
                <p className="text-xs text-ink-faint">
                  Secret alanlar API cevaplarında dönmez. Düzenlemede parola boş bırakılırsa korunur.
                </p>
              </>
            )}

            {isWhatsAppMeta && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="WhatsApp Business Account ID"
                  value={form.waba_id}
                  onChange={(e) => setForm({ ...form, waba_id: e.target.value })}
                  required
                  autoComplete="off"
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Phone Number ID"
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  required
                  autoComplete="off"
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Business telefon (E.164)"
                  value={form.business_phone_number}
                  onChange={(e) => setForm({ ...form, business_phone_number: e.target.value })}
                  required
                  autoComplete="off"
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder={editId ? 'Access Token (boş = koru)' : 'Access Token'}
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  required={!editId}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder={editId ? 'App Secret (boş = koru)' : 'App Secret'}
                  value={form.app_secret}
                  onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
                  required={!editId}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder={
                    editId ? 'Webhook Verify Token (boş = koru)' : 'Webhook Verify Token'
                  }
                  value={form.webhook_verify_token}
                  onChange={(e) => setForm({ ...form, webhook_verify_token: e.target.value })}
                  required={!editId}
                  autoComplete="new-password"
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="API version (örn. v23.0)"
                  value={form.api_version}
                  onChange={(e) => setForm({ ...form, api_version: e.target.value })}
                />
                <p className="text-xs text-ink-faint">
                  Token ve secret’lar şifreli saklanır; API/log/frontend’e dönmez. Düzenlemede boş
                  bırakılan secret korunur. Test mesaj göndermez; Graph telefon doğrulaması yapar.
                </p>
              </>
            )}

            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="NOT_CONFIGURED">Yapılandırılmadı</option>
              <option value="DISABLED">Devre dışı</option>
              <option value="ACTIVE">Aktif</option>
              <option value="ERROR">Hata</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditId(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm"
              >
                İptal
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
