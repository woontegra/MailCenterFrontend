import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Copy,
  FlaskConical,
  Pause,
  Play,
  Plus,
  Power,
  Trash2,
  Zap,
} from 'lucide-react'
import {
  automationApi,
  brandApi,
  senderIdentityApi,
  templateApi,
} from '../services/api'
import { useAuthStore } from '../store/authStore'
import { APP_DISPLAY_NAME } from '../config/app'
import Forbidden from './Forbidden'

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGERS = [
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'INBOUND_EMAIL_RECEIVED',
  'INBOUND_WHATSAPP_RECEIVED',
  'CONVERSATION_CREATED',
  'CONVERSATION_STATUS_CHANGED',
  'OUTBOUND_MESSAGE_FAILED',
  'MANUAL',
] as const

const ACTION_TYPES = [
  'SEND_EMAIL',
  'SEND_SMS',
  'SEND_WHATSAPP',
  'ASSIGN_CONVERSATION',
  'SET_CONVERSATION_STATUS',
  'SET_CONVERSATION_PRIORITY',
  'CREATE_INTERNAL_NOTE',
  'ADD_CONTACT_BRAND',
  'UPDATE_COMMUNICATION_PREFERENCE',
] as const

const CONDITION_FIELDS = [
  'brand_id',
  'channel',
  'contact_status',
  'preference_status',
  'conversation_status',
  'conversation_priority',
  'from_address',
  'to_address',
  'subject',
  'message_content',
  'company_name',
  'tag',
  'outbound_error_code',
] as const

const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'exists',
  'not_exists',
  'in',
] as const

type FilterKey = 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'FAILED' | 'RECENT'

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'DRAFT', label: 'Taslak' },
  { key: 'PAUSED', label: 'Duraklatılmış' },
  { key: 'FAILED', label: 'Hatalı' },
  { key: 'RECENT', label: 'Son çalıştırmalar' },
]

const triggerLabel: Record<string, string> = {
  CONTACT_CREATED: 'Kişi oluşturuldu',
  CONTACT_UPDATED: 'Kişi güncellendi',
  INBOUND_EMAIL_RECEIVED: 'Gelen e-posta',
  INBOUND_WHATSAPP_RECEIVED: 'Gelen WhatsApp',
  CONVERSATION_CREATED: 'Konuşma oluşturuldu',
  CONVERSATION_STATUS_CHANGED: 'Konuşma durumu değişti',
  OUTBOUND_MESSAGE_FAILED: 'Giden mesaj başarısız',
  MANUAL: 'Manuel',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Taslak',
  ACTIVE: 'Aktif',
  PAUSED: 'Duraklatılmış',
  ARCHIVED: 'Arşiv',
  PENDING: 'Bekliyor',
  RUNNING: 'Çalışıyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Hatalı',
  PARTIAL: 'Kısmi',
  SKIPPED: 'Atlandı',
}

const actionLabel: Record<string, string> = {
  SEND_EMAIL: 'E-posta gönder',
  SEND_SMS: 'SMS gönder',
  SEND_WHATSAPP: 'WhatsApp gönder',
  ASSIGN_CONVERSATION: 'Konuşma ata',
  SET_CONVERSATION_STATUS: 'Konuşma durumu',
  SET_CONVERSATION_PRIORITY: 'Konuşma önceliği',
  CREATE_INTERNAL_NOTE: 'İç not oluştur',
  ADD_CONTACT_BRAND: 'Kişiye marka ekle',
  UPDATE_COMMUNICATION_PREFERENCE: 'İletişim tercihi güncelle',
}

const fieldLabel: Record<string, string> = {
  brand_id: 'Marka',
  channel: 'Kanal',
  contact_status: 'Kişi durumu',
  preference_status: 'İletişim tercihi',
  conversation_status: 'Konuşma durumu',
  conversation_priority: 'Öncelik',
  from_address: 'Gönderen',
  to_address: 'Alıcı',
  subject: 'Konu',
  message_content: 'Mesaj içeriği',
  company_name: 'Şirket adı',
  tag: 'Etiket',
  outbound_error_code: 'Hata kodu',
}

const operatorLabel: Record<string, string> = {
  equals: 'Eşittir',
  not_equals: 'Eşit değil',
  contains: 'İçerir',
  not_contains: 'İçermez',
  starts_with: 'İle başlar',
  ends_with: 'İle biter',
  exists: 'Var',
  not_exists: 'Yok',
  in: 'Listede',
}

const WIZARD_STEPS = [
  { n: 1, label: 'Tetikleyici' },
  { n: 2, label: 'Koşullar' },
  { n: 3, label: 'Aksiyonlar' },
  { n: 4, label: 'Test' },
  { n: 5, label: 'Aktifleştir' },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

type Condition = { field: string; operator: string; value: string }
type ActionDraft = {
  actionType: string
  delaySeconds: number
  config: Record<string, unknown>
  isActive: boolean
}

type RuleForm = {
  name: string
  description: string
  triggerType: string
  brandId: string
  conditions: Condition[]
  actions: ActionDraft[]
}

type TestPayload = {
  contactId: string
  conversationId: string
  brandId: string
  channel: string
  fromAddress: string
  toAddress: string
  subject: string
  messagePreview: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return '—'
  }
}

function emptyForm(): RuleForm {
  return {
    name: '',
    description: '',
    triggerType: 'CONTACT_CREATED',
    brandId: '',
    conditions: [],
    actions: [
      {
        actionType: 'SEND_EMAIL',
        delaySeconds: 0,
        config: {},
        isActive: true,
      },
    ],
  }
}

function ruleToForm(rule: any): RuleForm {
  return {
    name: rule.name || '',
    description: rule.description || '',
    triggerType: rule.triggerType || 'CONTACT_CREATED',
    brandId: rule.brandId != null ? String(rule.brandId) : '',
    conditions: Array.isArray(rule.conditions)
      ? rule.conditions.map((c: any) => ({
          field: c.field || 'subject',
          operator: c.operator || 'equals',
          value: c.value != null ? String(c.value) : '',
        }))
      : [],
    actions: Array.isArray(rule.actions) && rule.actions.length > 0
      ? rule.actions.map((a: any) => ({
          actionType: a.actionType || 'SEND_EMAIL',
          delaySeconds: Number(a.delaySeconds || 0),
          config: a.config && typeof a.config === 'object' ? { ...a.config } : {},
          isActive: a.isActive !== false,
        }))
      : emptyForm().actions,
  }
}

function buildPayload(form: RuleForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    triggerType: form.triggerType,
    brandId: form.brandId ? Number(form.brandId) : null,
    conditions: form.conditions.map((c) => ({
      field: c.field,
      operator: c.operator,
      value: ['exists', 'not_exists'].includes(c.operator) ? undefined : c.value,
    })),
    actions: form.actions.map((a, i) => ({
      actionType: a.actionType,
      actionOrder: i,
      delaySeconds: Number(a.delaySeconds || 0),
      config: a.config,
      isActive: a.isActive,
    })),
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-signal/15 text-signal-deep'
    case 'DRAFT':
      return 'bg-canvas-soft text-ink-soft'
    case 'PAUSED':
      return 'bg-amber-50 text-amber-800'
    case 'FAILED':
      return 'bg-red-50 text-red-700'
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-800'
    case 'SKIPPED':
      return 'bg-canvas-soft text-ink-faint'
    default:
      return 'bg-canvas-soft text-ink-soft'
  }
}

function defaultActionConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'SEND_EMAIL':
    case 'SEND_SMS':
    case 'SEND_WHATSAPP':
      return { brandId: '', senderIdentityId: '', templateId: '', templateVariables: {}, delaySeconds: 0 }
    case 'ASSIGN_CONVERSATION':
      return { assignedUserId: '' }
    case 'SET_CONVERSATION_STATUS':
      return { status: 'OPEN' }
    case 'SET_CONVERSATION_PRIORITY':
      return { priority: 'NORMAL' }
    case 'CREATE_INTERNAL_NOTE':
      return { note: '' }
    case 'ADD_CONTACT_BRAND':
      return { brandId: '' }
    case 'UPDATE_COMMUNICATION_PREFERENCE':
      return { channelType: 'EMAIL', status: 'OPTED_IN', brandId: '' }
    default:
      return {}
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Automation() {
  const queryClient = useQueryClient()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canView = hasPermission('AUTOMATION_VIEW')
  const canManage = hasPermission('AUTOMATION_MANAGE')
  const canRun = hasPermission('AUTOMATION_RUN')

  const [filter, setFilter] = useState<FilterKey>('ACTIVE')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedExecutionId, setSelectedExecutionId] = useState<number | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardRuleId, setWizardRuleId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [manualConfirm, setManualConfirm] = useState(false)
  const [manualContactId, setManualContactId] = useState('')

  if (!canView) return <Forbidden />

  const statusParam = ['ACTIVE', 'DRAFT', 'PAUSED'].includes(filter) ? filter : undefined

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', statusParam],
    queryFn: async () => {
      const res = await automationApi.list(statusParam ? { status: statusParam } : undefined)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: executionsMap = {}, isFetching: executionsFetching } = useQuery({
    queryKey: ['automation-executions-map', rules.map((r: any) => r.id).join(',')],
    enabled: (filter === 'FAILED' || filter === 'RECENT') && rules.length > 0,
    queryFn: async () => {
      const map: Record<number, any[]> = {}
      await Promise.all(
        rules.map(async (r: any) => {
          try {
            const res = await automationApi.executions(r.id)
            map[r.id] = Array.isArray(res.data?.data) ? res.data.data : []
          } catch {
            map[r.id] = []
          }
        })
      )
      return map
    },
  })

  const failedRuleIds = useMemo(() => {
    const ids = new Set<number>()
    for (const [ruleId, execs] of Object.entries(executionsMap)) {
      const recent = (execs as any[]).slice(0, 5)
      if (recent.some((e) => e.status === 'FAILED' || e.status === 'PARTIAL')) {
        ids.add(Number(ruleId))
      }
    }
    return ids
  }, [executionsMap])

  const recentExecutions = useMemo(() => {
    const all: (any & { ruleName?: string })[] = []
    for (const rule of rules) {
      const execs = executionsMap[rule.id] || []
      for (const e of execs) {
        all.push({ ...e, ruleName: rule.name, automationRuleId: rule.id })
      }
    }
    return all.sort((a, b) => {
      const ta = new Date(a.createdAt || a.startedAt || 0).getTime()
      const tb = new Date(b.createdAt || b.startedAt || 0).getTime()
      return tb - ta
    })
  }, [rules, executionsMap])

  const displayedRules = useMemo(() => {
    if (filter === 'FAILED') return rules.filter((r: any) => failedRuleIds.has(r.id))
    return rules
  }, [rules, filter, failedRuleIds])

  const selected = rules.find((r: any) => r.id === selectedId) || null

  const { data: ruleDetail } = useQuery({
    queryKey: ['automation-rule', selectedId],
    enabled: Boolean(selectedId) && !wizardOpen,
    queryFn: async () => (await automationApi.get(selectedId!)).data?.data,
  })

  const { data: executions = [] } = useQuery({
    queryKey: ['automation-executions', selectedId],
    enabled: Boolean(selectedId) && filter !== 'RECENT',
    queryFn: async () => {
      const res = await automationApi.executions(selectedId!)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: executionDetail } = useQuery({
    queryKey: ['automation-execution', selectedExecutionId],
    enabled: Boolean(selectedExecutionId),
    queryFn: async () => (await automationApi.execution(selectedExecutionId!)).data?.data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    queryClient.invalidateQueries({ queryKey: ['automation-rule', selectedId] })
    queryClient.invalidateQueries({ queryKey: ['automation-executions', selectedId] })
    queryClient.invalidateQueries({ queryKey: ['automation-executions-map'] })
    queryClient.invalidateQueries({ queryKey: ['automation-execution'] })
  }

  const activateMutation = useMutation({
    mutationFn: (id: number) => automationApi.activate(id),
    onSuccess: () => {
      setInfo('Otomasyon aktifleştirildi')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Aktifleştirilemedi'),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: number) => automationApi.pause(id),
    onSuccess: () => {
      setInfo('Otomasyon duraklatıldı')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Duraklatılamadı'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => automationApi.duplicate(id),
    onSuccess: (res) => {
      const id = res.data?.data?.id
      if (id) setSelectedId(id)
      setInfo('Kopya oluşturuldu (taslak)')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Kopyalanamadı'),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => automationApi.archive(id),
    onSuccess: () => {
      setSelectedId(null)
      setInfo('Otomasyon arşivlendi')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Arşivlenemedi'),
  })

  const manualRunMutation = useMutation({
    mutationFn: (id: number) =>
      automationApi.manualRun(id, {
        confirm: true,
        payload: {
          contactId: manualContactId ? Number(manualContactId) : undefined,
        },
      }),
    onSuccess: () => {
      setInfo('Manuel çalıştırma kuyruğa alındı')
      setManualConfirm(false)
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Manuel çalıştırma başarısız'),
  })

  const openCreate = () => {
    setWizardRuleId(null)
    setWizardOpen(true)
    setError('')
    setInfo('')
  }

  const openEdit = (id: number) => {
    setWizardRuleId(id)
    setWizardOpen(true)
    setError('')
  }

  const detail = ruleDetail || selected

  return (
    <div className="mc-shell pt-1 pb-8 h-[calc(100vh-4rem)] flex flex-col min-h-0">
      <div className="mb-4 flex items-end justify-between gap-4 shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-1">İş akışı</p>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink">Otomasyon Merkezi</h1>
          <p className="text-sm text-ink-soft mt-1">
            {APP_DISPLAY_NAME} tetikleyici, koşul ve aksiyon kuralları.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-dock text-white text-sm rounded-xl rounded-tr-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni otomasyon
          </button>
        )}
      </div>

      {(error || info) && (
        <div
          className={`mb-3 p-3 rounded-xl text-sm shrink-0 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {error || info}
        </div>
      )}

      <div className="flex gap-2 mb-3 shrink-0 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-sm ${
              filter === tab.key ? 'bg-dock text-white' : 'bg-canvas-soft text-ink-soft'
            }`}
            onClick={() => {
              setFilter(tab.key)
              setSelectedId(null)
              setSelectedExecutionId(null)
              setError('')
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 min-h-0 flex-1">
        {/* Left: cards or recent runs */}
        <section className="mc-panel mc-panel-asymmetric w-full lg:w-[22rem] shrink-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {filter === 'RECENT' ? (
              <RecentRunsList
                isLoading={isLoading || executionsFetching}
                executions={recentExecutions}
                selectedId={selectedExecutionId}
                onSelect={(id, ruleId) => {
                  setSelectedExecutionId(id)
                  if (ruleId) setSelectedId(ruleId)
                }}
              />
            ) : (
              <RuleCardsList
                isLoading={isLoading || (filter === 'FAILED' && executionsFetching)}
                rules={displayedRules}
                selectedId={selectedId}
                failedRuleIds={failedRuleIds}
                onSelect={(id) => {
                  setSelectedId(id)
                  setSelectedExecutionId(null)
                  setError('')
                }}
              />
            )}
          </div>
        </section>

        {/* Right: detail / wizard */}
        <section className="mc-panel mc-panel-asymmetric flex-1 min-w-0 overflow-y-auto">
          {wizardOpen ? (
            <AutomationWizard
              ruleId={wizardRuleId}
              canManage={canManage}
              onClose={() => {
                setWizardOpen(false)
                setWizardRuleId(null)
              }}
              onSaved={(id) => {
                setSelectedId(id)
                setWizardOpen(false)
                setWizardRuleId(null)
                invalidate()
              }}
              setError={setError}
              setInfo={setInfo}
            />
          ) : filter === 'RECENT' && selectedExecutionId ? (
            <ExecutionDetailPanel
              execution={executionDetail}
              onBack={() => setSelectedExecutionId(null)}
            />
          ) : !detail ? (
            <div className="h-full flex flex-col items-center justify-center text-ink-soft text-sm p-8">
              <Zap className="w-10 h-10 mb-3 text-ink-faint" />
              {filter === 'RECENT'
                ? 'Son çalıştırmalardan birini seçin'
                : 'Bir otomasyon kuralı seçin veya yeni oluşturun'}
            </div>
          ) : (
            <RuleDetailPanel
              rule={detail}
              executions={executions}
              selectedExecutionId={selectedExecutionId}
              executionDetail={executionDetail}
              canManage={canManage}
              canRun={canRun}
              manualConfirm={manualConfirm}
              manualContactId={manualContactId}
              onManualConfirmChange={setManualConfirm}
              onManualContactIdChange={setManualContactId}
              onSelectExecution={setSelectedExecutionId}
              onEdit={() => openEdit(detail.id)}
              onActivate={() => activateMutation.mutate(detail.id)}
              onPause={() => pauseMutation.mutate(detail.id)}
              onDuplicate={() => duplicateMutation.mutate(detail.id)}
              onArchive={() => {
                if (window.confirm('Bu otomasyonu arşivlemek istiyor musunuz?')) {
                  archiveMutation.mutate(detail.id)
                }
              }}
              onManualRun={() => manualRunMutation.mutate(detail.id)}
              manualRunPending={manualRunMutation.isPending}
            />
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Rule Cards List ─────────────────────────────────────────────────────────

function RuleCardsList({
  isLoading,
  rules,
  selectedId,
  failedRuleIds,
  onSelect,
}: {
  isLoading: boolean
  rules: any[]
  selectedId: number | null
  failedRuleIds: Set<number>
  onSelect: (id: number) => void
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-canvas-line/40 rounded-lg" />
        ))}
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-soft">
        <Zap className="w-8 h-8 mx-auto mb-2 text-ink-faint" />
        Bu filtrede kural yok
      </div>
    )
  }

  return (
    <ul className="divide-y divide-canvas-line/70">
      {rules.map((rule) => (
        <li key={rule.id}>
          <button
            type="button"
            onClick={() => onSelect(rule.id)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              selectedId === rule.id ? 'bg-signal/10' : 'hover:bg-canvas-soft/80'
            }`}
          >
            <div className="flex items-start gap-2">
              <Zap
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  rule.status === 'ACTIVE' ? 'text-signal' : 'text-ink-faint'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{rule.name}</p>
                <p className="text-xs text-ink-soft truncate mt-0.5">
                  {triggerLabel[rule.triggerType] || rule.triggerType}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span
                    className={`text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ${statusBadgeClass(rule.status)}`}
                  >
                    {statusLabel[rule.status] || rule.status}
                  </span>
                  {failedRuleIds.has(rule.id) && (
                    <span className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md bg-red-50 text-red-700">
                      Son hata
                    </span>
                  )}
                  <span className="text-[10px] text-ink-faint">
                    {rule.executionCount ?? 0} çalışma
                  </span>
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─── Recent Runs List ────────────────────────────────────────────────────────

function RecentRunsList({
  isLoading,
  executions,
  selectedId,
  onSelect,
}: {
  isLoading: boolean
  executions: any[]
  selectedId: number | null
  onSelect: (executionId: number, ruleId?: number) => void
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-canvas-line/40 rounded-lg" />
        ))}
      </div>
    )
  }

  if (executions.length === 0) {
    return <div className="p-8 text-center text-sm text-ink-soft">Henüz çalıştırma yok</div>
  }

  return (
    <ul className="divide-y divide-canvas-line/70">
      {executions.slice(0, 50).map((ex) => (
        <li key={ex.id}>
          <button
            type="button"
            onClick={() => onSelect(ex.id, ex.automationRuleId)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              selectedId === ex.id ? 'bg-signal/10' : 'hover:bg-canvas-soft/80'
            }`}
          >
            <p className="text-sm font-medium text-ink truncate">{ex.ruleName || `Kural #${ex.automationRuleId}`}</p>
            <p className="text-xs text-ink-soft mt-0.5">
              {triggerLabel[ex.triggerType] || ex.triggerType} · {formatTime(ex.startedAt || ex.createdAt)}
            </p>
            <span
              className={`inline-block mt-1 text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ${statusBadgeClass(ex.status)}`}
            >
              {statusLabel[ex.status] || ex.status}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ─── Rule Detail Panel ───────────────────────────────────────────────────────

function RuleDetailPanel({
  rule,
  executions,
  selectedExecutionId,
  executionDetail,
  canManage,
  canRun,
  manualConfirm,
  manualContactId,
  onManualConfirmChange,
  onManualContactIdChange,
  onSelectExecution,
  onEdit,
  onActivate,
  onPause,
  onDuplicate,
  onArchive,
  onManualRun,
  manualRunPending,
}: {
  rule: any
  executions: any[]
  selectedExecutionId: number | null
  executionDetail: any
  canManage: boolean
  canRun: boolean
  manualConfirm: boolean
  manualContactId: string
  onManualConfirmChange: (v: boolean) => void
  onManualContactIdChange: (v: string) => void
  onSelectExecution: (id: number | null) => void
  onEdit: () => void
  onActivate: () => void
  onPause: () => void
  onDuplicate: () => void
  onArchive: () => void
  onManualRun: () => void
  manualRunPending: boolean
}) {
  const [showTest, setShowTest] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testPayload, setTestPayload] = useState<TestPayload>({
    contactId: '',
    conversationId: '',
    brandId: '',
    channel: 'EMAIL',
    fromAddress: '',
    toAddress: '',
    subject: '',
    messagePreview: '',
  })

  const testMutation = useMutation({
    mutationFn: () => {
      const sample: Record<string, unknown> = {}
      if (testPayload.contactId) sample.contactId = Number(testPayload.contactId)
      if (testPayload.conversationId) sample.conversationId = Number(testPayload.conversationId)
      if (testPayload.brandId) sample.brandId = Number(testPayload.brandId)
      if (testPayload.channel) sample.channel = testPayload.channel
      if (testPayload.fromAddress) sample.fromAddress = testPayload.fromAddress
      if (testPayload.toAddress) sample.toAddress = testPayload.toAddress
      if (testPayload.subject) sample.subject = testPayload.subject
      if (testPayload.messagePreview) sample.messagePreview = testPayload.messagePreview
      return automationApi.test(rule.id, { samplePayload: sample })
    },
    onSuccess: (res) => setTestResult(res.data?.data),
    onError: (err: any) => setTestResult({ error: err.response?.data?.error || 'Test başarısız' }),
  })

  if (selectedExecutionId && executionDetail) {
    return (
      <ExecutionDetailPanel
        execution={executionDetail}
        onBack={() => onSelectExecution(null)}
      />
    )
  }

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">{rule.name}</h2>
            {rule.description && (
              <p className="text-sm text-ink-soft mt-1">{rule.description}</p>
            )}
          </div>
          <span
            className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-lg ${statusBadgeClass(rule.status)}`}
          >
            {statusLabel[rule.status] || rule.status}
          </span>
        </div>
        <p className="text-xs text-ink-faint mt-2">
          Tetikleyici: {triggerLabel[rule.triggerType] || rule.triggerType}
          {rule.brandId ? ` · Marka #${rule.brandId}` : ''}
          {' · '}
          Son çalışma: {formatTime(rule.lastExecutedAt)}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-canvas-line bg-canvas/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">Koşullar</p>
          <p className="text-sm text-ink">{rule.conditions?.length || 0} koşul</p>
          {Array.isArray(rule.conditions) && rule.conditions.length > 0 && (
            <ul className="mt-2 text-xs text-ink-soft space-y-0.5">
              {rule.conditions.slice(0, 4).map((c: any, i: number) => (
                <li key={i}>
                  {fieldLabel[c.field] || c.field} {operatorLabel[c.operator] || c.operator}{' '}
                  {c.value != null ? `"${c.value}"` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-canvas-line bg-canvas/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">Aksiyonlar</p>
          <p className="text-sm text-ink">{rule.actions?.length || 0} aksiyon</p>
          {Array.isArray(rule.actions) && rule.actions.length > 0 && (
            <ul className="mt-2 text-xs text-ink-soft space-y-0.5">
              {rule.actions.map((a: any, i: number) => (
                <li key={i}>
                  {i + 1}. {actionLabel[a.actionType] || a.actionType}
                  {a.delaySeconds ? ` (+${a.delaySeconds}s)` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canManage && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-2 rounded-xl bg-canvas-soft text-xs text-ink"
            >
              Düzenle
            </button>
            {rule.status !== 'ACTIVE' && (
              <button
                type="button"
                onClick={onActivate}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-signal text-white text-xs"
              >
                <Power className="w-3 h-3" />
                Aktifleştir
              </button>
            )}
            {rule.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={onPause}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs"
              >
                <Pause className="w-3 h-3" />
                Duraklat
              </button>
            )}
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-canvas-soft text-xs"
            >
              <Copy className="w-3 h-3" />
              Kopyala
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs"
            >
              <Archive className="w-3 h-3" />
              Arşivle
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setShowTest(!showTest)
            setTestResult(null)
          }}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-canvas-soft text-xs"
        >
          <FlaskConical className="w-3 h-3" />
          Test
        </button>
      </div>

      {showTest && (
        <div className="rounded-xl border border-canvas-line bg-canvas/50 p-4 space-y-3">
          <p className="text-xs text-ink-soft">
            Test modu gerçek gönderim yapmaz. SMS/WhatsApp ve e-posta aksiyonları simüle edilir.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {(
              [
                ['contactId', 'Kişi ID'],
                ['conversationId', 'Konuşma ID'],
                ['brandId', 'Marka ID'],
                ['channel', 'Kanal'],
                ['fromAddress', 'Gönderen'],
                ['toAddress', 'Alıcı'],
                ['subject', 'Konu'],
                ['messagePreview', 'Önizleme'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</label>
                <input
                  className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                  value={testPayload[key]}
                  onChange={(e) => setTestPayload({ ...testPayload, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
            className="px-4 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
          >
            {testMutation.isPending ? 'Test ediliyor…' : 'Test çalıştır'}
          </button>
          {testResult && (
            <pre className="text-xs bg-canvas-soft rounded-xl p-3 overflow-auto max-h-48 text-ink-soft">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {canRun && rule.triggerType === 'MANUAL' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">Manuel çalıştırma</p>
          <p className="text-xs text-amber-800">
            Gerçek aksiyonlar çalışır; gönderimler canlı kuyruğa alınır. Tek kişi ile sınırlıdır.
          </p>
          <input
            className="w-full px-3 py-2 rounded-xl bg-white text-sm"
            placeholder="Kişi ID (isteğe bağlı)"
            value={manualContactId}
            onChange={(e) => onManualContactIdChange(e.target.value)}
          />
          <label className="flex items-start gap-2 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={manualConfirm}
              onChange={(e) => onManualConfirmChange(e.target.checked)}
              className="mt-0.5"
            />
            Gerçek çalıştırmayı onaylıyorum; gönderimler ve yan etkiler oluşabilir.
          </label>
          <button
            type="button"
            disabled={!manualConfirm || manualRunPending}
            onClick={onManualRun}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {manualRunPending ? 'Kuyruğa alınıyor…' : 'Manuel çalıştır'}
          </button>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-2">
          Çalıştırma geçmişi
        </p>
        {executions.length === 0 ? (
          <p className="text-sm text-ink-soft">Henüz kayıt yok</p>
        ) : (
          <ul className="space-y-2">
            {executions.map((ex: any) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onSelectExecution(ex.id)}
                  className="w-full text-left rounded-xl border border-canvas-line bg-canvas/50 px-3 py-2.5 hover:bg-canvas-soft/80 transition-colors"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-ink">
                      {triggerLabel[ex.triggerType] || ex.triggerType}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md shrink-0 ${statusBadgeClass(ex.status)}`}
                    >
                      {statusLabel[ex.status] || ex.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {formatTime(ex.startedAt || ex.createdAt)}
                    {ex.actionCount != null ? ` · ${ex.completedActionCount ?? 0}/${ex.actionCount} aksiyon` : ''}
                  </p>
                  {ex.safeErrorMessage && (
                    <p className="text-xs text-red-600 mt-1 truncate">{ex.safeErrorMessage}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Execution Detail Panel ──────────────────────────────────────────────────

function ExecutionDetailPanel({
  execution,
  onBack,
}: {
  execution: any
  onBack: () => void
}) {
  if (!execution) {
    return (
      <div className="p-8 text-center text-sm text-ink-soft animate-pulse">
        Yükleniyor…
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-signal hover:underline"
      >
        ← Geri
      </button>

      <div>
        <h2 className="font-display text-lg text-ink">Çalıştırma #{execution.id}</h2>
        <p className="text-xs text-ink-faint mt-1">
          {triggerLabel[execution.triggerType] || execution.triggerType} ·{' '}
          {formatTime(execution.startedAt || execution.createdAt)}
          {execution.completedAt ? ` → ${formatTime(execution.completedAt)}` : ''}
        </p>
        <span
          className={`inline-block mt-2 text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-lg ${statusBadgeClass(execution.status)}`}
        >
          {statusLabel[execution.status] || execution.status}
        </span>
      </div>

      {execution.safeErrorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {execution.safeErrorMessage}
        </div>
      )}

      {execution.matchedConditions != null && (
        <div className="rounded-xl border border-canvas-line bg-canvas/50 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-1">
            Koşul eşleşmesi
          </p>
          <p className="text-sm text-ink">
            {execution.matchedConditions ? 'Eşleşti' : 'Eşleşmedi'}
          </p>
        </div>
      )}

      {Array.isArray(execution.actionExecutions) && execution.actionExecutions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint mb-2">Aksiyonlar</p>
          <ul className="space-y-2">
            {execution.actionExecutions.map((ae: any) => (
              <li
                key={ae.id}
                className="rounded-xl border border-canvas-line bg-canvas/50 px-3 py-2.5"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-ink">Aksiyon #{ae.automationActionId}</span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ${statusBadgeClass(ae.status)}`}
                  >
                    {statusLabel[ae.status] || ae.status}
                  </span>
                </div>
                {ae.outboundMessageId && (
                  <p className="text-xs text-ink-soft mt-1">
                    Giden mesaj:{' '}
                    <a
                      href={`/outbound?message=${ae.outboundMessageId}`}
                      className="text-signal hover:underline"
                    >
                      #{ae.outboundMessageId}
                    </a>
                  </p>
                )}
                {ae.safeErrorMessage && (
                  <p className="text-xs text-red-600 mt-1">{ae.safeErrorMessage}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {execution.triggerPayload && (
        <details className="rounded-xl border border-canvas-line bg-canvas/50 p-3">
          <summary className="text-xs text-ink-soft cursor-pointer">Tetik yükü</summary>
          <pre className="text-xs mt-2 overflow-auto max-h-40 text-ink-faint">
            {JSON.stringify(execution.triggerPayload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

function AutomationWizard({
  ruleId,
  canManage,
  onClose,
  onSaved,
  setError,
  setInfo,
}: {
  ruleId: number | null
  canManage: boolean
  onClose: () => void
  onSaved: (id: number) => void
  setError: (s: string) => void
  setInfo: (s: string) => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<RuleForm>(emptyForm())
  const [savedId, setSavedId] = useState<number | null>(ruleId)
  const [testResult, setTestResult] = useState<any>(null)
  const [testPayload, setTestPayload] = useState<TestPayload>({
    contactId: '',
    conversationId: '',
    brandId: '',
    channel: 'EMAIL',
    fromAddress: '',
    toAddress: '',
    subject: '',
    messagePreview: '',
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['automation-wizard', ruleId],
    enabled: Boolean(ruleId),
    queryFn: async () => (await automationApi.get(ruleId!)).data?.data,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities'],
    queryFn: async () => {
      const res = await senderIdentityApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await templateApi.list()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const [formLoaded, setFormLoaded] = useState(!ruleId)

  useEffect(() => {
    if (ruleId && existing && !formLoaded) {
      setForm(ruleToForm(existing))
      setSavedId(ruleId)
      setFormLoaded(true)
    }
  }, [ruleId, existing, formLoaded])

  if (ruleId && (isLoading || !formLoaded)) {
    return <div className="p-8 text-center text-sm text-ink-soft animate-pulse">Yükleniyor…</div>
  }

  const saveMutation = useMutation({
    mutationFn: async (status?: string) => {
      const payload = { ...buildPayload(form), status: status || 'DRAFT' }
      if (savedId) return automationApi.update(savedId, payload)
      return automationApi.create(payload)
    },
    onSuccess: (res) => {
      const id = res.data?.data?.id || savedId
      if (id) setSavedId(id)
      setInfo('Taslak kaydedildi')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Kaydedilemedi'),
  })

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!savedId) {
        const res = await saveMutation.mutateAsync('DRAFT')
        const id = res.data?.data?.id
        if (!id) throw new Error('Kayıt oluşturulamadı')
        setSavedId(id)
        return automationApi.activate(id)
      }
      await saveMutation.mutateAsync('DRAFT')
      return automationApi.activate(savedId)
    },
    onSuccess: () => {
      setInfo('Otomasyon aktifleştirildi')
      onSaved(savedId!)
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Aktifleştirilemedi'),
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      let id = savedId
      if (!id) {
        const res = await saveMutation.mutateAsync('DRAFT')
        id = res.data?.data?.id
        if (!id) throw new Error('Önce taslak kaydedilmeli')
        setSavedId(id)
      }
      const sample: Record<string, unknown> = {}
      if (testPayload.contactId) sample.contactId = Number(testPayload.contactId)
      if (testPayload.conversationId) sample.conversationId = Number(testPayload.conversationId)
      if (testPayload.brandId) sample.brandId = Number(testPayload.brandId)
      if (testPayload.channel) sample.channel = testPayload.channel
      if (testPayload.fromAddress) sample.fromAddress = testPayload.fromAddress
      if (testPayload.toAddress) sample.toAddress = testPayload.toAddress
      if (testPayload.subject) sample.subject = testPayload.subject
      if (testPayload.messagePreview) sample.messagePreview = testPayload.messagePreview
      return automationApi.test(id, { samplePayload: sample })
    },
    onSuccess: (res) => setTestResult(res.data?.data),
    onError: (err: any) => setTestResult({ error: err.response?.data?.error || 'Test başarısız' }),
  })

  const goNext = async () => {
    setError('')
    if (step === 1 && !form.name.trim()) {
      setError('Kural adı zorunlu')
      return
    }
    if (step === 3 && canManage) {
      try {
        await saveMutation.mutateAsync('DRAFT')
      } catch {
        return
      }
    }
    setStep((s) => Math.min(5, s + 1))
  }

  const updateAction = (index: number, patch: Partial<ActionDraft>) => {
    const actions = [...form.actions]
    actions[index] = { ...actions[index], ...patch }
    setForm({ ...form, actions })
  }

  const moveAction = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= form.actions.length) return
    const actions = [...form.actions]
    ;[actions[index], actions[next]] = [actions[next], actions[index]]
    setForm({ ...form, actions })
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center text-sm text-ink-soft">
        Düzenleme için AUTOMATION_MANAGE yetkisi gerekli.
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">
          {ruleId ? 'Otomasyonu düzenle' : 'Yeni otomasyon'}
        </h2>
        <button type="button" onClick={onClose} className="text-xs text-ink-soft hover:text-ink">
          Kapat
        </button>
      </div>

      <nav className="flex gap-1 flex-wrap">
        {WIZARD_STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`px-3 py-1.5 rounded-xl text-xs ${
              step === s.n ? 'bg-signal text-white' : 'bg-canvas-soft text-ink-soft'
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </nav>

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Ad</label>
            <input
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Örn: Hoş geldin e-postası"
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Açıklama</label>
            <textarea
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm min-h-[72px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Tetikleyici</label>
            <select
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              value={form.triggerType}
              onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {triggerLabel[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Marka (isteğe bağlı)
            </label>
            {brands.length > 0 ? (
              <select
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              >
                <option value="">Tüm markalar</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
                type="number"
                placeholder="Marka ID"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-ink-soft">Tüm koşullar sağlanmalı (AND). Boş liste = her zaman.</p>
          {form.conditions.map((cond, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row gap-2 rounded-xl border border-canvas-line p-3 bg-canvas/50"
            >
              <select
                className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                value={cond.field}
                onChange={(e) => {
                  const conditions = [...form.conditions]
                  conditions[index] = { ...cond, field: e.target.value }
                  setForm({ ...form, conditions })
                }}
              >
                {CONDITION_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {fieldLabel[f]}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                value={cond.operator}
                onChange={(e) => {
                  const conditions = [...form.conditions]
                  conditions[index] = { ...cond, operator: e.target.value }
                  setForm({ ...form, conditions })
                }}
              >
                {CONDITION_OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {operatorLabel[o]}
                  </option>
                ))}
              </select>
              {!['exists', 'not_exists'].includes(cond.operator) && (
                <input
                  className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                  value={cond.value}
                  placeholder="Değer"
                  onChange={(e) => {
                    const conditions = [...form.conditions]
                    conditions[index] = { ...cond, value: e.target.value }
                    setForm({ ...form, conditions })
                  }}
                />
              )}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    conditions: form.conditions.filter((_, i) => i !== index),
                  })
                }
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                conditions: [
                  ...form.conditions,
                  { field: 'subject', operator: 'contains', value: '' },
                ],
              })
            }
            className="text-sm text-signal"
          >
            + Koşul ekle
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {form.actions.map((action, index) => (
            <div
              key={index}
              className="rounded-xl border border-canvas-line bg-canvas/50 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint w-6">{index + 1}.</span>
                <select
                  className="flex-1 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                  value={action.actionType}
                  onChange={(e) => {
                    updateAction(index, {
                      actionType: e.target.value,
                      config: defaultActionConfig(e.target.value),
                    })
                  }}
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {actionLabel[t]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveAction(index, -1)}
                  className="p-2 rounded-lg bg-canvas-soft disabled:opacity-30"
                  title="Yukarı"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === form.actions.length - 1}
                  onClick={() => moveAction(index, 1)}
                  className="p-2 rounded-lg bg-canvas-soft disabled:opacity-30"
                  title="Aşağı"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      actions: form.actions.filter((_, i) => i !== index),
                    })
                  }
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <ActionConfigFields
                action={action}
                brands={brands}
                senders={senders}
                templates={templates}
                onChange={(config) => updateAction(index, { config })}
                onDelayChange={(delaySeconds) => updateAction(index, { delaySeconds })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                actions: [
                  ...form.actions,
                  {
                    actionType: 'CREATE_INTERNAL_NOTE',
                    delaySeconds: 0,
                    config: defaultActionConfig('CREATE_INTERNAL_NOTE'),
                    isActive: true,
                  },
                ],
              })
            }
            className="text-sm text-signal"
          >
            + Aksiyon ekle
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs text-ink-soft">
            Test gerçek gönderim yapmaz. Sonuçlar simülasyon içindir.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {(
              [
                ['contactId', 'Kişi ID'],
                ['conversationId', 'Konuşma ID'],
                ['brandId', 'Marka ID'],
                ['channel', 'Kanal'],
                ['fromAddress', 'Gönderen'],
                ['toAddress', 'Alıcı'],
                ['subject', 'Konu'],
                ['messagePreview', 'Önizleme'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</label>
                <input
                  className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
                  value={testPayload[key]}
                  onChange={(e) => setTestPayload({ ...testPayload, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
            className="px-4 py-2 rounded-xl bg-dock text-white text-sm disabled:opacity-50"
          >
            {testMutation.isPending ? 'Test ediliyor…' : 'Test çalıştır'}
          </button>
          {testResult && (
            <div className="rounded-xl border border-canvas-line bg-canvas/50 p-3 space-y-2">
              {testResult.matched != null && (
                <p className="text-sm text-ink">
                  Koşullar: {testResult.matched ? 'Eşleşti' : 'Eşleşmedi'}
                </p>
              )}
              {Array.isArray(testResult.actions) && (
                <ul className="text-xs text-ink-soft space-y-1">
                  {testResult.actions.map((a: any, i: number) => (
                    <li key={i}>
                      {actionLabel[a.actionType] || a.actionType}:{' '}
                      {a.wouldSkip ? `Atlanır — ${a.skipReason}` : 'Çalışır (simülasyon)'}
                    </li>
                  ))}
                </ul>
              )}
              <pre className="text-xs overflow-auto max-h-32 text-ink-faint">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-canvas-line bg-canvas/50 p-4 space-y-2 text-sm">
            <p>
              <span className="text-ink-faint">Ad:</span> {form.name}
            </p>
            <p>
              <span className="text-ink-faint">Tetikleyici:</span>{' '}
              {triggerLabel[form.triggerType]}
            </p>
            <p>
              <span className="text-ink-faint">Koşul:</span> {form.conditions.length}
            </p>
            <p>
              <span className="text-ink-faint">Aksiyon:</span> {form.actions.length}
            </p>
          </div>
          <p className="text-xs text-ink-soft">
            Aktifleştirme gerçek tetikleyicilerde kuralı çalıştırır. Kuyruk yapılandırması gerekir.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={async () => {
                try {
                  const res = await saveMutation.mutateAsync('DRAFT')
                  const id = res.data?.data?.id || savedId
                  if (id) onSaved(id)
                } catch {
                  /* error handled */
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-canvas-soft text-sm"
            >
              Taslak olarak kaydet
            </button>
            <button
              type="button"
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate()}
              className="px-4 py-2.5 rounded-xl bg-signal text-white text-sm disabled:opacity-50"
            >
              {activateMutation.isPending ? 'Aktifleştiriliyor…' : 'Aktifleştir'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-canvas-line">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded-xl bg-canvas-soft text-sm"
          >
            Geri
          </button>
        )}
        {step < 5 && (
          <button
            type="button"
            onClick={goNext}
            className="px-4 py-2 rounded-xl bg-dock text-white text-sm"
          >
            İleri
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Action Config Fields ────────────────────────────────────────────────────

function ActionConfigFields({
  action,
  brands,
  senders,
  templates,
  onChange,
  onDelayChange,
}: {
  action: ActionDraft
  brands: any[]
  senders: any[]
  templates: any[]
  onChange: (config: Record<string, unknown>) => void
  onDelayChange: (n: number) => void
}) {
  const cfg = action.config || {}
  const set = (key: string, value: unknown) => onChange({ ...cfg, [key]: value })

  const channelForAction = (): string | null => {
    if (action.actionType === 'SEND_EMAIL') return 'EMAIL'
    if (action.actionType === 'SEND_SMS') return 'SMS'
    if (action.actionType === 'SEND_WHATSAPP') return 'WHATSAPP'
    return null
  }

  const ch = channelForAction()
  const brandId = String(cfg.brandId || '')

  const filteredSenders = senders.filter(
    (s: any) =>
      (!brandId || String(s.brand_id) === brandId) &&
      (!ch || s.channel_type === ch) &&
      s.is_active !== false
  )

  const filteredTemplates = templates.filter((t: any) => {
    if (ch && t.channel_type && t.channel_type !== ch) return false
    if (brandId && t.brand_id && String(t.brand_id) !== brandId) return false
    if (action.actionType === 'SEND_WHATSAPP') {
      return String(t.provider_approval_status || '').toUpperCase() === 'APPROVED'
    }
    return t.is_active !== false
  })

  if (['SEND_EMAIL', 'SEND_SMS', 'SEND_WHATSAPP'].includes(action.actionType)) {
    return (
      <div className="space-y-2 pl-8">
        {action.actionType === 'SEND_SMS' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            SMS için alıcının OPTED_IN tercihi zorunludur. Uygun değilse aksiyon atlanır (sahte başarı
            yok).
          </p>
        )}
        {action.actionType === 'SEND_WHATSAPP' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            WhatsApp için OPTED_IN tercihi ve APPROVED şablon zorunludur. Uygun değilse aksiyon
            atlanır.
          </p>
        )}

        <BrandSelect
          brands={brands}
          value={String(cfg.brandId || '')}
          onChange={(v) => set('brandId', v ? Number(v) : '')}
        />
        <SenderSelect
          senders={filteredSenders}
          allSenders={senders}
          value={String(cfg.senderIdentityId || '')}
          onChange={(v) => set('senderIdentityId', v ? Number(v) : '')}
        />
        <TemplateSelect
          templates={filteredTemplates}
          allTemplates={templates}
          value={String(cfg.templateId || '')}
          onChange={(v) => set('templateId', v ? Number(v) : '')}
          whatsapp={action.actionType === 'SEND_WHATSAPP'}
        />

        {action.actionType === 'SEND_WHATSAPP' && (
          <div>
            <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Dil</label>
            <input
              className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
              placeholder="tr"
              value={String(cfg.language || cfg.provider_template_language || '')}
              onChange={(e) => set('language', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Şablon değişkenleri (JSON)
          </label>
          <textarea
            className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm font-mono text-xs min-h-[64px]"
            value={
              typeof cfg.templateVariables === 'object'
                ? JSON.stringify(cfg.templateVariables, null, 2)
                : String(cfg.templateVariables || '{}')
            }
            onChange={(e) => {
              try {
                set('templateVariables', JSON.parse(e.target.value || '{}'))
              } catch {
                set('templateVariables', e.target.value)
              }
            }}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Gecikme (saniye)
          </label>
          <input
            type="number"
            min={0}
            className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
            value={action.delaySeconds}
            onChange={(e) => onDelayChange(Number(e.target.value) || 0)}
          />
        </div>
      </div>
    )
  }

  if (action.actionType === 'ASSIGN_CONVERSATION') {
    return (
      <div className="pl-8">
        <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Kullanıcı ID</label>
        <input
          type="number"
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={String(cfg.assignedUserId || '')}
          onChange={(e) => set('assignedUserId', e.target.value ? Number(e.target.value) : '')}
        />
      </div>
    )
  }

  if (action.actionType === 'SET_CONVERSATION_STATUS') {
    return (
      <div className="pl-8">
        <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Durum</label>
        <select
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={String(cfg.status || 'OPEN')}
          onChange={(e) => set('status', e.target.value)}
        >
          {['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (action.actionType === 'SET_CONVERSATION_PRIORITY') {
    return (
      <div className="pl-8">
        <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Öncelik</label>
        <select
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={String(cfg.priority || 'NORMAL')}
          onChange={(e) => set('priority', e.target.value)}
        >
          {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (action.actionType === 'CREATE_INTERNAL_NOTE') {
    return (
      <div className="pl-8">
        <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Not</label>
        <textarea
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm min-h-[72px]"
          value={String(cfg.note || '')}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    )
  }

  if (action.actionType === 'ADD_CONTACT_BRAND') {
    return (
      <div className="pl-8">
        <BrandSelect
          brands={brands}
          value={String(cfg.brandId || '')}
          onChange={(v) => set('brandId', v ? Number(v) : '')}
        />
      </div>
    )
  }

  if (action.actionType === 'UPDATE_COMMUNICATION_PREFERENCE') {
    return (
      <div className="space-y-2 pl-8">
        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Kanal</label>
          <select
            className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
            value={String(cfg.channelType || cfg.channel || 'EMAIL')}
            onChange={(e) => set('channelType', e.target.value)}
          >
            {['EMAIL', 'SMS', 'WHATSAPP'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Durum</label>
          <select
            className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
            value={String(cfg.status || 'OPTED_IN')}
            onChange={(e) => set('status', e.target.value)}
          >
            {['OPTED_IN', 'OPTED_OUT', 'UNKNOWN'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <BrandSelect
          brands={brands}
          value={String(cfg.brandId || '')}
          onChange={(v) => set('brandId', v ? Number(v) : '')}
          optional
        />
      </div>
    )
  }

  return null
}

function BrandSelect({
  brands,
  value,
  onChange,
  optional,
}: {
  brands: any[]
  value: string
  onChange: (v: string) => void
  optional?: boolean
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Marka</label>
      {brands.length > 0 ? (
        <select
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {optional && <option value="">—</option>}
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          placeholder="Marka ID"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function SenderSelect({
  senders,
  allSenders,
  value,
  onChange,
}: {
  senders: any[]
  allSenders: any[]
  value: string
  onChange: (v: string) => void
}) {
  const list = senders.length > 0 ? senders : allSenders
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">Gönderici</label>
      {list.length > 0 ? (
        <select
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Seçin</option>
          {list.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.display_name || s.sender_value} ({s.channel_type})
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          placeholder="Gönderici kimlik ID"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function TemplateSelect({
  templates,
  allTemplates,
  value,
  onChange,
  whatsapp,
}: {
  templates: any[]
  allTemplates: any[]
  value: string
  onChange: (v: string) => void
  whatsapp?: boolean
}) {
  const list = templates.length > 0 ? templates : allTemplates
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Şablon{whatsapp ? ' (APPROVED)' : ''}
      </label>
      {list.length > 0 ? (
        <select
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Seçin</option>
          {list.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {whatsapp && t.provider_approval_status ? ` [${t.provider_approval_status}]` : ''}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          className="w-full mt-0.5 px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          placeholder="Şablon ID"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
