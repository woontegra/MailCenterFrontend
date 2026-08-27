import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ListPlus, Search } from 'lucide-react'
import { campaignApi } from '../services/api'

const FILTERS = [
  ['', 'Tümü'],
  ['opened', 'Açanlar'],
  ['not_opened', 'Açmayanlar'],
  ['clicked', 'Tıklayanlar'],
  ['not_clicked', 'Tıklamayanlar'],
  ['opened_not_clicked', 'Açtı, tıklamadı'],
  ['clicked_no_conversion', 'Tıkladı, dönüşüm yok'],
  ['downloaded', 'Dosya indirenler'],
  ['converted', 'Dönüşüm sağlayanlar'],
  ['bounced', 'Teslim hatası'],
  ['unsubscribed', 'Abonelikten çıkanlar'],
  ['no_engagement', 'Hiç etkileşim yok'],
  ['bot_events', 'Şüpheli otomasyon'],
] as const

function formatTime(v?: string | null) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

export default function CampaignReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const campaignId = Number(id)
  const [filter, setFilter] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null)
  const [listName, setListName] = useState('')

  const { data: summaryPayload, isLoading } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    enabled: Number.isFinite(campaignId),
    queryFn: async () => {
      const res = await campaignApi.analyticsSummary(campaignId)
      return res.data?.data
    },
  })

  const { data: recipients = [] } = useQuery({
    queryKey: ['campaign-analytics-recipients', campaignId, filter],
    enabled: Number.isFinite(campaignId),
    queryFn: async () => {
      const res = await campaignApi.analyticsRecipients(campaignId, { filter: filter || undefined, limit: 100 })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: timeline = [] } = useQuery({
    queryKey: ['campaign-analytics-timeline', campaignId, selectedRecipient],
    enabled: Boolean(selectedRecipient),
    queryFn: async () => {
      const res = await campaignApi.analyticsTimeline(campaignId, selectedRecipient!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const saveListMutation = useMutation({
    mutationFn: () =>
      campaignApi.saveAnalyticsList(campaignId, {
        filter,
        list_name: listName.trim(),
      }),
    onSuccess: () => {
      setListName('')
      alert('Kişi listesi oluşturuldu')
    },
  })

  const funnel = summaryPayload?.funnel
  const rates = summaryPayload?.rates
  const disclaimers = summaryPayload?.disclaimers

  const funnelSteps = useMemo(
    () =>
      funnel
        ? [
            { label: 'Hedeflenen', value: funnel.targeted },
            { label: 'Kuyruğa alınan', value: funnel.queued },
            { label: 'Sunucu kabul', value: funnel.smtp_accepted },
            { label: 'Teslim hatası', value: funnel.delivery_failed },
            { label: 'Açılma algılanan', value: funnel.opened },
            { label: 'Benzersiz tıklayan', value: funnel.clicked },
            { label: 'Dosya indiren', value: funnel.downloaded },
            { label: 'Site ziyareti doğrulanan', value: funnel.site_verified },
            { label: 'Dönüşüm', value: funnel.converted },
            { label: 'Abonelikten çıkan', value: funnel.unsubscribed },
            { label: 'Şikâyet', value: funnel.complained },
          ]
        : [],
    [funnel]
  )

  const downloadBlob = async (fn: () => Promise<any>, filename: string) => {
    const res = await fn()
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-soft">Rapor yükleniyor…</div>
  }

  return (
    <div className="min-h-screen bg-canvas pb-10">
      <header className="border-b border-canvas-line bg-white px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/outbound')} className="p-2 rounded-lg hover:bg-canvas-soft">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-lg font-semibold">{summaryPayload?.campaign?.name || 'Kampanya raporu'}</h1>
          <p className="text-xs text-ink-soft">{summaryPayload?.campaign?.subject || '—'}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-5">
        {disclaimers && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
            <p>{disclaimers.open_tracking}</p>
            <p>{disclaimers.delivery}</p>
            <p>{disclaimers.attachment}</p>
          </div>
        )}

        <section className="mc-panel p-4">
          <h2 className="text-sm font-medium mb-3">Performans hunisi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {funnelSteps.map((s) => (
              <div key={s.label} className="rounded-xl bg-canvas-soft p-3 text-center">
                <p className="text-[10px] text-ink-faint uppercase tracking-wide">{s.label}</p>
                <p className="text-lg font-semibold mt-1">{s.value ?? '—'}</p>
              </div>
            ))}
          </div>
          {rates && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs text-ink-soft">
              <span>Kabul oranı: %{rates.acceptance_rate}</span>
              <span>Yaklaşık açılma: %{rates.approximate_open_rate}</span>
              <span>Benzersiz tıklama: %{rates.unique_click_rate}</span>
              <span>Tıklama/açılma: %{rates.click_to_open_rate}</span>
              <span>Dosya indirme: %{rates.download_rate}</span>
              <span>Dönüşüm: %{rates.conversion_rate}</span>
              <span>Abonelikten çıkma: %{rates.unsubscribe_rate}</span>
              <span>Teslim hatası: %{rates.bounce_rate}</span>
            </div>
          )}
        </section>

        <section className="mc-panel p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-ink-faint" />
              <select
                className="px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {FILTERS.map(([val, label]) => (
                  <option key={val || 'all'} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-xs"
                onClick={() => void downloadBlob(() => campaignApi.exportAnalyticsSummary(campaignId), `kampanya-ozet-${campaignId}.xlsx`)}
              >
                <Download className="w-3.5 h-3.5" /> Özet indir
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-xs"
                onClick={() =>
                  void downloadBlob(
                    () => campaignApi.exportAnalyticsRecipients(campaignId, filter || undefined),
                    `kampanya-alicilar-${campaignId}.xlsx`
                  )
                }
              >
                <Download className="w-3.5 h-3.5" /> Alıcılar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-xs"
                onClick={() => void downloadBlob(() => campaignApi.exportAnalyticsLinks(campaignId), `kampanya-baglantilar-${campaignId}.xlsx`)}
              >
                <Download className="w-3.5 h-3.5" /> Bağlantılar
              </button>
            </div>
          </div>

          {filter && (
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <input
                className="px-3 py-2 rounded-lg bg-canvas-soft text-sm"
                placeholder="Yeni liste adı"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
              <button
                type="button"
                disabled={!listName.trim() || saveListMutation.isPending}
                onClick={() => saveListMutation.mutate()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-dock text-white text-xs disabled:opacity-40"
              >
                <ListPlus className="w-3.5 h-3.5" /> Kişi listesi olarak kaydet
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint border-b border-canvas-line">
                  <th className="py-2 pr-2">Alıcı</th>
                  <th className="py-2 pr-2">Durum</th>
                  <th className="py-2 pr-2">Açılma</th>
                  <th className="py-2 pr-2">Tıklama</th>
                  <th className="py-2 pr-2">Gönderim</th>
                  <th className="py-2">Detay</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r: any) => (
                  <tr key={r.id} className="border-b border-canvas-line/60">
                    <td className="py-2 pr-2">
                      <p className="font-medium">{r.display_name || r.email}</p>
                      <p className="text-xs text-ink-faint">{r.email}</p>
                    </td>
                    <td className="py-2 pr-2 text-xs">{r.delivery_status || r.status}</td>
                    <td className="py-2 pr-2 text-xs">
                      {r.open_count || 0}
                      {r.human_open_count > 0 ? ` (${r.human_open_count} insan)` : ''}
                    </td>
                    <td className="py-2 pr-2 text-xs">{r.click_count || 0}</td>
                    <td className="py-2 pr-2 text-xs">{formatTime(r.sent_at || r.smtp_accepted_at)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-xs text-signal underline"
                        onClick={() => setSelectedRecipient(r.id)}
                      >
                        Zaman çizelgesi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRecipient && (
          <section className="mc-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Alıcı zaman çizelgesi</h3>
              <button type="button" className="text-xs text-ink-faint" onClick={() => setSelectedRecipient(null)}>
                Kapat
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {timeline.map((t: any, idx: number) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-xs text-ink-faint shrink-0 w-36">{formatTime(t.at)}</span>
                  <span>{t.label}</span>
                </li>
              ))}
              {timeline.length === 0 && <li className="text-ink-soft">Henüz kayıtlı olay yok</li>}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
