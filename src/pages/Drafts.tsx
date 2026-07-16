import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import { draftApi } from '../services/api'
import { APP_DISPLAY_NAME } from '../config/app'

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

export default function Drafts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const res = await draftApi.list()
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      return rows.filter((d: any) => d.status !== 'sent')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => draftApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  })

  return (
    <div className="mc-shell pt-1 pb-8">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">Yazım</p>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Taslaklar</h1>
        <p className="text-sm text-ink-soft mt-1">
          {APP_DISPLAY_NAME} içinde kaydedilmiş e-posta taslaklarını yönetin.
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-canvas-line/50 rounded-2xl" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="mc-panel mc-panel-asymmetric p-8 text-center">
          <FileText className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-ink font-medium">Taslak yok</p>
          <p className="text-sm text-ink-soft mt-1">Yeni Mesaj ekranında yazmaya başladığınızda taslaklar burada görünür.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft: any) => (
            <div
              key={draft.id}
              className="mc-panel mc-panel-asymmetric px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: draft.brand_accent_color || '#0f9aa8' }}
                  />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                    {draft.brand_name || 'Markasız'}
                  </span>
                  <span className="text-[11px] text-ink-faint">·</span>
                  <span className="text-[11px] text-ink-faint truncate">
                    {draft.sender_display_name
                      ? `${draft.sender_display_name} <${draft.sender_value || ''}>`
                      : 'Gönderen yok'}
                  </span>
                </div>
                <p className="text-sm text-ink truncate">
                  <span className="text-ink-faint">Kime:</span> {draft.to_address || '—'}
                </p>
                <p className="font-medium text-ink truncate">{draft.subject || '(Konu yok)'}</p>
                <p className="text-xs text-ink-faint mt-1">Son güncelleme: {formatDate(draft.updated_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/compose?draftId=${draft.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-canvas-soft text-xs text-ink"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Düzenle
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Taslak silinsin mi?')) deleteMutation.mutate(draft.id)
                  }}
                  className="p-2 rounded-xl text-ink-faint hover:text-red-500 hover:bg-red-50"
                  aria-label="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
