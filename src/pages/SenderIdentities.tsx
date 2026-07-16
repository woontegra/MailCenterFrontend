import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { brandApi, channelConnectionApi, senderIdentityApi } from '../services/api'

export default function SenderIdentities() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    brand_id: '',
    channel_connection_id: '',
    display_name: '',
    sender_value: '',
    reply_to: '',
    is_default: false,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: connections = [] } = useQuery({
    queryKey: ['channel-connections'],
    queryFn: async () => (await channelConnectionApi.list()).data,
  })

  const { data: senders = [], isLoading } = useQuery({
    queryKey: ['sender-identities'],
    queryFn: async () => (await senderIdentityApi.list()).data,
  })

  const filteredConnections = connections.filter(
    (c: any) => !form.brand_id || String(c.brand_id) === String(form.brand_id)
  )

  const createMutation = useMutation({
    mutationFn: () =>
      senderIdentityApi.create({
        brand_id: Number(form.brand_id),
        channel_connection_id: Number(form.channel_connection_id),
        display_name: form.display_name,
        sender_value: form.sender_value,
        reply_to: form.reply_to || null,
        is_default: form.is_default,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-identities'] })
      setShowForm(false)
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Gönderici oluşturulamadı'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => senderIdentityApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sender-identities'] }),
    onError: (err: any) => setError(err.response?.data?.error || 'Gönderici silinemedi'),
  })

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Kimlikler</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Gönderen Kimlikleri</h1>
          <p className="text-sm text-ink-soft mt-1">
            Marka ve kanal bağlantısına bağlı gerçek gönderici değerlerini yönetin.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={brands.length === 0 || connections.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Gönderici ekle
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-canvas-line/50 rounded-2xl" />)}
        </div>
      ) : senders.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-ink-soft">
          Henüz gönderici kimliği yok. Önce marka ve kanal bağlantısı oluşturun.
        </div>
      ) : (
        <div className="space-y-3">
          {senders.map((sender: any) => (
            <div key={sender.id} className="mc-panel mc-panel-asymmetric p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{sender.display_name}</p>
                <p className="text-sm text-ink-soft truncate">{sender.sender_value}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint mt-1">
                  {sender.brand_name} · {sender.channel_type}
                  {sender.is_default ? ' · Varsayılan' : ''}
                </p>
              </div>
              <button onClick={() => deleteMutation.mutate(sender.id)} className="p-2 text-ink-faint hover:text-red-500 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
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
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-3"
          >
            <h2 className="font-display text-lg text-ink">Gönderici kimliği</h2>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" required value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value, channel_connection_id: '' })}>
              <option value="">Marka</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" required value={form.channel_connection_id}
              onChange={(e) => setForm({ ...form, channel_connection_id: e.target.value })}>
              <option value="">Kanal bağlantısı</option>
              {filteredConnections.map((c: any) => (
                <option key={c.id} value={c.id}>{c.channel_type} · {c.display_name}</option>
              ))}
            </select>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Görünen ad" required
              value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Gönderici değeri (e-posta / başlık / telefon)" required
              value={form.sender_value} onChange={(e) => setForm({ ...form, sender_value: e.target.value })} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Reply-to (opsiyonel)"
              value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Varsayılan gönderici
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-canvas-soft text-sm">İptal</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-signal text-white text-sm">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
