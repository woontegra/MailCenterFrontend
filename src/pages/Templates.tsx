import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { brandApi, senderIdentityApi, templateApi } from '../services/api'

const emptyForm = () => ({
  brand_id: '',
  channel_type: 'EMAIL',
  sender_identity_id: '',
  name: '',
  subject: '',
  content: '',
  plain_text_content: '',
  variables: '',
  is_active: true,
  provider_template_name: '',
  provider_template_language: 'tr',
  provider_approval_status: 'UNKNOWN',
})

export default function Templates() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities'],
    queryFn: async () => (await senderIdentityApi.list()).data,
  })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await templateApi.list()
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

  const buildPayload = () => {
    const variables = form.variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)

    return {
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      channel_type: form.channel_type,
      sender_identity_id: form.sender_identity_id ? Number(form.sender_identity_id) : null,
      name: form.name,
      subject: form.channel_type === 'EMAIL' ? form.subject : null,
      content: form.content,
      plain_text_content: form.plain_text_content || null,
      variables,
      is_shared: true,
      is_active: form.is_active,
      ...(form.channel_type === 'WHATSAPP'
        ? {
            provider_template_name: form.provider_template_name || null,
            provider_template_language: form.provider_template_language || null,
            provider_approval_status: form.provider_approval_status || 'UNKNOWN',
          }
        : {}),
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
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
    onError: (err: any) => setError(err.response?.data?.error || 'Şablon kaydedilemedi'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => templateApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Şablon silinemedi'),
  })

  const openEdit = (tpl: any) => {
    setEditingId(tpl.id)
    setForm({
      brand_id: tpl.brand_id ? String(tpl.brand_id) : '',
      channel_type: tpl.channel_type || 'EMAIL',
      sender_identity_id: tpl.sender_identity_id ? String(tpl.sender_identity_id) : '',
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
      provider_approval_status: tpl.provider_approval_status || 'UNKNOWN',
    })
    setShowForm(true)
  }

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">İçerik</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Şablonlar</h1>
          <p className="text-sm text-ink-soft mt-1">
            Marka, kanal ve göndericiye bağlı e-posta şablonlarını yönetin. Değişkenler {'{{ad_soyad}}'} biçimindedir.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setForm(emptyForm())
            setShowForm(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm"
        >
          <Plus className="w-4 h-4" />
          Şablon ekle
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-canvas-line/50 rounded-2xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-ink-soft">Henüz şablon yok.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {templates.map((tpl: any) => (
            <div key={tpl.id} className="mc-panel mc-panel-asymmetric p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg text-ink truncate">{tpl.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint mt-1">
                    {(tpl.brand_name || 'Markasız')} · {(tpl.channel_type || 'GENEL')} ·{' '}
                    {tpl.is_active === false ? 'Pasif' : 'Aktif'}
                    {tpl.channel_type === 'WHATSAPP' && tpl.provider_approval_status
                      ? ` · ${tpl.provider_approval_status}`
                      : ''}
                  </p>
                  {tpl.channel_type === 'WHATSAPP' && tpl.provider_template_name && (
                    <p className="text-xs text-ink-soft mt-1 truncate">
                      Provider: {tpl.provider_template_name}
                      {tpl.provider_template_language
                        ? ` (${tpl.provider_template_language})`
                        : ''}
                    </p>
                  )}
                  {tpl.sender_display_name && (
                    <p className="text-xs text-ink-soft mt-1 truncate">
                      Gönderen: {tpl.sender_display_name}
                    </p>
                  )}
                  {tpl.subject && <p className="text-sm text-ink-soft mt-2 truncate">Konu: {tpl.subject}</p>}
                  <p className="text-sm text-ink-soft mt-2 line-clamp-3">{tpl.content}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(tpl)} className="p-2 text-ink-faint hover:text-ink rounded-lg" aria-label="Düzenle">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(tpl.id)} className="p-2 text-ink-faint hover:text-red-500 rounded-lg" aria-label="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
              saveMutation.mutate()
            }}
            className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-auto"
          >
            <h2 className="font-display text-lg text-ink">{editingId ? 'Şablonu düzenle' : 'Yeni şablon'}</h2>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value, sender_identity_id: '' })}>
              <option value="">Marka (opsiyonel)</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.channel_type}
              onChange={(e) => setForm({ ...form, channel_type: e.target.value, sender_identity_id: '', subject: '' })}>
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WHATSAPP</option>
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.sender_identity_id}
              onChange={(e) => setForm({ ...form, sender_identity_id: e.target.value })}>
              <option value="">Gönderici (opsiyonel)</option>
              {filteredSenders.map((s: any) => (
                <option key={s.id} value={s.id}>{s.display_name} · {s.sender_value}</option>
              ))}
            </select>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Şablon adı" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {form.channel_type === 'EMAIL' && (
              <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Konu"
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            )}
            {form.channel_type === 'WHATSAPP' && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Provider template adı"
                  value={form.provider_template_name}
                  onChange={(e) => setForm({ ...form, provider_template_name: e.target.value })}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  placeholder="Dil kodu (örn. tr)"
                  value={form.provider_template_language}
                  onChange={(e) =>
                    setForm({ ...form, provider_template_language: e.target.value })
                  }
                />
                <select
                  className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                  value={form.provider_approval_status}
                  onChange={(e) =>
                    setForm({ ...form, provider_approval_status: e.target.value })
                  }
                >
                  <option value="UNKNOWN">Onay: UNKNOWN</option>
                  <option value="PENDING">Onay: PENDING</option>
                  <option value="APPROVED">Onay: APPROVED</option>
                  <option value="REJECTED">Onay: REJECTED</option>
                </select>
                <p className="text-xs text-ink-faint">
                  Meta onayını sahte APPROVED yapmayın; yalnızca gerçekten onaylı şablonları
                  APPROVED olarak bağlayın. Gönderim yalnızca APPROVED ile yapılır.
                </p>
              </>
            )}
            <textarea className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[120px]" placeholder="HTML / gövde içerik" required
              value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <textarea className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[80px]" placeholder="Düz metin içerik"
              value={form.plain_text_content} onChange={(e) => setForm({ ...form, plain_text_content: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Değişkenler (virgülle: ad_soyad, siparis_no)"
              value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Aktif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm">İptal</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
