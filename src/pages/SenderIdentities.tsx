import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cable, Plus, Trash2 } from 'lucide-react'
import { brandApi, channelConnectionApi, senderIdentityApi } from '../services/api'

export default function SenderIdentities() {
  const navigate = useNavigate()
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

  const activeConnections = (Array.isArray(connections) ? connections : []).filter(
    (c: any) => c.status === 'ACTIVE'
  )

  const filteredConnections = activeConnections.filter(
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

  const byChannel = (type: string) =>
    senders.filter((s: any) => String(s.channel_type || '').toUpperCase() === type)

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Kimlikler</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">
            Gönderim Kimlikleri
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            E-posta adresleri, SMS gönderici başlıkları ve WhatsApp işletme numaraları. Kanal API
            bağlantısı için Kanal Bağlantıları sayfasını kullanın.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={brands.length === 0 || activeConnections.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Gönderici ekle
        </button>
      </div>

      <div className="mb-5 p-4 rounded-xl border border-canvas-line bg-canvas-soft/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-sm text-ink-soft">
          <Cable className="w-4 h-4 mt-0.5 text-signal shrink-0" />
          <p>
            SMS veya WhatsApp API bağlantısı kurmak için{' '}
            <strong className="text-ink">Kanal Bağlantıları</strong> ekranına gidin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/channels')}
          className="px-3 py-2 rounded-xl border border-canvas-line text-sm hover:bg-white"
        >
          Kanal Bağlantıları
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="h-32 animate-pulse bg-canvas-line/40 rounded-xl" />
      ) : senders.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center text-sm text-ink-soft">
          Henüz gönderim kimliği yok.
          {activeConnections.length === 0 && (
            <p className="mt-2">
              Önce{' '}
              <Link to="/channels" className="text-signal-deep underline">
                kanal bağlayın
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(
            [
              ['EMAIL', 'E-posta gönderen adresleri'],
              ['SMS', 'SMS gönderici başlıkları'],
              ['WHATSAPP', 'WhatsApp işletme numaraları'],
            ] as const
          ).map(([type, title]) => {
            const list = byChannel(type)
            return (
              <section key={type}>
                <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
                {list.length === 0 ? (
                  <p className="text-sm text-ink-faint px-1">Kayıt yok</p>
                ) : (
                  <ul className="mc-panel mc-panel-asymmetric divide-y divide-canvas-line/70 overflow-hidden">
                    {list.map((s: any) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{s.display_name}</p>
                          <p className="text-sm text-ink-soft truncate">{s.sender_value}</p>
                          <p className="text-xs text-ink-faint mt-0.5">
                            {s.brand_name || '—'}
                            {s.is_default ? ' · Varsayılan' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(s.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="font-display text-lg font-semibold">Gönderici ekle</h3>
            <select
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              value={form.brand_id}
              onChange={(e) =>
                setForm({ ...form, brand_id: e.target.value, channel_connection_id: '' })
              }
            >
              <option value="">Marka</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              value={form.channel_connection_id}
              onChange={(e) => setForm({ ...form, channel_connection_id: e.target.value })}
            >
              <option value="">Aktif kanal bağlantısı</option>
              {filteredConnections.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.channel_type} · {c.display_name}
                </option>
              ))}
            </select>
            <input
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              placeholder="Görünen ad"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              placeholder="Gönderen değer (e-posta / başlık / numara)"
              value={form.sender_value}
              onChange={(e) => setForm({ ...form, sender_value: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
              placeholder="Reply-to (opsiyonel)"
              value={form.reply_to}
              onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              Varsayılan
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-2 text-sm rounded-xl border"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={
                  !form.brand_id ||
                  !form.channel_connection_id ||
                  !form.display_name ||
                  !form.sender_value ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
                className="px-3 py-2 text-sm rounded-xl bg-dock text-white disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
