import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Send } from 'lucide-react'
import { brandApi, channelConnectionApi, templateApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { approvalStatusHelp, approvalStatusLabel } from '../../utils/displayLabels'

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Yardımcı',
  MARKETING: 'Pazarlama',
}

function whatsappChannelLabel(c: any): string {
  const title =
    c?.settings?.verified_name ||
    c?.display_name ||
    c?.settings?.waba_name ||
    'WhatsApp'
  const phone = c?.settings?.business_phone_number || c?.phone_number || '—'
  return `${title} — ${phone}`
}

function buildPreview(bodyText: string, examples: string[]): string {
  let out = String(bodyText || '')
  examples.forEach((ex, i) => {
    out = out.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), String(ex ?? ''))
  })
  return out
}

type LibraryItem = {
  key: string
  displayName: string
  description: string
  providerName: string
  category: string
  language: string
  bodyText: string
  variables: Array<{ index: number; key: string; label: string; example: string }>
  preview: string
  installation: null | {
    templateId: number
    status: string
    rejectionReason: string | null
    canSend: boolean
  }
}

export default function WhatsAppReadyLibrary() {
  const queryClient = useQueryClient()
  const canManage = useAuthStore((s) => s.hasPermission('TEMPLATE_MANAGE'))
  const [brandId, setBrandId] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draftBody, setDraftBody] = useState('')
  const [draftExamples, setDraftExamples] = useState<string[]>([])

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const { data: waConnections = [] } = useQuery({
    queryKey: ['channel-connections', 'WHATSAPP', brandId, 'library'],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await channelConnectionApi.list({
        channel_type: 'WHATSAPP',
        brand_id: Number(brandId),
      })
      const rows = Array.isArray(res.data) ? res.data : []
      return rows.filter((c: any) => String(c.status || '').toUpperCase() === 'ACTIVE')
    },
  })

  useEffect(() => {
    if (!brandId) {
      setConnectionId('')
      return
    }
    if (waConnections.length === 1) {
      setConnectionId(String(waConnections[0].id))
      return
    }
    if (
      connectionId &&
      !waConnections.some((c: any) => String(c.id) === String(connectionId))
    ) {
      setConnectionId('')
    }
  }, [brandId, waConnections, connectionId])

  const libraryParams = useMemo(() => {
    const p: { brand_id?: number; channel_connection_id?: number } = {}
    if (brandId) p.brand_id = Number(brandId)
    if (connectionId) p.channel_connection_id = Number(connectionId)
    return p
  }, [brandId, connectionId])

  const { data: library, isLoading } = useQuery({
    queryKey: ['templates-library', libraryParams],
    queryFn: async () => {
      const res = await templateApi.listLibrary(libraryParams)
      return res.data?.data || res.data
    },
  })

  const items: LibraryItem[] = Array.isArray(library?.items) ? library.items : []
  const selected = items.find((i) => i.key === selectedKey) || null

  useEffect(() => {
    if (!selected) return
    setDraftBody(selected.bodyText)
    setDraftExamples(selected.variables.map((v) => v.example))
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodyChanged = Boolean(selected && draftBody.trim() !== selected.bodyText)

  const submitMutation = useMutation({
    mutationFn: (key: string) =>
      templateApi.submitLibraryTemplate(key, {
        brand_id: Number(brandId),
        channelConnectionId: Number(connectionId),
        bodyText: draftBody,
        examples: draftExamples,
      }),
    onSuccess: (res: any) => {
      setError('')
      setInfo(res.data?.message || 'Şablon gönderildi')
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (err: any) => {
      setInfo('')
      setError(err.response?.data?.error || err.message || 'Şablon gönderilemedi')
    },
  })

  const refreshMutation = useMutation({
    mutationFn: (key: string) =>
      templateApi.refreshLibraryTemplate(key, {
        brand_id: Number(brandId),
        channelConnectionId: Number(connectionId),
      }),
    onSuccess: () => {
      setError('')
      setInfo('Durum yenilendi')
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (err: any) => {
      setInfo('')
      setError(err.response?.data?.error || err.message || 'Durum yenilenemedi')
    },
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      templateApi.syncLibraryTemplates({ channelConnectionId: Number(connectionId) }),
    onSuccess: (res: any) => {
      setError('')
      setInfo(
        `Senkronizasyon tamam: ${res.data?.synced ?? 0} şablon · ${res.data?.approved ?? 0} onaylı`
      )
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (err: any) => {
      setInfo('')
      setError(err.response?.data?.error || err.message || 'Senkronizasyon başarısız')
    },
  })

  const noActiveChannel = Boolean(brandId) && waConnections.length === 0
  const canSubmit =
    canManage &&
    Boolean(brandId) &&
    Boolean(connectionId) &&
    !noActiveChannel &&
    selected &&
    !selected.installation

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sky-950">
        <p className="text-sm font-semibold">WhatsApp şablonları hesabınıza özel onaylanır</p>
        <p className="text-sm mt-1 leading-snug text-sky-900/90">
          Hazır kütüphanedeki bir şablonu kullanabilmek için önce kendi bağlı WhatsApp Business
          hesabınıza eklemeniz gerekir. Şablon Meta tarafından bir kez onaylandıktan sonra
          müşteri adı, tutar ve tarih gibi değişkenlerle tekrar tekrar kullanılabilir. Müşterinin
          size daha önce mesaj göndermiş olması gerekmez.
        </p>
      </div>

      <div className="mc-panel mc-panel-asymmetric p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-soft">Marka</span>
            <select
              className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              <option value="">Marka seçin</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Aktif WhatsApp kanalı</span>
            <select
              className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line bg-white text-sm"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              disabled={!brandId || waConnections.length === 0}
            >
              <option value="">
                {!brandId
                  ? 'Önce marka seçin'
                  : waConnections.length === 0
                    ? 'Aktif kanal yok'
                    : 'Kanal seçin'}
              </option>
              {waConnections.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {whatsappChannelLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {noActiveChannel && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Bu marka için aktif WhatsApp bağlantısı yok. Önce kanal bağlantısından WhatsApp
            hesabı ekleyin.
          </p>
        )}
        {canManage && connectionId && (
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-canvas-line text-sm disabled:opacity-50"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Tüm şablonları senkronize et
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          {info}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-canvas-line/50 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {items.map((item) => {
              const status = item.installation?.status
              const selectedCard = item.key === selectedKey
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(item.key)}
                    className={`w-full text-left rounded-xl border px-3 py-3 min-h-[7.5rem] transition-colors ${
                      selectedCard
                        ? 'border-dock ring-2 ring-dock/20 bg-dock/5'
                        : 'border-canvas-line bg-white hover:bg-canvas-soft/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{item.displayName}</p>
                      <span className="text-[11px] text-ink-faint shrink-0">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-1 line-clamp-2">{item.description}</p>
                    {status ? (
                      <p
                        className={`text-[11px] mt-2 font-medium ${
                          status === 'APPROVED'
                            ? 'text-emerald-700'
                            : status === 'REJECTED'
                              ? 'text-red-600'
                              : 'text-amber-700'
                        }`}
                      >
                        {approvalStatusLabel(status)}
                        {item.installation?.canSend ? ' · Gönderilebilir' : ''}
                      </p>
                    ) : (
                      <p className="text-[11px] mt-2 text-ink-faint">Henüz eklenmedi</p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <section className="mc-panel mc-panel-asymmetric p-4 space-y-3 h-fit lg:sticky lg:top-20">
            {!selected ? (
              <p className="text-sm text-ink-soft">Önizlemek için bir hazır şablon seçin.</p>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-ink">{selected.displayName}</h3>
                  <p className="text-xs text-ink-soft mt-0.5">{selected.description}</p>
                </div>

                <div>
                  <p className="text-xs text-ink-faint mb-1">Kullanım önizlemesi</p>
                  <p className="text-sm text-ink bg-canvas-soft/70 rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                    {buildPreview(draftBody, draftExamples)}
                  </p>
                </div>

                <label className="block text-sm">
                  <span className="text-ink-soft">Şablon metni</span>
                  <textarea
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line text-sm min-h-[6rem]"
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    disabled={Boolean(selected.installation) || !canManage}
                  />
                </label>
                {bodyChanged && !selected.installation && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Ana metni değiştirdiniz. Bu metin Meta’ya yeni bir şablon olarak gider ve onay
                    süreci yeniden gerekir.
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-xs text-ink-faint">Değişken örnekleri</p>
                  {selected.variables.map((v, idx) => (
                    <label key={v.key} className="block text-sm">
                      <span className="text-ink-soft">
                        {`{{${v.index}}}`} · {v.label}
                      </span>
                      <input
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-canvas-line text-sm"
                        value={draftExamples[idx] ?? ''}
                        onChange={(e) => {
                          const next = [...draftExamples]
                          next[idx] = e.target.value
                          setDraftExamples(next)
                        }}
                        disabled={Boolean(selected.installation) || !canManage}
                      />
                    </label>
                  ))}
                </div>

                {selected.installation && (
                  <div className="rounded-xl border border-canvas-line px-3 py-2.5 space-y-1">
                    <p className="text-sm text-ink">
                      Durum:{' '}
                      <span className="font-medium">
                          {approvalStatusHelp(selected.installation.status)}
                        </span>
                    </p>
                    {selected.installation.status === 'REJECTED' &&
                      selected.installation.rejectionReason && (
                        <p className="text-sm text-red-600">
                          {selected.installation.rejectionReason}
                        </p>
                      )}
                    {selected.installation.canSend && (
                      <p className="text-xs text-emerald-700">
                        Onaylandı — WhatsApp Yaz ve otomasyonda seçilebilir.
                      </p>
                    )}
                    {(selected.installation.status === 'PENDING' ||
                      selected.installation.status === 'REJECTED') && (
                      <p className="text-xs text-ink-faint">
                        Bu durumda gönderim listesinde görünmez.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {canSubmit && (
                    <button
                      type="button"
                      disabled={submitMutation.isPending}
                      onClick={() => submitMutation.mutate(selected.key)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      WABA’ya ekle ve onaya gönder
                    </button>
                  )}
                  {canManage && selected.installation && connectionId && (
                    <button
                      type="button"
                      disabled={refreshMutation.isPending}
                      onClick={() => refreshMutation.mutate(selected.key)}
                      className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-canvas-line text-sm disabled:opacity-50"
                    >
                      {refreshMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Durumu yenile
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
