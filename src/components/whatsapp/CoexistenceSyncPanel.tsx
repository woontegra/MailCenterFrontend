import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Contact, History, Loader2, RefreshCw } from 'lucide-react'
import { channelConnectionApi } from '../../services/api'
import { channelSetupApiError } from '../../utils/channelSetupErrors'
import {
  CoexistenceStatusData,
  CoexistenceSyncRow,
  CoexistenceSyncType,
  disconnectEventLabel,
  disconnectReasonLabel,
  formatRemaining,
  isCoexistenceSyncActive,
  syncActionState,
  syncStatusLabel,
} from '../../utils/whatsappCoexistence'

type PendingSync = { syncType: CoexistenceSyncType; confirmRetry: boolean }

const SYNC_COPY: Record<CoexistenceSyncType, { title: string; confirm: string; button: string }> = {
  CONTACTS: {
    title: 'Kişiler',
    button: 'Kişileri eşitle',
    confirm:
      'WhatsApp Business uygulamasındaki kişiler MailCenter’a aktarılır. Meta bu isteğe her bağlantı için yalnızca bir kez izin verir.',
  },
  HISTORY: {
    title: 'Sohbet geçmişi',
    button: 'Geçmişi eşitle',
    confirm:
      'Son 180 günün bireysel sohbet geçmişi aktarılır (grup sohbetleri hariç). İşletmenin telefonda paylaşımı onaylaması gerekir. Meta bu isteğe yalnızca bir kez izin verir.',
  },
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('tr-TR')
}

function SyncCard(props: {
  type: CoexistenceSyncType
  row: CoexistenceSyncRow | null
  data: CoexistenceStatusData
  busy: boolean
  onRequest: (pending: PendingSync) => void
}) {
  const { type, row, data, busy, onRequest } = props
  const action = syncActionState(data, row)
  const copy = SYNC_COPY[type]
  const progress = type === 'HISTORY' && row?.progress != null ? Math.min(100, row.progress) : null
  return (
    <div className="rounded-xl border border-canvas-line px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink flex items-center gap-1.5">
          {type === 'CONTACTS' ? <Contact className="w-4 h-4" /> : <History className="w-4 h-4" />}
          {copy.title}
        </p>
        <span className="text-[11px] text-ink-soft">{syncStatusLabel(row)}</span>
      </div>
      {progress != null && (
        <div className="h-1.5 rounded-full bg-canvas-soft overflow-hidden" aria-label="Geçmiş eşitleme ilerlemesi">
          <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      )}
      {row && (
        <dl className="text-[11px] text-ink-soft grid grid-cols-2 gap-x-2 gap-y-0.5">
          {progress != null && (
            <>
              <dt>İlerleme</dt>
              <dd className="text-ink">%{progress}{row.lastPhase != null ? ` · faz ${row.lastPhase}` : ''}</dd>
            </>
          )}
          <dt>Alınan / aktarılan</dt>
          <dd className="text-ink">
            {row.itemsReceived} / {row.itemsImported}
          </dd>
          {row.requestId && (
            <>
              <dt>request_id</dt>
              <dd className="text-ink break-all">{row.requestId}</dd>
            </>
          )}
          <dt>İstek zamanı</dt>
          <dd className="text-ink">{formatDateTime(row.requestedAt)}</dd>
          {row.lastEventAt && (
            <>
              <dt>Son olay</dt>
              <dd className="text-ink">{formatDateTime(row.lastEventAt)}</dd>
            </>
          )}
        </dl>
      )}
      {row?.lastErrorMessage && <p className="text-[11px] text-amber-800">{row.lastErrorMessage}</p>}
      {action.reason && <p className="text-[11px] text-ink-faint">{action.reason}</p>}
      <button
        type="button"
        disabled={!action.allowed || busy}
        onClick={() => onRequest({ syncType: type, confirmRetry: action.needsConfirmRetry })}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {action.needsConfirmRetry ? `${copy.button} (yeniden dene)` : copy.button}
      </button>
    </div>
  )
}

export default function CoexistenceSyncPanel({ connectionId }: { connectionId: number }) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingSync | null>(null)
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setMessage(null)
    setPending(null)
  }, [connectionId])

  const statusQuery = useQuery({
    queryKey: ['whatsapp-coexistence-status', connectionId],
    queryFn: async () =>
      (await channelConnectionApi.getWhatsAppCoexistenceStatus(connectionId)).data?.data as CoexistenceStatusData,
    refetchInterval: (query) => (isCoexistenceSyncActive(query.state.data) ? 15_000 : false),
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: (p: PendingSync) =>
      channelConnectionApi.requestWhatsAppCoexistenceSync(connectionId, {
        syncType: p.syncType,
        ...(p.confirmRetry ? { confirmRetry: true } : {}),
      }),
    onSuccess: (res) => {
      setPending(null)
      setMessage({ type: 'info', text: res.data?.message || 'Eşitleme isteği gönderildi' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-coexistence-status', connectionId] })
    },
    onError: (err: any) => {
      setPending(null)
      setMessage({
        type: 'error',
        text: err?.response?.data?.error || channelSetupApiError(err, 'Eşitleme isteği gönderilemedi'),
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-coexistence-status', connectionId] })
    },
  })

  const data = statusQuery.data
  if (statusQuery.isLoading) {
    return <p className="text-xs text-ink-soft">Coexistence durumu yükleniyor…</p>
  }
  if (statusQuery.isError || !data) {
    return (
      <p className="text-xs text-amber-800">
        {channelSetupApiError(statusQuery.error, 'Coexistence durumu alınamadı')}
      </p>
    )
  }

  const remaining = formatRemaining(data.syncDeadline, nowMs)
  const disconnected = data.status === 'DISCONNECTED'

  return (
    <div className="border-t border-canvas-line pt-3 space-y-2.5" data-testid="coexistence-sync-panel">
      <h3 className="text-sm font-medium text-ink">WhatsApp Business uygulaması (Coexistence)</h3>

      {disconnected && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-0.5">
          <p className="font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {disconnectEventLabel(data.disconnection?.event)}
          </p>
          <p>Neden: {disconnectReasonLabel(data.disconnection?.reason)}</p>
          {data.disconnection?.initiated_by && (
            <p>Başlatan: {data.disconnection.initiated_by === 'USER' ? 'İşletme' : 'Sistem'}</p>
          )}
          <p>Zaman: {formatDateTime(data.disconnection?.occurred_at || data.statusAt)}</p>
          <p>Bağlantıyı “Yeniden bağla (Coexistence)” ile kurun.</p>
        </div>
      )}

      <dl className="text-xs text-ink-soft grid grid-cols-2 gap-x-2 gap-y-0.5">
        <dt>Bağlantı türü</dt>
        <dd className="text-ink">{data.coexistence ? 'Coexistence' : data.connectionType || '—'}</dd>
        <dt>Bağlanma zamanı</dt>
        <dd className="text-ink">{formatDateTime(data.onboardedAt)}</dd>
        <dt>Uygulamada aktif</dt>
        <dd className="text-ink">{data.isOnBizApp == null ? '—' : data.isOnBizApp ? 'Evet' : 'Hayır'}</dd>
        <dt>Platform</dt>
        <dd className="text-ink">{data.platformType || '—'}</dd>
        {data.syncDeadline && (
          <>
            <dt>Eşitleme süresi</dt>
            <dd className={remaining === 'Süre doldu' ? 'text-red-600' : 'text-ink'}>
              {formatDateTime(data.syncDeadline)}
              {remaining ? ` (${remaining})` : ''}
            </dd>
          </>
        )}
      </dl>

      {data.coexistence && (
        <p className="text-[11px] text-ink-faint leading-snug">
          Meta, bağlantıdan sonraki 24 saat içinde her eşitlemeye yalnızca bir kez izin verir. Eşitleme
          sırasında WhatsApp Business uygulamasını telefonda açık tutun.
        </p>
      )}

      {message && (
        <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{message.text}</p>
      )}

      {data.coexistence && (
        <div className="grid grid-cols-1 gap-2">
          <SyncCard
            type="CONTACTS"
            row={data.syncs.contacts}
            data={data}
            busy={syncMutation.isPending && syncMutation.variables?.syncType === 'CONTACTS'}
            onRequest={setPending}
          />
          <SyncCard
            type="HISTORY"
            row={data.syncs.history}
            data={data}
            busy={syncMutation.isPending && syncMutation.variables?.syncType === 'HISTORY'}
            onRequest={setPending}
          />
        </div>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wa-coex-sync-title"
          onClick={() => {
            if (!syncMutation.isPending) setPending(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-canvas-line p-5 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="wa-coex-sync-title" className="font-semibold text-ink text-lg">
              {SYNC_COPY[pending.syncType].button}
            </h3>
            <p className="text-sm text-ink-soft">{SYNC_COPY[pending.syncType].confirm}</p>
            {pending.confirmRetry && (
              <p className="text-sm text-amber-800">
                Önceki istekte Meta yanıtı alınamadı. Meta isteği kabul etmiş olabilir; yalnızca hiç veri
                gelmediyse yeniden deneyin.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={syncMutation.isPending}
                onClick={() => setPending(null)}
                className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate(pending)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
              >
                {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Evet, eşitle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
