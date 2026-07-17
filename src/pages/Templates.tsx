import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Plus, Search, Trash2, Pencil } from 'lucide-react'
import { brandApi, senderIdentityApi, templateApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

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

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => templateApi.duplicate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Kopyalanamadı'),
  })

  const openLegacyEdit = (tpl: any) => {
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
        ? tpl.variables.map((v: any) => (typeof v === 'string' ? v : v?.name)).filter(Boolean).join(', ')
        : '',
      is_active: tpl.is_active !== false,
      provider_template_name: tpl.provider_template_name || '',
      provider_template_language: tpl.provider_template_language || 'tr',
      provider_approval_status: tpl.provider_approval_status || 'UNKNOWN',
    })
    setShowForm(true)
  }

  const formatDate = (v?: string) => {
    if (!v) return '—'
    try {
      return new Date(v).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
            Markaya özel e-posta şablonlarını blok editörü ile oluşturun. SMS ve WhatsApp şablonları klasik form ile yönetilir.
          </p>
        </div>
        {canManage && (
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
        <select className="px-3 py-2 rounded-xl bg-white border border-canvas-line text-sm" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="">Tüm markalar</option>
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-canvas-line/50 rounded-2xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-ink-soft">Henüz şablon yok.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl: any) => {
            const isEmail = tpl.channel_type === 'EMAIL'
            const status = tpl.is_draft !== false ? 'Taslak' : tpl.is_active === false ? 'Pasif' : 'Aktif'
            return (
              <div key={tpl.id} className="mc-panel mc-panel-asymmetric p-4 flex flex-col">
                <div className="h-24 rounded-lg border border-canvas-line bg-canvas-soft/50 overflow-hidden mb-3">
                  {isEmail && tpl.content ? (
                    <iframe title={`preview-${tpl.id}`} srcDoc={tpl.content} className="w-full h-full border-0 pointer-events-none scale-[0.55] origin-top-left" style={{ width: '182%', height: '182%' }} sandbox="" />
                  ) : (
                    <p className="p-3 text-xs text-ink-faint line-clamp-4">{tpl.content || '—'}</p>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base font-semibold text-ink truncate">{tpl.name}</p>
                  <p className="text-xs text-ink-soft mt-1">{tpl.brand_name || 'Markasız'} · {tpl.channel_type || 'GENEL'}</p>
                  {tpl.subject && <p className="text-sm text-ink-soft mt-1 truncate">Konu: {tpl.subject}</p>}
                  <p className="text-[11px] text-ink-faint mt-2">Güncelleme: {formatDate(tpl.updated_at || tpl.created_at)}</p>
                  <span className={`inline-block mt-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' : status === 'Taslak' ? 'bg-amber-50 text-amber-800' : 'bg-canvas-soft text-ink-soft'}`}>
                    {status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-canvas-line/60">
                  {isEmail ? (
                    <button onClick={() => navigate(`/templates/${tpl.id}/edit`)} className="p-2 rounded-lg hover:bg-canvas-soft" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                  ) : (
                    canManage && <button onClick={() => openLegacyEdit(tpl)} className="p-2 rounded-lg hover:bg-canvas-soft" title="Düzenle"><Pencil className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => setPreviewTpl(tpl)} className="p-2 rounded-lg hover:bg-canvas-soft" title="Önizle"><Eye className="w-4 h-4" /></button>
                  {canManage && (
                    <>
                      <button onClick={() => duplicateMutation.mutate(tpl.id)} className="p-2 rounded-lg hover:bg-canvas-soft" title="Kopyala"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => deleteMutation.mutate(tpl.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Sil"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {previewTpl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewTpl(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="font-medium">{previewTpl.name}</p>
                <p className="text-xs text-ink-soft">{previewTpl.subject}</p>
              </div>
              <button type="button" onClick={() => setPreviewTpl(null)} className="text-sm text-ink-soft">Kapat</button>
            </div>
            <iframe title="Şablon önizleme" srcDoc={previewTpl.content || ''} className="flex-1 w-full min-h-[400px] border-0" sandbox="" />
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
            className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-auto"
          >
            <h2 className="font-display text-lg text-ink">{editingId ? 'Şablonu düzenle' : 'Yeni şablon'} ({form.channel_type})</h2>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value, sender_identity_id: '' })}>
              <option value="">Marka (opsiyonel)</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.channel_type} onChange={(e) => setForm({ ...form, channel_type: e.target.value, sender_identity_id: '', subject: '' })}>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.sender_identity_id} onChange={(e) => setForm({ ...form, sender_identity_id: e.target.value })}>
              <option value="">Gönderici (opsiyonel)</option>
              {filteredSenders.map((s: any) => (
                <option key={s.id} value={s.id}>{s.display_name} · {s.sender_value}</option>
              ))}
            </select>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Şablon adı" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {form.channel_type === 'WHATSAPP' && (
              <>
                <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Provider template adı" value={form.provider_template_name} onChange={(e) => setForm({ ...form, provider_template_name: e.target.value })} />
                <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Dil kodu" value={form.provider_template_language} onChange={(e) => setForm({ ...form, provider_template_language: e.target.value })} />
                <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={form.provider_approval_status} onChange={(e) => setForm({ ...form, provider_approval_status: e.target.value })}>
                  <option value="UNKNOWN">UNKNOWN</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </>
            )}
            <textarea className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[120px]" placeholder="Mesaj içeriği" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Değişkenler (virgülle)" value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Aktif</label>
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
