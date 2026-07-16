import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { brandApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

export default function Brands() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    domain: '',
    accent_color: '#0f9aa8',
  })

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => brandApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setShowForm(false)
      setForm({ name: '', slug: '', domain: '', accent_color: '#0f9aa8' })
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Marka oluşturulamadı'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => brandApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Marka silinemedi'),
  })

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Organizasyon</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Markalar</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} tenant’ınız altındaki marka ve alan adlarını yönetin.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm hover:bg-dock-raised transition-colors"
        >
          <Plus className="w-4 h-4" />
          Marka ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {isLoading ? (
        <div className="animate-pulse grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-canvas-line/50 rounded-2xl" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center">
          <Building2 className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">Henüz marka yok</p>
          <p className="text-sm text-ink-soft mt-1">Örn. Woontegra ve Bilirkişi Hesap aynı tenant altında ayrı markalar olabilir.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand: any) => (
            <div key={brand.id} className="mc-panel mc-panel-asymmetric p-5 hover:-translate-y-0.5 transition-transform">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: brand.accent_color || '#0f9aa8' }}
                    />
                    <p className="font-display text-lg text-ink truncate">{brand.name}</p>
                  </div>
                  <p className="text-xs text-ink-faint">/{brand.slug}</p>
                  {brand.domain && <p className="text-sm text-ink-soft mt-2 truncate">{brand.domain}</p>}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(brand.id)}
                  className="p-2 text-ink-faint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Markayı sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                {brand.is_active ? 'Aktif' : 'Pasif'}
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(form)
            }}
            className="bg-white rounded-2xl rounded-tr-md w-full max-w-md p-6 space-y-4"
          >
            <h2 className="font-display text-lg text-ink">Yeni marka</h2>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Marka adı" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Slug (opsiyonel)"
              value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Alan adı (opsiyonel)"
              value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
            <input type="color" className="w-full h-10 rounded-xl" value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm">İptal</button>
              <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
