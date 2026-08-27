import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react'
import {
  accountApi,
  brandApi,
  campaignApi,
  contactApi,
  contactListApi,
  segmentApi,
  senderIdentityApi,
  tagApi,
  templateApi,
} from '../services/api'

const STEPS = [
  'Kampanya',
  'Gönderen',
  'Alıcılar',
  'Şablon',
  'Konu',
  'Önizleme',
  'Test',
  'Zamanlama',
  'Kontrol',
  'Başlat',
]

type AudienceMode = 'ALL' | 'TAG' | 'COMPANY' | 'MANUAL' | 'SEGMENT' | 'IMPORT' | 'LIST'

export default function CampaignWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !id || id === 'new'
  const [campaignId, setCampaignId] = useState<number | null>(isNew ? null : Number(id))
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [senderAccountId, setSenderAccountId] = useState('')
  const [senderIdentityId, setSenderIdentityId] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('ALL')
  const [tagIds, setTagIds] = useState<number[]>([])
  const [companyName, setCompanyName] = useState('')
  const [contactIds, setContactIds] = useState<number[]>([])
  const [segmentId, setSegmentId] = useState('')
  const [listIds, setListIds] = useState<number[]>([])
  const [importId, setImportId] = useState<number | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMapping, setImportMapping] = useState({
    first_name: 'Ad',
    last_name: 'Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    company_name: 'Firma',
    tags: 'Etiketler',
  })
  const [importSummary, setImportSummary] = useState<any | null>(null)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importOptions, setImportOptions] = useState({
    snapshot_only: true,
    update_existing: false,
    save_new_contacts: false,
  })
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [scheduledAt, setScheduledAt] = useState('')
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [previewHtml, setPreviewHtml] = useState('')

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountApi.getAccounts()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: senders = [] } = useQuery({
    queryKey: ['sender-identities', brandId],
    queryFn: async () => {
      const res = await senderIdentityApi.list()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-email', brandId],
    queryFn: async () => {
      const res = await templateApi.list({ channel_type: 'EMAIL', brand_id: brandId || undefined })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    enabled: Boolean(brandId),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await tagApi.getTags()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: segments = [] } = useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const res = await segmentApi.list()
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: contactLists = [] } = useQuery({
    queryKey: ['contact-lists-wizard'],
    queryFn: async () => {
      const res = await contactListApi.list({ active_only: true })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    enabled: audienceMode === 'LIST',
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const res = await contactApi.list({ status: 'ACTIVE' })
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
    },
    enabled: audienceMode === 'MANUAL',
  })

  const { data: loadedCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const res = await campaignApi.get(campaignId!)
      return res.data?.data
    },
    enabled: Boolean(campaignId),
  })

  useEffect(() => {
    if (!loadedCampaign) return
    setName(loadedCampaign.name || '')
    setBrandId(loadedCampaign.brand_id ? String(loadedCampaign.brand_id) : '')
    setSenderAccountId(loadedCampaign.sender_account_id ? String(loadedCampaign.sender_account_id) : '')
    setSenderIdentityId(loadedCampaign.sender_identity_id ? String(loadedCampaign.sender_identity_id) : '')
    setReplyTo(loadedCampaign.reply_to || '')
    setTemplateId(loadedCampaign.template_id ? String(loadedCampaign.template_id) : '')
    setSubject(loadedCampaign.subject || '')
    setPreheader(loadedCampaign.preheader || '')
    const aud = loadedCampaign.audience_config || {}
    setAudienceMode(aud.mode || 'ALL')
    setTagIds(aud.tag_ids || [])
    setCompanyName(aud.company_name || '')
    setContactIds(aud.contact_ids || [])
    setSegmentId(aud.segment_id ? String(aud.segment_id) : '')
    setListIds(Array.isArray(aud.list_ids) ? aud.list_ids.map(Number).filter(Boolean) : [])
    setImportId(aud.import_id || null)
    if (loadedCampaign.scheduled_at) {
      setSendNow(false)
      setScheduledAt(new Date(loadedCampaign.scheduled_at).toISOString().slice(0, 16))
    }
  }, [loadedCampaign])

  const filteredSenders = useMemo(
    () =>
      senders.filter(
        (s: any) =>
          s.channel_type === 'EMAIL' &&
          s.is_active &&
          s.is_verified &&
          (!brandId || String(s.brand_id) === String(brandId))
      ),
    [senders, brandId]
  )

  const audienceConfig = useMemo(
    () => ({
      mode: audienceMode,
      tag_ids: tagIds,
      company_name: companyName,
      contact_ids: contactIds,
      segment_id: segmentId ? Number(segmentId) : undefined,
      list_ids: listIds,
      import_id: importId || undefined,
    }),
    [audienceMode, tagIds, companyName, contactIds, segmentId, listIds, importId]
  )

  const buildPatch = () => ({
    name,
    brand_id: brandId ? Number(brandId) : null,
    sender_account_id: senderAccountId ? Number(senderAccountId) : null,
    sender_identity_id: senderIdentityId ? Number(senderIdentityId) : null,
    reply_to: replyTo || null,
    template_id: templateId ? Number(templateId) : null,
    subject,
    preheader,
    audience_config: audienceConfig,
    scheduled_at: !sendNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPatch()
      if (!campaignId) {
        if (!name.trim()) throw new Error('Kampanya adı gerekli')
        const res = await campaignApi.create({ name: name.trim(), brand_id: payload.brand_id, timezone: payload.timezone })
        const row = res.data?.data
        setCampaignId(row.id)
        await campaignApi.update(row.id, payload)
        return row
      }
      const res = await campaignApi.update(campaignId, payload)
      return res.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      if (campaignId) queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message || 'Kaydedilemedi'),
  })

  const previewAudienceMutation = useMutation({
    mutationFn: async () => {
      const res = await campaignApi.previewAudience({
        brand_id: brandId ? Number(brandId) : null,
        audience_config: audienceConfig,
      })
      return res.data?.data
    },
    onSuccess: (data) => {
      setAudienceCount(data?.count ?? 0)
      setImportSummary(data?.summary || null)
    },
  })

  const previewImportMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Önce kampanyayı kaydedin')
      if (!importFile) throw new Error('Dosya seçin')
      const fd = new FormData()
      fd.append('file', importFile)
      fd.append('mapping', JSON.stringify(importMapping))
      const res = await campaignApi.previewImport(campaignId, fd)
      return res.data?.data
    },
    onSuccess: (data) => {
      setImportId(data?.import_id || null)
      setImportSummary(data?.summary || null)
      setImportHeaders(data?.headers || [])
      setAudienceMode('IMPORT')
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message || 'Dosya okunamadı'),
  })

  const applyImportMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId || !importId) throw new Error('Önce import önizlemesi alın')
      const res = await campaignApi.applyImport(campaignId, importId, importOptions)
      return res.data?.data
    },
    onSuccess: () => {
      setAudienceMode('IMPORT')
      previewAudienceMutation.mutate()
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Import uygulanamadı'),
  })

  const previewTemplateMutation = useMutation({
    mutationFn: async () => {
      const tpl = templates.find((t: any) => String(t.id) === templateId)
      if (!tpl) throw new Error('Şablon seçin')
      const res = await templateApi.render({
        subject: subject || tpl.subject,
        htmlContent: tpl.content,
        plainTextContent: tpl.plain_text_content,
        variables: tpl.variables,
        values: {
          ad: 'Ayşe',
          soyad: 'Yılmaz',
          tam_ad: 'Ayşe Yılmaz',
          firma: 'Örnek A.Ş.',
          email: 'ornek@email.com',
          telefon: '+90 555 123 45 67',
          marka_adi: brands.find((b: any) => String(b.id) === brandId)?.name || 'Marka',
          abonelikten_cikma_linki: 'https://example.com/unsubscribe/test',
        },
      })
      return res.data?.data
    },
    onSuccess: (data) => {
      setPreviewHtml(data?.htmlContent || data?.html_content || '')
    },
  })

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Önce kaydedin')
      const res = await campaignApi.validate(campaignId)
      return res.data?.data
    },
    onSuccess: (data) => setValidationIssues(data?.issues || []),
  })

  const testSendMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Önce kaydedin')
      return campaignApi.testSend(campaignId, { to: testEmail })
    },
    onSuccess: () => setError(''),
    onError: (err: any) => setError(err.response?.data?.error || 'Test gönderilemedi'),
  })

  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Kampanya bulunamadı')
      return campaignApi.launch(campaignId, {
        send_now: sendNow,
        scheduled_at: !sendNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate('/outbound')
    },
    onError: (err: any) => {
      setValidationIssues(err.response?.data?.issues || [])
      setError(err.response?.data?.error || 'Başlatılamadı')
    },
  })

  const goNext = async () => {
    setError('')
    try {
      await saveMutation.mutateAsync()
      if (step === 2) await previewAudienceMutation.mutateAsync()
      if (step === 5) await previewTemplateMutation.mutateAsync()
      if (step === 8) await validateMutation.mutateAsync()
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    } catch {
      /* error set in mutation */
    }
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const toggleContact = (cid: number) => {
    setContactIds((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]))
  }

  const toggleTag = (tid: number) => {
    setTagIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]))
  }

  const toggleList = (lid: number) => {
    setListIds((prev) => (prev.includes(lid) ? prev.filter((x) => x !== lid) : [...prev, lid]))
  }

  const audienceModeLabel: Record<AudienceMode, string> = {
    ALL: 'Tüm kişiler',
    TAG: 'Etikete göre',
    COMPANY: 'Firmaya göre',
    MANUAL: 'Elle seç',
    SEGMENT: 'Segment',
    IMPORT: 'Dosya import',
    LIST: 'Kişi listelerinden seç',
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="border-b border-canvas-line bg-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/outbound')} className="p-2 rounded-lg hover:bg-canvas-soft">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs text-ink-faint">Kampanya sihirbazı · Adım {step + 1}/{STEPS.length}</p>
            <h1 className="font-display text-lg font-semibold text-ink">{STEPS[step]}</h1>
          </div>
        </div>
        <div className="hidden md:flex gap-1">
          {STEPS.map((label, i) => (
            <span key={label} className={`text-[10px] px-2 py-1 rounded ${i === step ? 'bg-dock text-white' : i < step ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas-soft text-ink-faint'}`}>
              {i + 1}
            </span>
          ))}
        </div>
      </header>

      {error && <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {step === 0 && (
          <div className="space-y-4 mc-panel p-6">
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Kampanya adı" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Marka seçin</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 mc-panel p-6">
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={senderAccountId} onChange={(e) => setSenderAccountId(e.target.value)}>
              <option value="">Gönderen hesap (opsiyonel referans)</option>
              {accounts.filter((a: any) => a.is_active).map((a: any) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={senderIdentityId} onChange={(e) => setSenderIdentityId(e.target.value)} required>
              <option value="">Gönderim kimliği seçin</option>
              {filteredSenders.map((s: any) => (
                <option key={s.id} value={s.id}>{s.display_name} · {s.sender_value}</option>
              ))}
            </select>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Yanıt adresi (opsiyonel)" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mc-panel p-6">
            <div className="grid grid-cols-2 gap-2">
              {(['ALL', 'TAG', 'COMPANY', 'MANUAL', 'SEGMENT', 'IMPORT', 'LIST'] as AudienceMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setAudienceMode(m)} className={`px-3 py-2 rounded-xl text-sm ${audienceMode === m ? 'bg-dock text-white' : 'bg-canvas-soft'}`}>
                  {audienceModeLabel[m]}
                </button>
              ))}
            </div>
            {audienceMode === 'TAG' && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t: any) => (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)} className={`px-3 py-1.5 rounded-lg text-xs ${tagIds.includes(t.id) ? 'bg-dock text-white' : 'bg-canvas-soft'}`}>
                    {t.name}
                  </button>
                ))}
                {tags.length === 0 && <p className="text-sm text-ink-soft">Henüz etiket yok. Kişilere etiket atamak için contact_tag_links kullanılabilir.</p>}
              </div>
            )}
            {audienceMode === 'COMPANY' && (
              <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Firma adı" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            )}
            {audienceMode === 'MANUAL' && (
              <div className="max-h-64 overflow-auto space-y-1 border border-canvas-line rounded-xl p-2">
                {contacts.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-canvas-soft cursor-pointer">
                    <input type="checkbox" checked={contactIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                    <span>{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.company_name || `#${c.id}`}</span>
                  </label>
                ))}
              </div>
            )}
            {audienceMode === 'SEGMENT' && (
              <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
                <option value="">Segment seçin</option>
                {segments.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {audienceMode === 'LIST' && (
              <div className="space-y-2">
                <p className="text-xs text-ink-soft">Bir veya birden fazla liste seçin. Aynı kişi birden fazla listede olsa tek alıcı sayılır.</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-canvas-line rounded-xl p-2">
                  {contactLists.map((list: any) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => toggleList(list.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs text-left ${
                        listIds.includes(list.id) ? 'bg-dock text-white' : 'bg-canvas-soft'
                      }`}
                    >
                      {list.name}
                      <span className="block opacity-80">{list.member_count || 0} üye</span>
                    </button>
                  ))}
                  {contactLists.length === 0 && (
                    <p className="text-sm text-ink-soft p-2">Henüz liste yok. Kişiler → Listeler bölümünden oluşturabilirsiniz.</p>
                  )}
                </div>
                <p className="text-xs text-ink-faint">{listIds.length} liste seçili</p>
              </div>
            )}
            {audienceMode === 'IMPORT' && (
              <div className="space-y-3 border border-canvas-line rounded-xl p-3">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-sm" />
                <div className="grid md:grid-cols-3 gap-2">
                  {Object.keys(importMapping).map((key) => (
                    <input
                      key={key}
                      className="px-3 py-2 rounded-xl bg-canvas-soft text-xs"
                      placeholder={key}
                      value={(importMapping as any)[key]}
                      onChange={(e) => setImportMapping({ ...importMapping, [key]: e.target.value })}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => previewImportMutation.mutate()} disabled={!importFile || previewImportMutation.isPending} className="px-3 py-2 rounded-xl bg-canvas-soft text-sm">
                    Önizle
                  </button>
                  <button type="button" onClick={() => applyImportMutation.mutate()} disabled={!importId || applyImportMutation.isPending} className="px-3 py-2 rounded-xl bg-dock text-white text-sm">
                    Snapshot'a uygula
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-2 text-xs text-ink-soft">
                  <label className="flex items-center gap-2 rounded-lg bg-canvas-soft p-2">
                    <input
                      type="checkbox"
                      checked={importOptions.snapshot_only}
                      onChange={(e) => setImportOptions({ ...importOptions, snapshot_only: e.target.checked })}
                    />
                    Yalnızca kampanya snapshot'ı
                  </label>
                  <label className="flex items-center gap-2 rounded-lg bg-canvas-soft p-2">
                    <input
                      type="checkbox"
                      checked={importOptions.update_existing}
                      onChange={(e) => setImportOptions({ ...importOptions, update_existing: e.target.checked, snapshot_only: false })}
                    />
                    Mevcut kişileri güncelle
                  </label>
                  <label className="flex items-center gap-2 rounded-lg bg-canvas-soft p-2">
                    <input
                      type="checkbox"
                      checked={importOptions.save_new_contacts}
                      onChange={(e) => setImportOptions({ ...importOptions, save_new_contacts: e.target.checked, snapshot_only: false })}
                    />
                    Yeni kişileri kaydet
                  </label>
                </div>
                {importHeaders.length > 0 && <p className="text-xs text-ink-faint">Bulunan kolonlar: {importHeaders.join(', ')}</p>}
              </div>
            )}
            {audienceCount != null && <p className="text-sm text-ink-soft">Tahmini gönderilebilir alıcı: <strong>{audienceCount}</strong></p>}
            {importSummary && audienceMode === 'LIST' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <span className="rounded-lg bg-canvas-soft p-2">Listedeki toplam: {importSummary.list_total ?? '—'}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Gönderilebilir: {importSummary.sendable ?? importSummary.final_total ?? '—'}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Mükerrer: {importSummary.duplicate_removed ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">E-posta izni yok: {importSummary.no_email_permission ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Abonelikten çıkmış: {importSummary.unsubscribed_removed ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Geçersiz e-posta: {importSummary.invalid_removed ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Engellenmiş: {importSummary.blocked_removed ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Hard bounce: {importSummary.bounce_removed ?? 0}</span>
              </div>
            )}
            {importSummary && audienceMode !== 'LIST' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <span className="rounded-lg bg-canvas-soft p-2">İlk toplam: {importSummary.initial_total ?? importSummary.total_rows ?? '—'}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Mükerrer: {importSummary.duplicate_removed ?? importSummary.duplicate_rows ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Geçersiz: {importSummary.invalid_removed ?? importSummary.invalid_email ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Eksik e-posta: {importSummary.missing_email_removed ?? importSummary.missing_email ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Suppression: {importSummary.suppressed_removed ?? importSummary.suppressed ?? 0}</span>
                <span className="rounded-lg bg-canvas-soft p-2">Final: {importSummary.final_total ?? importSummary.valid_rows ?? '—'}</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 mc-panel p-6">
            <select className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">E-posta şablonu seçin</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}{t.subject ? ` · ${t.subject}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 mc-panel p-6">
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="E-posta konusu" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Preheader / ön izleme metni" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
          </div>
        )}

        {step === 5 && (
          <div className="mc-panel p-2 overflow-hidden">
            {previewHtml ? (
              <iframe title="Önizleme" srcDoc={previewHtml} className="w-full min-h-[480px] border-0" sandbox="" />
            ) : (
              <p className="p-6 text-sm text-ink-soft">Önizleme yükleniyor…</p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 mc-panel p-6">
            <p className="text-sm text-ink-soft">Test gönderimi kampanya istatistiklerine eklenmez. Konu başına [TEST] eklenir.</p>
            <input className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" placeholder="Test e-posta adresi" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <button type="button" onClick={() => testSendMutation.mutate()} disabled={!testEmail || testSendMutation.isPending} className="px-4 py-2.5 rounded-xl bg-dock text-white text-sm">
              Test gönder
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 mc-panel p-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} /> Şimdi gönder
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} /> Belirli tarih/saatte gönder
            </label>
            {!sendNow && (
              <input type="datetime-local" className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            )}
            <p className="text-xs text-ink-faint">Zaman dilimi: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4 mc-panel p-6">
            <h2 className="font-medium text-ink">Son kontrol</h2>
            <ul className="text-sm space-y-1 text-ink-soft">
              <li>Kampanya: {name}</li>
              <li>Marka: {brands.find((b: any) => String(b.id) === brandId)?.name || '—'}</li>
              <li>Konu: {subject || '—'}</li>
              <li>Alıcı (tahmini): {audienceCount ?? '—'}</li>
              <li>Gönderim: {sendNow ? 'Hemen' : scheduledAt || '—'}</li>
            </ul>
            {validationIssues.length > 0 ? (
              <ul className="text-sm text-red-600 space-y-1">
                {validationIssues.map((v, i) => <li key={i}>• {v.message}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700 flex items-center gap-1"><Check className="w-4 h-4" /> Kontroller geçti</p>
            )}
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4 mc-panel p-6 text-center">
            <p className="text-ink">Kampanya kuyruğa alınmaya hazır. Her alıcı için ayrı outbound mesaj oluşturulacak.</p>
            <button type="button" onClick={() => launchMutation.mutate()} disabled={launchMutation.isPending || validationIssues.length > 0} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-dock text-white">
              <Send className="w-4 h-4" /> {sendNow ? 'Kuyruğa al' : 'Planla'}
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-canvas-line bg-white px-4 py-3 flex justify-between">
        <button type="button" onClick={goBack} disabled={step === 0} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-canvas-soft text-sm disabled:opacity-40">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={goNext} disabled={saveMutation.isPending} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-dock text-white text-sm">
            İleri <ArrowRight className="w-4 h-4" />
          </button>
        ) : null}
      </footer>
    </div>
  )
}
