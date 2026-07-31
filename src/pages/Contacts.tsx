import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Shield,
  UserRound,
  X,
} from 'lucide-react'
import { brandApi, contactApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

const PREF_LABEL: Record<string, string> = {
  UNKNOWN: 'Bilinmiyor',
  OPTED_IN: 'İzinli',
  OPTED_OUT: 'Red',
  BLOCKED: 'Engelli',
}

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: 'E-posta',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
}

function prefTone(status?: string) {
  if (status === 'OPTED_IN') return 'text-emerald-700 bg-emerald-50'
  if (status === 'OPTED_OUT') return 'text-amber-800 bg-amber-50'
  if (status === 'BLOCKED') return 'text-red-700 bg-red-50'
  return 'text-ink-soft bg-canvas-line/40'
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

function primaryPoint(points: any[], channel: string) {
  const list = (points || []).filter((p) => p.channel_type === channel)
  return list.find((p) => p.is_primary) || list[0] || null
}

function friendlyError(err: any) {
  const status = err?.response?.status
  const msg = String(err?.response?.data?.error || '').trim()
  if (msg) return msg
  if (status === 409) return 'Bu telefon numarası zaten kayıtlı.'
  if (status === 404) return 'Bu marka bulunamadı.'
  if (status === 400) return 'İstek geçersiz. Lütfen alanları kontrol edin.'
  return 'İşlem tamamlanamadı'
}

/** Build canonical E.164 from UI country code + national number. */
function toE164Phone(phone: string, countryCode: string): string | null {
  let raw = String(phone || '').trim().replace(/[\s().-]/g, '')
  if (!raw) return null
  if (raw.startsWith('00')) raw = `+${raw.slice(2)}`
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) return null
    return `+${digits}`
  }
  const cc = String(countryCode || '').replace(/\D/g, '')
  let local = raw.replace(/\D/g, '')
  if (!local) return null
  if (local.startsWith('0')) local = local.slice(1)
  if (cc && local.startsWith(cc) && local.length > cc.length) {
    const without = local.slice(cc.length)
    if (without.length >= 7) local = without
  }
  if (!cc) return null
  const combined = `${cc}${local}`
  if (combined.length < 8 || combined.length > 15) return null
  return `+${combined}`
}

export default function Contacts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [brandId, setBrandId] = useState('')
  const [channel, setChannel] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [createForm, setCreateForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    title: '',
    email: '',
    phone: '',
    country_code: '90',
    brand_ids: [] as number[],
    whatsapp_opt_in: false,
  })
  const [prefDraft, setPrefDraft] = useState<Record<string, string>>({})
  const [pointForm, setPointForm] = useState({
    channel_type: 'EMAIL',
    value: '',
    country_code: '',
    label: '',
  })
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    title: '',
    notes: '',
  })
  const [editing, setEditing] = useState(false)

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const listParams = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      brand_id: brandId || undefined,
      channel: channel || undefined,
      limit: 40,
    }),
    [q, status, brandId, channel]
  )

  const { data: listPayload, isLoading } = useQuery({
    queryKey: ['contacts', listParams],
    queryFn: async () => {
      const res = await contactApi.list(listParams)
      return res.data
    },
  })

  const contacts = Array.isArray(listPayload?.data) ? listPayload.data : []

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['contact', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const res = await contactApi.get(selectedId!)
      return res.data
    },
  })

  const { data: timeline = [] } = useQuery({
    queryKey: ['contact-timeline', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const res = await contactApi.timeline(selectedId!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  useEffect(() => {
    if (!detail) return
    setEditForm({
      first_name: detail.first_name || '',
      last_name: detail.last_name || '',
      company_name: detail.company_name || '',
      title: detail.title || '',
      notes: detail.notes || '',
    })
    const next: Record<string, string> = {}
    for (const ch of ['EMAIL', 'SMS', 'WHATSAPP']) {
      const pref = (detail.preferences || []).find(
        (p: any) => p.channel_type === ch && !p.brand_id
      )
      next[ch] = pref?.status || 'UNKNOWN'
    }
    setPrefDraft(next)
  }, [detail])

  const invalidateContact = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['contact', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', selectedId] })
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.brand_ids.length) {
        throw Object.assign(new Error('Bu marka bulunamadı.'), {
          response: { status: 400, data: { error: 'En az bir marka seçin.' } },
        })
      }

      const points: any[] = []
      const email = createForm.email.trim()
      if (email) {
        points.push({ channel_type: 'EMAIL', value: email, is_primary: true })
      }

      if (createForm.phone.trim()) {
        const e164 = toE164Phone(createForm.phone, createForm.country_code)
        if (!e164) {
          throw Object.assign(new Error('Telefon numarası geçersiz.'), {
            response: { status: 400, data: { error: 'Telefon numarası geçersiz.' } },
          })
        }
        // SMS + WhatsApp same number so contact appears in both pickers
        points.push({ channel_type: 'SMS', value: e164, is_primary: true })
        points.push({ channel_type: 'WHATSAPP', value: e164, is_primary: true })
      }

      return contactApi.create({
        first_name: createForm.first_name.trim() || null,
        last_name: createForm.last_name.trim() || null,
        company_name: createForm.company_name.trim() || null,
        title: createForm.title.trim() || null,
        brand_ids: createForm.brand_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0),
        contact_points: points,
        email: email || null,
        whatsapp_opt_in: createForm.whatsapp_opt_in,
      })
    },
    onSuccess: (res) => {
      setShowCreate(false)
      setError('')
      setCreateForm({
        first_name: '',
        last_name: '',
        company_name: '',
        title: '',
        email: '',
        phone: '',
        country_code: '90',
        brand_ids: [],
        whatsapp_opt_in: false,
      })
      invalidateContact()
      if (res.data?.id) setSelectedId(res.data.id)
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => contactApi.remove(id),
    onSuccess: () => {
      setSelectedId(null)
      invalidateContact()
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () => contactApi.update(selectedId!, editForm),
    onSuccess: () => {
      setEditing(false)
      invalidateContact()
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const addPointMutation = useMutation({
    mutationFn: () =>
      contactApi.addPoint(selectedId!, {
        channel_type: pointForm.channel_type,
        value: pointForm.value,
        country_code: pointForm.country_code || undefined,
        label: pointForm.label || undefined,
        is_primary: true,
      }),
    onSuccess: () => {
      setPointForm({ channel_type: 'EMAIL', value: '', country_code: '', label: '' })
      invalidateContact()
    },
    onError: (err) => setError(friendlyError(err)),
  })

  const removePointMutation = useMutation({
    mutationFn: (pointId: number) => contactApi.removePoint(selectedId!, pointId),
    onSuccess: () => invalidateContact(),
    onError: (err) => setError(friendlyError(err)),
  })

  const linkBrandMutation = useMutation({
    mutationFn: (id: number) => contactApi.linkBrand(selectedId!, id),
    onSuccess: () => invalidateContact(),
    onError: (err) => setError(friendlyError(err)),
  })

  const unlinkBrandMutation = useMutation({
    mutationFn: (id: number) => contactApi.unlinkBrand(selectedId!, id),
    onSuccess: () => invalidateContact(),
    onError: (err) => setError(friendlyError(err)),
  })

  const prefMutation = useMutation({
    mutationFn: (payload: { channel_type: string; status: string }) =>
      contactApi.updatePreferences(selectedId!, {
        channel_type: payload.channel_type,
        status: payload.status,
        source: 'user_explicit',
      }),
    onSuccess: () => invalidateContact(),
    onError: (err) => setError(friendlyError(err)),
  })

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  const emailPrimary = detail ? primaryPoint(detail.contact_points, 'EMAIL') : null
  const smsPrimary = detail ? primaryPoint(detail.contact_points, 'SMS') : null
  const waPrimary =
    detail
      ? primaryPoint(detail.contact_points, 'WHATSAPP') ||
        primaryPoint(detail.contact_points, 'SMS')
      : null
  const smsConfigured = true

  return (
    <div className="mc-shell pt-1 pb-8 h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <div className="flex items-end justify-between gap-4 mb-5 shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">İletişim</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Kişiler</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} tenant’ınızda tek kişi kaydı; marka bağlantıları ve kanal izinleri.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('')
            setShowCreate(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm hover:bg-dock-raised transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni kişi
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 shrink-0">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError('')}>
            Kapat
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        <section className="mc-panel mc-panel-asymmetric flex flex-col w-full lg:w-[22rem] xl:w-[24rem] shrink-0 min-h-0 overflow-hidden">
          <div className="p-3 border-b border-canvas-line space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ad, şirket, e-posta…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-canvas-line/30 text-sm border border-transparent focus:border-signal/40 outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs rounded-lg bg-canvas-line/30 px-2 py-1.5 outline-none"
              >
                <option value="">Aktif</option>
                <option value="ACTIVE">Aktif (tümü)</option>
                <option value="ARCHIVED">Arşiv</option>
                <option value="BLOCKED">Engelli</option>
              </select>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="text-xs rounded-lg bg-canvas-line/30 px-2 py-1.5 outline-none"
              >
                <option value="">Marka</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="text-xs rounded-lg bg-canvas-line/30 px-2 py-1.5 outline-none"
              >
                <option value="">Kanal</option>
                <option value="EMAIL">E-posta</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-canvas-line/50" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center">
                <UserRound className="w-9 h-9 text-ink-faint mx-auto mb-2" />
                <p className="text-sm text-ink-soft">Kişi bulunamadı</p>
              </div>
            ) : (
              <ul className="divide-y divide-canvas-line/80">
                {contacts.map((c: any) => {
                  const email = primaryPoint(c.contact_points, 'EMAIL')
                  const phone =
                    primaryPoint(c.contact_points, 'SMS') ||
                    primaryPoint(c.contact_points, 'WHATSAPP')
                  const active = selectedId === c.id
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left px-3 py-3 transition-colors ${
                          active ? 'bg-signal/10' : 'hover:bg-canvas-line/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">
                              {c.display_name || 'İsimsiz'}
                            </p>
                            <p className="text-xs text-ink-soft truncate mt-0.5">
                              {email?.value || phone?.value || 'İletişim yok'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                            {(c.brands || []).slice(0, 2).map((b: any) => (
                              <span
                                key={b.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-dock/10 text-dock"
                              >
                                {b.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(c.preferences || []).map((p: any) => (
                            <span
                              key={`${p.channel_type}-${p.brand_id || 'g'}`}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${prefTone(p.status)}`}
                            >
                              {CHANNEL_LABEL[p.channel_type] || p.channel_type}:{' '}
                              {PREF_LABEL[p.status] || p.status}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="mc-panel mc-panel-asymmetric flex-1 min-h-0 overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Shield className="w-10 h-10 text-ink-faint mx-auto mb-3" />
                <p className="text-ink font-medium">Kişi detayı</p>
                <p className="text-sm text-ink-soft mt-1">
                  Soldan bir kişi seçin veya yeni kişi ekleyin.
                </p>
              </div>
            </div>
          ) : detailLoading || !detail ? (
            <div className="p-6 animate-pulse space-y-3">
              <div className="h-8 bg-canvas-line/50 rounded w-1/3" />
              <div className="h-24 bg-canvas-line/40 rounded" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {detail.display_name}
                  </h2>
                  {detail.title && (
                    <p className="text-sm text-ink-soft mt-0.5">{detail.title}</p>
                  )}
                  <p className="text-xs text-ink-faint mt-1">
                    Son iletişim: {formatTime(detail.last_contact_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!emailPrimary}
                    onClick={() =>
                      navigate(`/compose?to=${encodeURIComponent(emailPrimary?.value || '')}`)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dock text-white text-xs disabled:opacity-40"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    E-posta Gönder
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-canvas-line text-xs text-ink-soft"
                    title={smsConfigured ? 'SMS yaz' : 'Henüz yapılandırılmadı'}
                    onClick={() => {
                      if (!smsPrimary) {
                        setError('SMS numarası yok')
                        return
                      }
                      navigate(
                        `/compose/sms?to=${encodeURIComponent(smsPrimary.value || '')}`
                      )
                    }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    SMS Gönder
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-canvas-line text-xs text-ink-soft"
                    onClick={() => {
                      if (!waPrimary) {
                        setError('WhatsApp/telefon numarası yok')
                        return
                      }
                      navigate(
                        `/compose/whatsapp?to=${encodeURIComponent(waPrimary.value || '')}`
                      )
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="px-3 py-2 rounded-lg border border-canvas-line text-xs"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bu kişiyi arşivlemek istiyor musunuz?')) {
                        archiveMutation.mutate(detail.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Arşivle
                  </button>
                </div>
              </div>

              {editing && (
                <form
                  className="grid gap-2 md:grid-cols-2 p-3 rounded-xl bg-canvas-line/20"
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateMutation.mutate()
                  }}
                >
                  <input
                    className="px-3 py-2 rounded-lg text-sm bg-white border border-canvas-line"
                    placeholder="Ad"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg text-sm bg-white border border-canvas-line"
                    placeholder="Soyad"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg text-sm bg-white border border-canvas-line"
                    placeholder="Şirket"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-lg text-sm bg-white border border-canvas-line"
                    placeholder="Ünvan"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <textarea
                    className="md:col-span-2 px-3 py-2 rounded-lg text-sm bg-white border border-canvas-line"
                    placeholder="Notlar"
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                  <div className="md:col-span-2 flex gap-2">
                    <button type="submit" className="px-3 py-2 rounded-lg bg-dock text-white text-xs">
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3 py-2 rounded-lg border text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-[11px] uppercase tracking-[0.16em] text-ink-faint mb-2">
                    İletişim noktaları
                  </h3>
                  <ul className="space-y-2">
                    {(detail.contact_points || []).map((p: any) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-canvas-line/25"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-ink-faint">
                            {CHANNEL_LABEL[p.channel_type]}
                            {p.is_primary ? ' · birincil' : ''}
                            {p.label ? ` · ${p.label}` : ''}
                          </p>
                          <p className="truncate font-medium text-ink">{p.value}</p>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() => removePointMutation.mutate(p.id)}
                        >
                          Kaldır
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="mt-3 grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      addPointMutation.mutate()
                    }}
                  >
                    <div className="flex gap-2">
                      <select
                        value={pointForm.channel_type}
                        onChange={(e) =>
                          setPointForm({ ...pointForm, channel_type: e.target.value })
                        }
                        className="text-xs rounded-lg bg-canvas-line/30 px-2 py-2"
                      >
                        <option value="EMAIL">E-posta</option>
                        <option value="SMS">SMS</option>
                        <option value="WHATSAPP">WhatsApp</option>
                      </select>
                      <input
                        value={pointForm.value}
                        onChange={(e) => setPointForm({ ...pointForm, value: e.target.value })}
                        placeholder={
                          pointForm.channel_type === 'EMAIL' ? 'eposta@ornek.com' : '+905...'
                        }
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-canvas-line"
                        required
                      />
                    </div>
                    {pointForm.channel_type !== 'EMAIL' && (
                      <input
                        value={pointForm.country_code}
                        onChange={(e) =>
                          setPointForm({ ...pointForm, country_code: e.target.value })
                        }
                        placeholder="Ülke kodu (örn. 90) — + yoksa gerekli"
                        className="text-sm px-3 py-2 rounded-lg border border-canvas-line"
                      />
                    )}
                    <button type="submit" className="text-xs px-3 py-2 rounded-lg bg-dock text-white w-fit">
                      Nokta ekle
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-[11px] uppercase tracking-[0.16em] text-ink-faint mb-2">
                    Marka ilişkileri
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(detail.brands || []).map((b: any) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-dock/10 text-dock"
                      >
                        {b.name}
                        <button
                          type="button"
                          onClick={() => unlinkBrandMutation.mutate(b.id)}
                          aria-label="Kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(detail.brands || []).length === 0 && (
                      <p className="text-sm text-ink-soft">Bağlı marka yok</p>
                    )}
                  </div>
                  <select
                    className="text-sm rounded-lg border border-canvas-line px-3 py-2 w-full"
                    defaultValue=""
                    onChange={(e) => {
                      const id = Number(e.target.value)
                      if (id) linkBrandMutation.mutate(id)
                      e.target.value = ''
                    }}
                  >
                    <option value="">Marka bağla…</option>
                    {brands
                      .filter(
                        (b: any) => !(detail.brands || []).some((x: any) => x.id === b.id)
                      )
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>

                  <h3 className="text-[11px] uppercase tracking-[0.16em] text-ink-faint mt-5 mb-2">
                    Kanal tercihleri
                  </h3>
                  <div className="space-y-2">
                    {['EMAIL', 'SMS', 'WHATSAPP'].map((ch) => (
                      <div
                        key={ch}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-canvas-line/25"
                      >
                        <span className="text-sm">{CHANNEL_LABEL[ch]}</span>
                        <select
                          value={prefDraft[ch] || 'UNKNOWN'}
                          onChange={(e) => {
                            const statusValue = e.target.value
                            setPrefDraft({ ...prefDraft, [ch]: statusValue })
                            prefMutation.mutate({ channel_type: ch, status: statusValue })
                          }}
                          className={`text-xs rounded-lg px-2 py-1.5 ${prefTone(prefDraft[ch])}`}
                        >
                          <option value="UNKNOWN">Bilinmiyor</option>
                          <option value="OPTED_IN">İzinli</option>
                          <option value="OPTED_OUT">Red</option>
                          <option value="BLOCKED">Engelli</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-ink-faint mb-2">
                  İzin geçmişi
                </h3>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(detail.consent_events || []).length === 0 && (
                    <li className="text-sm text-ink-soft">Henüz izin kaydı yok</li>
                  )}
                  {(detail.consent_events || []).map((ev: any) => (
                    <li key={ev.id} className="text-xs text-ink-soft px-2 py-1.5 rounded bg-canvas-line/20">
                      <span className="text-ink font-medium">
                        {CHANNEL_LABEL[ev.channel_type]}:{' '}
                        {ev.previous_status || '—'} → {ev.new_status}
                      </span>
                      <span className="ml-2">{formatTime(ev.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-ink-faint mb-2">
                  İletişim zaman çizelgesi
                </h3>
                <div className="relative space-y-3 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-canvas-line pl-5">
                  {timeline.length === 0 && (
                    <p className="text-sm text-ink-soft">Henüz olay yok</p>
                  )}
                  {timeline.map((item: any, idx: number) => (
                    <div key={`${item.type}-${idx}`} className="relative">
                      <span className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-signal" />
                      <p className="text-sm text-ink font-medium">{item.title}</p>
                      <p className="text-xs text-ink-soft">
                        {formatTime(item.at)}
                        {item.detail ? ` · ${item.detail}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dock/40 backdrop-blur-[2px]">
          <form
            onSubmit={onCreate}
            className="mc-panel w-full max-w-lg p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Yeni kişi</h3>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-ink-soft" />
              </button>
            </div>
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
                placeholder="Ad"
                value={createForm.first_name}
                onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
              />
              <input
                className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
                placeholder="Soyad"
                value={createForm.last_name}
                onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
              />
            </div>
            <input
              className="w-full px-3 py-2 rounded-lg border border-canvas-line text-sm"
              placeholder="Şirket"
              value={createForm.company_name}
              onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-lg border border-canvas-line text-sm"
              placeholder="E-posta (opsiyonel)"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <input
                className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
                placeholder="90"
                value={createForm.country_code}
                onChange={(e) => setCreateForm({ ...createForm, country_code: e.target.value })}
                aria-label="Ülke kodu"
              />
              <input
                className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
                placeholder="5323171755"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                aria-label="Telefon"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((b: any) => {
                const brandId = Number(b.id)
                const on = createForm.brand_ids.includes(brandId)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        brand_ids: on
                          ? createForm.brand_ids.filter((id) => id !== brandId)
                          : [...createForm.brand_ids, brandId],
                      })
                    }
                    className={`text-xs px-2 py-1 rounded-lg border ${
                      on ? 'bg-dock text-white border-dock' : 'border-canvas-line'
                    }`}
                  >
                    {b.name}
                  </button>
                )
              })}
            </div>
            <label className="flex items-start gap-2 text-sm text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={createForm.whatsapp_opt_in}
                onChange={(e) =>
                  setCreateForm({ ...createForm, whatsapp_opt_in: e.target.checked })
                }
              />
              <span>
                <span className="font-medium">WhatsApp izni</span>
                <span className="block text-xs text-ink-soft mt-0.5">
                  Varsayılan kapalı. Açık olursa kişi WhatsApp Yaz’da izinli olarak seçilebilir.
                </span>
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 text-sm rounded-lg border"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-dock text-white"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
