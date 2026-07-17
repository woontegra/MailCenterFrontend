import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  Mail,
  Pencil,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { accountApi, brandApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

type ProviderKind = 'imap' | 'gmail' | 'outlook'

type AccountRow = {
  id: number
  name: string
  email: string
  brand_id?: number | null
  brand_name?: string | null
  brand_accent_color?: string | null
  imap_host?: string
  imap_port?: number
  imap_user?: string
  imap_secure?: boolean
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_user?: string | null
  smtp_secure?: boolean
  provider?: string
  is_active: boolean
  imap_connection_status?: string | null
  smtp_connection_status?: string | null
  last_connection_test_at?: string | null
  channel_last_tested_at?: string | null
  last_inbound_at?: string | null
  last_sync_at?: string | null
  imap_idle_status?: string | null
  imap_idle_error?: string | null
  imap_listener_active?: boolean
  sender_display_name?: string | null
  reply_to?: string | null
}

const providerPresets: Record<ProviderKind, Partial<FormState>> = {
  imap: {},
  gmail: {
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_secure: false,
  },
  outlook: {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: false,
  },
}

type FormState = {
  brand_id: string
  name: string
  email: string
  provider: ProviderKind
  imap_host: string
  imap_port: number
  imap_secure: boolean
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  imap_user: string
  imap_password: string
  smtp_password: string
  sender_display_name: string
  reply_to: string
  is_active: boolean
  test_connection: boolean
}

const emptyForm = (): FormState => ({
  brand_id: '',
  name: '',
  email: '',
  provider: 'imap',
  imap_host: '',
  imap_port: 993,
  imap_secure: true,
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  imap_user: '',
  imap_password: '',
  smtp_password: '',
  sender_display_name: '',
  reply_to: '',
  is_active: true,
  test_connection: true,
})

function statusLabel(status?: string | null) {
  if (status === 'ok') return { text: 'Bağlı', className: 'text-emerald-700 bg-emerald-50' }
  if (status === 'error') return { text: 'Hata', className: 'text-red-700 bg-red-50' }
  return { text: 'Bilinmiyor', className: 'text-ink-faint bg-canvas-soft' }
}

function idleStatusLabel(account: AccountRow) {
  if (!account.is_active) {
    return { text: 'Pasif', className: 'text-ink-faint bg-canvas-soft' }
  }
  const status = (account.imap_idle_status || '').toUpperCase()
  if (status === 'IDLE' && account.imap_listener_active) {
    return { text: 'Canlı dinleniyor', className: 'text-emerald-700 bg-emerald-50' }
  }
  if (status === 'CONNECTING' || status === 'RECONNECTING') {
    return { text: 'Yeniden bağlanıyor', className: 'text-amber-800 bg-amber-50' }
  }
  if (status === 'ERROR') {
    return { text: 'Bağlantı hatası', className: 'text-red-700 bg-red-50' }
  }
  if (status === 'DISABLED') {
    return { text: 'Dinleyici kapalı', className: 'text-ink-faint bg-canvas-soft' }
  }
  return statusLabel(account.imap_connection_status)
}

function formatTestTime(value?: string | null) {
  if (!value) return 'Henüz test edilmedi'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return 'Henüz test edilmedi'
  }
}

function formatInboundTime(value?: string | null) {
  if (!value) return 'Henüz mail alınmadı'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return 'Henüz mail alınmadı'
  }
}

export default function Accounts() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AccountRow | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountApi.getAccounts()
      return Array.isArray(res.data) ? (res.data as AccountRow[]) : []
    },
    refetchInterval: 10000,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountApi.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
      queryClient.invalidateQueries({ queryKey: ['sender-identities'] })
      setInfo('Hesap silindi')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Hesap silinemedi'),
  })

  const testMutation = useMutation({
    mutationFn: (id: number) => accountApi.testConnection({ account_id: id }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setInfo(res.data?.message || (res.data?.success ? 'Bağlantı başarılı' : 'Bağlantı başarısız'))
      if (!res.data?.success) {
        setError(res.data?.message || 'Bağlantı testi başarısız')
      } else {
        setError('')
      }
    },
    onError: (err: any) =>
      setError(err.response?.data?.error || err.response?.data?.message || 'Bağlantı testi başarısız'),
  })

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Bağlantılar</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">
            E-posta Hesapları
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} altında markaya bağlı gerçek e-posta hesaplarını güvenli biçimde yönetin.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
            setError('')
          }}
          disabled={brands.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm hover:bg-dock-raised transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Hesap ekle
        </button>
      </div>

      {brands.length === 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          Önce Markalar ekranından en az bir marka oluşturun.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}
      {info && !error && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{info}</div>
      )}

      {isLoading ? (
        <div className="animate-pulse grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-canvas-line/50 rounded-2xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center">
          <Mail className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">Henüz e-posta hesabı yok</p>
          <p className="text-sm text-ink-soft mt-1">
            Marka seçerek IMAP/SMTP ile gerçek hesabınızı bağlayın.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const imap = statusLabel(account.imap_connection_status)
            const smtp = statusLabel(account.smtp_connection_status)
            const idle = idleStatusLabel(account)
            const testedAt = account.last_connection_test_at || account.channel_last_tested_at
            return (
              <div
                key={account.id}
                className="mc-panel mc-panel-asymmetric p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: account.brand_accent_color || '#0f9aa8' }}
                      />
                      <p className="text-xs uppercase tracking-[0.12em] text-ink-faint truncate">
                        {account.brand_name || 'Marka atanmadı'}
                      </p>
                    </div>
                    <p className="font-display text-lg text-ink truncate">{account.name}</p>
                    <p className="text-sm text-ink-soft truncate">{account.email}</p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-1 rounded-lg ${
                      account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas-soft text-ink-faint'
                    }`}
                  >
                    {account.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className={`rounded-xl px-3 py-2 text-xs ${idle.className}`}>
                  <p className="uppercase tracking-[0.12em] opacity-70">Gelen posta</p>
                  <p className="font-medium mt-0.5">{idle.text}</p>
                  {account.imap_idle_status === 'ERROR' && account.imap_idle_error ? (
                    <p className="mt-1 opacity-80 line-clamp-2">{account.imap_idle_error}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-xl px-3 py-2 ${imap.className}`}>
                    <p className="uppercase tracking-[0.12em] opacity-70">IMAP</p>
                    <p className="font-medium mt-0.5">{imap.text}</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${smtp.className}`}>
                    <p className="uppercase tracking-[0.12em] opacity-70">SMTP</p>
                    <p className="font-medium mt-0.5">{smtp.text}</p>
                  </div>
                </div>

                <div className="text-xs text-ink-faint space-y-0.5">
                  <p>Son mail: {formatInboundTime(account.last_inbound_at)}</p>
                  <p>Son senkron: {formatTestTime(account.last_sync_at)}</p>
                  <p>Son test: {formatTestTime(testedAt)}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setError('')
                      setInfo('')
                      testMutation.mutate(account.id)
                    }}
                    disabled={testMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-canvas-soft text-ink hover:bg-canvas-line transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testMutation.isPending ? 'animate-spin' : ''}`} />
                    Yeniden test et
                  </button>
                  <button
                    onClick={() => {
                      setEditing(account)
                      setShowForm(true)
                      setError('')
                    }}
                    className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-canvas-soft transition-colors"
                    aria-label="Düzenle"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
                        deleteMutation.mutate(account.id)
                      }
                    }}
                    className="p-2 rounded-xl text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <AccountFormModal
          brands={brands}
          editing={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditing(null)
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['channel-connections'] })
            queryClient.invalidateQueries({ queryKey: ['sender-identities'] })
            setInfo(editing ? 'Hesap güncellendi' : 'Hesap eklendi')
            setError('')
          }}
        />
      )}
    </div>
  )
}

function AccountFormModal({
  brands,
  editing,
  onClose,
  onSuccess,
}: {
  brands: any[]
  editing: AccountRow | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!editing) {
      setForm({
        ...emptyForm(),
        brand_id: brands[0] ? String(brands[0].id) : '',
      })
      return
    }

    setForm({
      brand_id: editing.brand_id ? String(editing.brand_id) : brands[0] ? String(brands[0].id) : '',
      name: editing.name || '',
      email: editing.email || '',
      provider: (editing.provider === 'gmail' || editing.provider === 'outlook'
        ? editing.provider
        : 'imap') as ProviderKind,
      imap_host: editing.imap_host || '',
      imap_port: editing.imap_port || 993,
      imap_secure: editing.imap_secure !== false,
      smtp_host: editing.smtp_host || '',
      smtp_port: editing.smtp_port || 587,
      smtp_secure: Boolean(editing.smtp_secure),
      imap_user: editing.imap_user || editing.email || '',
      imap_password: '',
      smtp_password: '',
      sender_display_name: editing.sender_display_name || editing.name || '',
      reply_to: editing.reply_to || '',
      is_active: editing.is_active !== false,
      test_connection: true,
    })
  }, [editing, brands])

  const oauthHint = useMemo(() => {
    if (form.provider === 'gmail') {
      return 'Google için bu aşamada OAuth yok. Gmail uygulama parolası veya özel IMAP/SMTP kullanın.'
    }
    if (form.provider === 'outlook') {
      return 'Microsoft için bu aşamada OAuth yok. Uygulama parolası veya özel IMAP/SMTP kullanın.'
    }
    return null
  }, [form.provider])

  const applyProvider = (provider: ProviderKind) => {
    const preset = providerPresets[provider]
    setForm((prev) => ({
      ...prev,
      provider,
      ...preset,
    }))
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      brand_id: Number(form.brand_id),
      name: form.name,
      email: form.email,
      provider: form.provider,
      imap_host: form.imap_host,
      imap_port: form.imap_port,
      imap_user: form.imap_user || form.email,
      imap_secure: form.imap_secure,
      smtp_host: form.smtp_host || null,
      smtp_port: form.smtp_port,
      smtp_user: form.imap_user || form.email,
      smtp_secure: form.smtp_secure,
      sender_display_name: form.sender_display_name || form.name,
      reply_to: form.reply_to || null,
      is_active: form.is_active,
      test_connection: form.test_connection,
    }

    if (form.imap_password) payload.imap_password = form.imap_password
    if (form.smtp_password) payload.smtp_password = form.smtp_password
    else if (form.imap_password) payload.smtp_password = form.imap_password

    return payload
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      if (!editing && !payload.imap_password) {
        throw { response: { data: { error: 'Parola zorunludur' } } }
      }
      if (editing) {
        return accountApi.updateAccount(editing.id, payload)
      }
      return accountApi.createAccount(payload)
    },
    onSuccess: () => onSuccess(),
    onError: (err: any) => setError(err.response?.data?.error || 'Hesap kaydedilemedi'),
  })

  const handleTest = async () => {
    setError('')
    setTesting(true)
    try {
      const payload = buildPayload()
      const body: Record<string, unknown> = editing
        ? { account_id: editing.id, ...payload }
        : payload

      if (!editing && !payload.imap_password) {
        setError('Test için parola gerekli')
        return
      }

      const res = await accountApi.testConnection(body)
      if (res.data?.success) {
        setError('')
        setInfo(res.data.message || 'Bağlantı başarılı')
      } else {
        setInfo('')
        setError(res.data?.message || 'Bağlantı testi başarısız')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Bağlantı testi başarısız')
    } finally {
      setTesting(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    saveMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl rounded-tr-md w-full max-w-2xl max-h-[92vh] overflow-auto p-6 space-y-4"
      >
        <div>
          <h2 className="font-display text-lg text-ink">
            {editing ? 'Hesabı düzenle' : 'E-posta hesabı ekle'}
          </h2>
          <p className="text-xs text-ink-soft mt-1">Parola API cevaplarında asla geri doldurulmaz.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}
        {info && !error && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{info}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Marka</span>
            <select
              required
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            >
              <option value="" disabled>
                Marka seçin
              </option>
              {brands.map((brand: any) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Hesap görünen adı</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">E-posta adresi</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                  imap_user: form.imap_user || e.target.value,
                })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Sağlayıcı</span>
            <select
              value={form.provider}
              onChange={(e) => applyProvider(e.target.value as ProviderKind)}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            >
              <option value="imap">Özel SMTP/IMAP</option>
              <option value="gmail">Google</option>
              <option value="outlook">Microsoft</option>
            </select>
          </label>
        </div>

        {oauthHint && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {oauthHint}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">IMAP host</span>
            <input
              required
              value={form.imap_host}
              onChange={(e) => setForm({ ...form, imap_host: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">IMAP port</span>
            <input
              required
              type="number"
              value={form.imap_port}
              onChange={(e) => setForm({ ...form, imap_port: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.imap_secure}
              onChange={(e) => setForm({ ...form, imap_secure: e.target.checked })}
            />
            IMAP SSL/TLS
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">SMTP host</span>
            <input
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">SMTP port</span>
            <input
              type="number"
              value={form.smtp_port}
              onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.smtp_secure}
              onChange={(e) => setForm({ ...form, smtp_secure: e.target.checked })}
            />
            SMTP SSL/TLS
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Kullanıcı adı</span>
            <input
              required
              value={form.imap_user}
              onChange={(e) => setForm({ ...form, imap_user: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">
              Parola {editing ? '(boş bırakılırsa korunur)' : ''}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required={!editing}
              value={form.imap_password}
              onChange={(e) => setForm({ ...form, imap_password: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder={editing ? '••••••••' : ''}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">SMTP parola (opsiyonel)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.smtp_password}
              onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Boşsa IMAP parolası kullanılır"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Varsayılan gönderen adı</span>
            <input
              value={form.sender_display_name}
              onChange={(e) => setForm({ ...form, sender_display_name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-ink-faint uppercase tracking-[0.12em]">Reply-To</span>
            <input
              type="email"
              value={form.reply_to}
              onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft pt-6">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Aktif
          </label>
          {!editing && (
            <label className="flex items-center gap-2 text-sm text-ink-soft pt-6">
              <input
                type="checkbox"
                checked={form.test_connection}
                onChange={(e) => setForm({ ...form, test_connection: e.target.checked })}
              />
              Kaydetmeden önce bağlantıyı test et
            </label>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-canvas-soft text-sm text-ink"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl border border-canvas-line text-sm text-ink disabled:opacity-50"
          >
            {testing ? 'Test ediliyor...' : 'Bağlantıyı test et'}
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="ml-auto px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Hesabı kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
