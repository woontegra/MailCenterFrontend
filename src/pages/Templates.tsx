import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Plus, Search, Trash2, Pencil } from 'lucide-react'
import { brandApi, channelConnectionApi, senderIdentityApi, templateApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { normalizeWhatsAppTemplateName } from '../utils/whatsappTemplateName'
import { approvalStatusHelp, mailCenterRecordStatusLabel, whatsappTemplateSendabilityLabel } from '../utils/displayLabels'
import WhatsAppReadyLibrary from '../components/templates/WhatsAppReadyLibrary'

const emptyForm = () => ({
  brand_id: '',
  channel_type: 'EMAIL',
  sender_identity_id: '',
  channel_connection_id: '',
  name: '',
  subject: '',
  content: '',
  plain_text_content: '',
  variables: '',
  is_active: true,
  provider_template_name: '',
  provider_template_language: 'tr',
  category: '',
})

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Yardımcı',
  MARKETING: 'Pazarlama',
  AUTHENTICATION: 'Kimlik doğrulama',
}

function templateCategory(tpl: any): string {
  const comps = tpl?.provider_template_components
  if (comps && typeof comps === 'object' && !Array.isArray(comps) && comps.category) {
    const raw = String(comps.category).toUpperCase()
    return CATEGORY_LABELS[raw] || String(comps.category)
  }
  return '—'
}

function whatsappChannelLabel(c: any): string {
  const title =
    c?.settings?.verified_name ||
    c?.display_name ||
    c?.settings?.waba_name ||
    'WhatsApp'
  const phone = c?.settings?.business_phone_number || '—'
  return `${title} — ${phone}`
}

export default function Templates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canManage = useAuthStore((s) => s.hasPermission('TEMPLATE_MANAGE'))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [previewTpl, setPreviewTpl] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [mainTab, setMainTab] = useState<'mine' | 'library'>('mine')

  const listParams = useMemo(() => {
    const p: Record<string, string | number> = {}
    if (brandFilter) p.brand_id = Number(brandFilter)
    if (search.trim()) p.q = search.trim()
    return p
  }, [brandFilter, search])

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities'],
    queryFn: async () => (await senderIdentityApi.list()).data,
  })

  const { data: waConnections = [] } = useQuery({
    queryKey: ['channel-connections', 'WHATSAPP', form.brand_id],
    enabled: form.channel_type === 'WHATSAPP' && Boolean(form.brand_id),
    queryFn: async () => {
      const res = await channelConnectionApi.list({
        channel_type: 'WHATSAPP',
        brand_id: Number(form.brand_id),
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((c: any) => String(c.status || '').toUpperCase() === 'ACTIVE')
    },
  })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', listParams],
    queryFn: async () => {
      const res = await templateApi.list(listParams)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const filteredSenders = useMemo(
    () =>
      senders.filter(
        (s: any) =>
          (!form.brand_id || String(s.brand_id) === String(form.brand_id)) &&
          s.channel_type === form.channel_type
      ),
    [senders, form.brand_id, form.channel_type]
  )

  useEffect(() => {
    if (form.channel_type !== 'WHATSAPP' || !form.brand_id) return
    if (waConnections.length === 1) {
      const onlyId = String(waConnections[0].id)
      if (form.channel_connection_id !== onlyId) {
        setForm((prev) => ({ ...prev, channel_connection_id: onlyId }))
      }
      return
    }
    if (
      form.channel_connection_id &&
      !waConnections.some((c: any) => String(c.id) === String(form.channel_connection_id))
    ) {
      setForm((prev) => ({ ...prev, channel_connection_id: '' }))
    }
  }, [form.channel_type, form.brand_id, form.channel_connection_id, waConnections])

  const waChannelMissing =
    form.channel_type === 'WHATSAPP' && Boolean(form.brand_id) && waConnections.length === 0

  const waChannelRequiredMissing =
    form.channel_type === 'WHATSAPP' &&
    !editingId &&
    (!form.channel_connection_id || waChannelMissing)

  const buildPayload = () => {
    const variables = form.variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    const providerName =
      form.channel_type === 'WHATSAPP'
        ? normalizeWhatsAppTemplateName(form.provider_template_name || form.name)
        : form.provider_template_name || null
    return {
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      channel_type: form.channel_type,
      sender_identity_id:
        form.channel_type === 'WHATSAPP'
          ? null
          : form.sender_identity_id
            ? Number(form.sender_identity_id)
            : null,
      name: form.name,
      subject: form.channel_type === 'EMAIL' ? form.subject : null,
      content: form.content,
      plain_text_content: form.plain_text_content || form.content || null,
      variables,
      is_shared: true,
      is_active: form.is_active,
      ...(form.channel_type === 'WHATSAPP'
        ? {
            provider_template_name: providerName,
            provider_template_language: form.provider_template_language || 'tr',
            category: form.category,
            channelConnectionId: Number(form.channel_connection_id),
          }
        : {}),
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      if (form.channel_type === 'WHATSAPP' && !editingId) {
        if (!form.brand_id) {
          throw Object.assign(new Error('WhatsApp şablonu için marka zorunludur'), {
            response: { data: { error: 'WhatsApp şablonu için marka zorunludur' } },
          })
        }
        if (!form.category) {
          throw Object.assign(new Error('Kategori zorunludur'), {
            response: {
              data: { error: 'Kategori zorunludur (UTILITY, MARKETING veya AUTHENTICATION)' },
            },
          })
        }
        if (!form.channel_connection_id) {
          throw Object.assign(new Error('WhatsApp hesabı seçimi zorunludur'), {
            response: { data: { error: 'WhatsApp hesabı seçimi zorunludur' } },
          })
        }
      }
      if (editingId) return templateApi.update(editingId, payload)
      return templateApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
      setError('')
    },
    onError: (err: any) =>
      setError(err.response?.data?.error || err.message || 'Şablon kaydedilemedi'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => templateApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Şablon silinemedi'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => templateApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Kopyalanamadı'),
  })

  const openLegacyEdit = (tpl: any) => {
    const comps = tpl.provider_template_components
    const category =
      comps && typeof comps === 'object' && !Array.isArray(comps)
        ? String(comps.category || '')
        : ''
    setEditingId(tpl.id)
    setForm({
      brand_id: tpl.brand_id ? String(tpl.brand_id) : '',
      channel_type: tpl.channel_type || 'EMAIL',
      sender_identity_id: tpl.sender_identity_id ? String(tpl.sender_identity_id) : '',
      channel_connection_id: '',
      name: tpl.name || '',
      subject: tpl.subject || '',
      content: tpl.content || '',
      plain_text_content: tpl.plain_text_content || '',
      variables: Array.isArray(tpl.variables)
        ? tpl.variables
            .map((v: any) => (typeof v === 'string' ? v : v?.name))
            .filter(Boolean)
            .join(', ')
        : '',
      is_active: tpl.is_active !== false,
      provider_template_name: tpl.provider_template_name || '',
      provider_template_language: tpl.provider_template_language || 'tr',
      category,
    })
    setShowForm(true)
  }

  const formatDate = (v?: string) => {
    if (!v) return '—'
    try {
      return new Date(v).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">İçerik</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Şablonlar</h1>
          <p className="text-sm text-ink-soft mt-1">
            Hazır WhatsApp şablonlarını hesabınıza ekleyin veya kendi e-posta / SMS / WhatsApp
            şablonlarınızı yönetin.
          </p>
        </div>
        {canManage && mainTab === 'mine' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/templates/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl"
            >
              <Plus className="w-4 h-4" />
              E-posta şablonu
            </button>
            <button
              onClick={() => {
                setEditingId(null)
                setForm({ ...emptyForm(), channel_type: 'SMS' })
                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-canvas-soft text-ink text-sm rounded-xl border border-canvas-line"
            >
              SMS / WhatsApp
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-5 border-b border-canvas-line">
        <button
          type="button"
          onClick={() => setMainTab('library')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mainTab === 'library'
              ? 'border-dock text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          Hazır Kütüphane
        </button>
        <button
          type="button"
          onClick={() => setMainTab('mine')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mainTab === 'mine'
              ? 'border-dock text-ink'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          Şablonlarım
        </button>
      </div>

      {mainTab === 'library' ? (
        <WhatsAppReadyLibrary />
      ) : (
        <>
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sky-950 mb-4">
        <p className="text-sm font-semibold">WhatsApp mesajları ne zaman gönderilebilir?</p>
        <p className="text-sm mt-1 leading-snug text-sky-900/90">
          Müşteri son 24 saat içinde size mesaj gönderdiyse serbest metinle yanıt verebilirsiniz.
          İşletmenizin başlattığı ödeme hatırlatma, randevu, sipariş ve duyuru mesajlarında ise
          onaylı WhatsApp şablonu kullanılır. 24 saat beklemeniz gerekmez; onaylı şablonla mesajı
          doğrudan gönderebilirsiniz.
        </p>
        <ul className="mt-2 space-y-0.5 text-xs text-sky-900/90">
          <li>
            <span className="font-medium">Onay bekliyor:</span> Meta onayı bekleniyor. Onaylanana
            kadar gönderilemez.
          </li>
          <li>
            <span className="font-medium">Onaylandı:</span> Kullanıma hazır.
          </li>
          <li>
            <span className="font-medium">Reddedildi:</span> Meta tarafından reddedildi. Nedeni
            görüntüleyip düzenleyebilirsiniz.
          </li>
          <li>
            <span className="font-medium">Duraklatıldı:</span> Meta tarafından geçici olarak
            durduruldu.
          </li>
          <li>
            <span className="font-medium">Durum güncelleniyor:</span> Durum henüz Meta’dan
            alınamadı. Durumu yenileyin.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-canvas-line text-sm"
            placeholder="Şablon veya konu ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-xl bg-white border border-canvas-line text-sm"
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="">Tüm markalar</option>
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-canvas-line/50 rounded-2xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-ink-soft">
          Henüz şablon yok.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl: any) => {
            const isEmail = tpl.channel_type === 'EMAIL'
            const isWa = tpl.channel_type === 'WHATSAPP'
            const status =
              tpl.is_draft !== false ? 'Taslak' : tpl.is_active === false ? 'Pasif' : 'Aktif'
            return (
              <div key={tpl.id} className="mc-panel mc-panel-asymmetric p-4 flex flex-col">
                <div className="h-24 rounded-lg border border-canvas-line bg-canvas-soft/50 overflow-hidden mb-3">
                  {isEmail && tpl.content ? (
                    <iframe
                      title={`preview-${tpl.id}`}
                      srcDoc={tpl.content}
                      className="w-full h-full border-0 pointer-events-none scale-[0.55] origin-top-left"
                      style={{ width: '182%', height: '182%' }}
                      sandbox=""
                    />
                  ) : (
                    <p className="p-3 text-xs text-ink-faint line-clamp-4">{tpl.content || '—'}</p>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base font-semibold text-ink truncate">{tpl.name}</p>
                  <p className="text-xs text-ink-soft mt-1">
                    {tpl.brand_name || 'Markasız'} · {tpl.channel_type || 'GENEL'}
                  </p>
                  {tpl.subject && (
                    <p className="text-sm text-ink-soft mt-1 truncate">Konu: {tpl.subject}</p>
                  )}
                  {isWa && (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-ink-soft">
                      <li>
                        MailCenter kaydı:{' '}
                        <span className="text-ink font-medium">
                          {mailCenterRecordStatusLabel(tpl)}
                        </span>
                      </li>
                      <li>
                        Onay durumu:{' '}
                        <span className="text-ink font-medium">
                          {approvalStatusHelp(tpl.provider_approval_status)}
                        </span>
                      </li>
                      <li>
                        Kullanılabilirlik:{' '}
                        <span className="text-ink font-medium">
                          {whatsappTemplateSendabilityLabel(tpl)}
                        </span>
                      </li>
                      <li>
                        Dil:{' '}
                        <span className="text-ink font-medium">
                          {tpl.provider_template_language || '—'}
                        </span>
                      </li>
                      <li>
                        Kategori:{' '}
                        <span className="text-ink font-medium">{templateCategory(tpl)}</span>
                      </li>
                    </ul>
                  )}
                  <p className="text-[11px] text-ink-faint mt-2">
                    Güncelleme: {formatDate(tpl.updated_at || tpl.created_at)}
                  </p>
                  <span
                    className={`inline-block mt-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                      status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-700'
                        : status === 'Taslak'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-canvas-soft text-ink-soft'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-canvas-line/60">
                  {isEmail ? (
                    <button
                      onClick={() => navigate(`/templates/${tpl.id}/edit`)}
                      className="p-2 rounded-lg hover:bg-canvas-soft"
                      title="Düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : (
                    canManage && (
                      <button
                        onClick={() => openLegacyEdit(tpl)}
                        className="p-2 rounded-lg hover:bg-canvas-soft"
                        title="Düzenle"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPreviewTpl(tpl)}
                    className="p-2 rounded-lg hover:bg-canvas-soft"
                    title="Önizle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => duplicateMutation.mutate(tpl.id)}
                        className="p-2 rounded-lg hover:bg-canvas-soft"
                        title="Kopyala"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(tpl.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}

      {previewTpl && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="font-medium">{previewTpl.name}</p>
                <p className="text-xs text-ink-soft">{previewTpl.subject}</p>
              </div>
              <button type="button" onClick={() => setPreviewTpl(null)} className="text-sm text-ink-soft">
                Kapat
              </button>
            </div>
            <iframe
              title="Şablon önizleme"
              srcDoc={previewTpl.content || ''}
              className="flex-1 w-full min-h-[400px] border-0"
              sandbox=""
            />
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
            className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-auto"
          >
            <h2 className="font-display text-lg text-ink">
              {editingId ? 'Şablonu düzenle' : 'Yeni şablon'} ({form.channel_type})
            </h2>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.brand_id}
              required={form.channel_type === 'WHATSAPP'}
              onChange={(e) =>
                setForm({
                  ...form,
                  brand_id: e.target.value,
                  sender_identity_id: '',
                  channel_connection_id: '',
                })
              }
            >
              <option value="">
                {form.channel_type === 'WHATSAPP' ? 'Marka seçin (zorunlu)' : 'Marka (opsiyonel)'}
              </option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.channel_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  channel_type: e.target.value,
                  sender_identity_id: '',
                  channel_connection_id: '',
                  subject: '',
                  category: '',
                })
              }
            >
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>

            {form.channel_type === 'SMS' && (
              <select
                className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={form.sender_identity_id}
                onChange={(e) => setForm({ ...form, sender_identity_id: e.target.value })}
              >
                <option value="">Gönderici (opsiyonel)</option>
                {filteredSenders.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} · {s.sender_value}
                  </option>
                ))}
              </select>
            )}

            {form.channel_type === 'WHATSAPP' && (
              <label className="block text-xs text-ink-soft">
                Bağlı WhatsApp kanalı
                <select
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  value={form.channel_connection_id}
                  required={!editingId}
                  disabled={!form.brand_id || waConnections.length === 0}
                  onChange={(e) => setForm({ ...form, channel_connection_id: e.target.value })}
                >
                  {waConnections.length === 0 ? (
                    <option value="">Aktif WhatsApp kanalı yok</option>
                  ) : waConnections.length === 1 ? (
                    <option value={String(waConnections[0].id)}>
                      {whatsappChannelLabel(waConnections[0])}
                    </option>
                  ) : (
                    <>
                      <option value="">WhatsApp hesabı seçin</option>
                      {waConnections.map((c: any) => (
                        <option key={c.id} value={String(c.id)}>
                          {whatsappChannelLabel(c)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>
            )}

            {waChannelMissing && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Önce bu marka için bir WhatsApp kanalı bağlayın.
              </p>
            )}

            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Şablon adı"
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((prev) => ({
                  ...prev,
                  name,
                  provider_template_name:
                    prev.channel_type === 'WHATSAPP' && !editingId
                      ? normalizeWhatsAppTemplateName(name)
                      : prev.provider_template_name,
                }))
              }}
            />
            {form.channel_type === 'WHATSAPP' && (
              <>
                <label className="block text-xs text-ink-soft">
                  Provider template adı
                  <input
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm font-mono"
                    placeholder="ornek: destek_talebi_bildirimi"
                    required
                    value={form.provider_template_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        provider_template_name: normalizeWhatsAppTemplateName(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      setForm({
                        ...form,
                        provider_template_name: normalizeWhatsAppTemplateName(e.target.value),
                      })
                    }
                  />
                </label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Dil kodu"
                  required
                  value={form.provider_template_language}
                  onChange={(e) => setForm({ ...form, provider_template_language: e.target.value })}
                />
                <label className="block text-xs text-ink-soft">
                  Kategori
                  <select
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                    required={!editingId}
                    disabled={Boolean(editingId)}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">Kategori seçin</option>
                    <option value="UTILITY">Yardımcı</option>
                    <option value="MARKETING">Pazarlama</option>
                    <option value="AUTHENTICATION">Kimlik doğrulama</option>
                  </select>
                </label>
                <p className="text-xs text-sky-950 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 leading-snug">
                  Bu şablon bağlı WhatsApp hesabınız için Meta onayına gönderilir. Onaylandıktan
                  sonra tekrar tekrar kullanabilirsiniz.
                </p>
              </>
            )}
            <textarea
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[120px]"
              placeholder="Mesaj içeriği"
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Değişkenler (virgülle)"
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending || waChannelRequiredMissing}
                className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
