import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformAdminApi } from '../../services/api'
import { companyStatusLabel } from '../../utils/displayLabels'

export default function PlatformTenantDetail() {
  const { id } = useParams()
  const tenantId = Number(id)
  const queryClient = useQueryClient()
  const [planCode, setPlanCode] = useState('')
  const [limitsJson, setLimitsJson] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenant', tenantId],
    enabled: Number.isFinite(tenantId),
    queryFn: async () => (await platformAdminApi.tenant(tenantId)).data?.data,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const res = await platformAdminApi.plans()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['platform-activity', tenantId],
    queryFn: async () => {
      const res = await platformAdminApi.activity({ tenantId })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] })
    queryClient.invalidateQueries({ queryKey: ['platform-activity', tenantId] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => platformAdminApi.setTenantStatus(tenantId, { status }),
    onSuccess: () => {
      setInfo('Durum güncellendi')
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Durum güncellenemedi'),
  })

  const planMutation = useMutation({
    mutationFn: () => platformAdminApi.setTenantPlan(tenantId, { planCode }),
    onSuccess: () => {
      setInfo('Plan güncellendi')
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Plan güncellenemedi'),
  })

  const limitsMutation = useMutation({
    mutationFn: () => {
      const parsed = limitsJson.trim() ? JSON.parse(limitsJson) : {}
      return platformAdminApi.setTenantLimits(tenantId, { limits: parsed })
    },
    onSuccess: () => {
      setInfo('Özel limitler güncellendi')
      setError('')
      invalidate()
    },
    onError: (err: any) =>
      setError(err.response?.data?.error || err.message || 'Limitler güncellenemedi'),
  })

  if (isLoading || !data) {
    return <div className="animate-pulse h-40 bg-white/5 rounded-2xl" />
  }

  const ent = data.entitlements
  const tenant = data.tenant
  const overridePreview =
    limitsJson ||
    JSON.stringify(data.limitOverrides?.limits || data.overrides?.limits || {}, null, 2)

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-teal-300/80">Firma</p>
        <h1 className="font-display text-3xl font-semibold mt-1">{tenant.name}</h1>
        <p className="text-sm text-white/50 mt-1">
          {companyStatusLabel(tenant.status)} · {ent?.planCode || tenant.plan_code || '—'} ·{' '}
          {ent?.billingPeriod || '—'}
        </p>
      </div>

      {(error || info) && (
        <div
          className={`p-3 rounded-xl text-sm ${
            error ? 'bg-red-500/20 text-red-200' : 'bg-teal-500/20 text-teal-100'
          }`}
        >
          {error || info}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] text-white/50">Abonelik</p>
          <p className="mt-1">{ent?.subscriptionStatus || '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] text-white/50">E-posta / SMS / WA</p>
          <p className="mt-1 text-sm">
            {ent?.usage?.email_sent ?? 0} / {ent?.usage?.sms_sent ?? 0} /{' '}
            {ent?.usage?.whatsapp_sent ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] text-white/50">Ekip / Marka / Kişi</p>
          <p className="mt-1 text-sm">
            {ent?.usage?.users_count ?? 0} / {ent?.usage?.brands_count ?? 0} /{' '}
            {ent?.usage?.contacts_count ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-medium mb-3">Kota göstergeleri</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-white/80">
          {[
            ['E-posta', ent?.usage?.email_sent, ent?.limits?.monthly_email_sends],
            ['SMS', ent?.usage?.sms_sent, ent?.limits?.monthly_sms_sends],
            ['WhatsApp', ent?.usage?.whatsapp_sent, ent?.limits?.monthly_whatsapp_sends],
            ['Kullanıcı', ent?.usage?.users_count, ent?.limits?.max_users],
            ['Şablon', ent?.usage?.templates_count, ent?.limits?.max_templates],
          ].map(([label, used, limit]) => (
            <li key={String(label)} className="flex justify-between">
              <span>{label}</span>
              <span>
                {used ?? 0}
                {limit == null ? ' / ∞' : ` / ${limit}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-xl bg-teal-500/20 text-sm"
          onClick={() => statusMutation.mutate('ACTIVE')}
        >
          Aktifleştir
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-xl bg-amber-500/20 text-sm"
          onClick={() => statusMutation.mutate('SUSPENDED')}
        >
          Askıya al
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-xl bg-white/10 text-sm"
          onClick={() => statusMutation.mutate('ARCHIVED')}
        >
          Arşivle
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="text-sm font-medium">Plan değiştir</h2>
        <div className="flex gap-2">
          <select
            className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={planCode || ent?.planCode || ''}
            onChange={(e) => setPlanCode(e.target.value)}
          >
            <option value="">Plan seçin</option>
            {plans.map((p: any) => (
              <option key={p.id} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-teal-600 text-sm"
            onClick={() => planMutation.mutate()}
            disabled={!planCode}
          >
            Uygula
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h2 className="text-sm font-medium">Özel limit override (JSON)</h2>
        <p className="text-xs text-white/50">
          null = limitsiz. Örn: {'{"max_users":10,"monthly_email_sends":null}'}
        </p>
        <textarea
          className="w-full h-28 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-mono"
          value={limitsJson || overridePreview}
          onChange={(e) => setLimitsJson(e.target.value)}
        />
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-teal-600 text-sm"
          onClick={() => limitsMutation.mutate()}
        >
          Limitleri kaydet
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-medium mb-3">Platform işlem geçmişi</h2>
        <ul className="space-y-2 text-xs text-white/70">
          {activity.length === 0 && <li>Kayıt yok</li>}
          {activity.map((a: any) => (
            <li key={a.id}>
              {a.action} · {a.actorEmail || '—'} ·{' '}
              {a.createdAt ? new Date(a.createdAt).toLocaleString('tr-TR') : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
