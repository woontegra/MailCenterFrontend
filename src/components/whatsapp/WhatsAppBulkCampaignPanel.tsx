import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Pause,
  Play,
  Users,
  XCircle,
} from 'lucide-react'
import { contactApi, templateApi, whatsappCampaignApi } from '../../services/api'

type RecipientSource = 'contacts' | 'import' | 'paste'

type BulkSummary = {
  total: number
  sendable: number
  invalid: number
  duplicate: number
  no_permission: number
  missing_variable: number
  estimated_sends: number
}

type Props = {
  brandId: string
  channelConnectionId: string
  senderIdentityId: string
  ensuringSender: boolean
  senderError: string
}

function templateCategory(t: any): string {
  const c = t?.provider_template_components
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    return String((c as any).category || '').toUpperCase()
  }
  return ''
}

function templateOptionLabel(t: any): string {
  const lang = String(t.provider_template_language || '').trim()
  const providerName = String(t.provider_template_name || '').trim()
  if (providerName) return lang ? `${providerName} (${lang})` : providerName
  const name = String(t.name || '').trim() || 'Şablon'
  if (lang && name.endsWith(`(${lang})`)) return name
  if (lang && !name.includes(`(${lang})`)) return `${name} (${lang})`
  return name
}

function contactWaPreference(contact: any, brandId: string) {
  const prefs = contact.preferences || []
  return (
    prefs.find(
      (p: any) =>
        String(p.channel_type).toUpperCase() === 'WHATSAPP' &&
        (p.brand_id == null || String(p.brand_id) === String(brandId))
    ) ||
    prefs.find((p: any) => String(p.channel_type).toUpperCase() === 'WHATSAPP') ||
    null
  )
}

function contactEligible(contact: any, brandId: string): boolean {
  if (String(contact.status || '').toUpperCase() === 'BLOCKED') return false
  const pref = contactWaPreference(contact, brandId)
  return String(pref?.status || '').toUpperCase() === 'OPTED_IN'
}

function contactIneligibleReason(contact: any, brandId: string): string {
  if (String(contact.status || '').toUpperCase() === 'BLOCKED') return 'Engelli liste'
  const pref = contactWaPreference(contact, brandId)
  const st = String(pref?.status || 'UNKNOWN').toUpperCase()
  if (st === 'OPTED_OUT') return 'Mesaj almak istemiyor'
  if (st === 'UNKNOWN' || !pref) return 'İletişim izni yok'
  return 'Gönderilemez'
}

function contactPhone(contact: any): string {
  const points = contact.contact_points || []
  const p =
    points.find((x: any) => x.channel_type === 'WHATSAPP' && x.is_primary) ||
    points.find((x: any) => x.channel_type === 'WHATSAPP') ||
    points.find((x: any) => x.channel_type === 'SMS')
  return p?.value || p?.normalized_value || ''
}

function campaignStatusLabel(status: string): string {
  const st = String(status || '').toUpperCase()
  if (st === 'QUEUED' || st === 'SENDING') return 'Gönderiliyor'
  if (st === 'PAUSED') return 'Duraklatıldı'
  if (st === 'COMPLETED') return 'Tamamlandı'
  if (st === 'FAILED') return 'Hatalı'
  if (st === 'CANCELLED') return 'İptal'
  return st || '—'
}

const BUILTIN_FIELDS = [
  { key: 'ad', label: 'Ad' },
  { key: 'soyad', label: 'Soyad' },
  { key: 'tam_ad', label: 'Ad Soyad' },
  { key: 'firma', label: 'Firma' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-posta' },
]

export default function WhatsAppBulkCampaignPanel({
  brandId,
  channelConnectionId,
  senderIdentityId,
  ensuringSender,
  senderError,
}: Props) {
  const queryClient = useQueryClient()
  const [campaignName, setCampaignName] = useState('')
  const [recipientSource, setRecipientSource] = useState<RecipientSource>('contacts')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [phonesPaste, setPhonesPaste] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPhoneColumn, setImportPhoneColumn] = useState('Telefon')
  const [importNameColumn, setImportNameColumn] = useState('Ad Soyad')
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [templateId, setTemplateId] = useState('')
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<any>(null)
  const [previewError, setPreviewError] = useState('')
  const [launchError, setLaunchError] = useState('')
  const [launchNotice, setLaunchNotice] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null)

  const ready =
    Boolean(brandId) &&
    Boolean(channelConnectionId) &&
    Boolean(senderIdentityId) &&
    !ensuringSender &&
    !senderError

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-wa-bulk', brandId, channelConnectionId],
    enabled: ready,
    queryFn: async () => {
      const res = await templateApi.list({
        brand_id: brandId,
        channel_type: 'WHATSAPP',
        channel_connection_id: channelConnectionId,
        approval_status: 'APPROVED',
      })
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      return rows.filter(
        (t: any) =>
          t.is_active !== false &&
          String(t.provider_approval_status || '').toUpperCase() === 'APPROVED' &&
          templateCategory(t) === 'MARKETING'
      )
    },
  })

  const { data: contactsPayload, isFetching: contactsLoading } = useQuery({
    queryKey: ['contacts-wa-bulk', brandId, contactSearch],
    enabled: ready && recipientSource === 'contacts',
    queryFn: async () => {
      const res = await contactApi.list({
        channel: 'WHATSAPP',
        brand_id: brandId,
        q: contactSearch || undefined,
        limit: 50,
      })
      return res.data
    },
  })

  const contacts = Array.isArray(contactsPayload?.data) ? contactsPayload.data : []

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c: any) =>
      String(c.display_name || '')
        .toLowerCase()
        .includes(q)
    )
  }, [contacts, contactSearch])

  const selectedTemplate = useMemo(
    () => templates.find((t: any) => String(t.id) === String(templateId)),
    [templates, templateId]
  )

  const templateVars = useMemo(() => {
    if (!selectedTemplate) return []
    if (Array.isArray(selectedTemplate.variables)) {
      return selectedTemplate.variables
        .map((v: any) => (typeof v === 'string' ? v : v?.name))
        .filter(Boolean)
    }
    return []
  }, [selectedTemplate])

  useEffect(() => {
    if (!templateId) {
      setVariableMapping({})
      return
    }
    const next: Record<string, string> = {}
    templateVars.forEach((name: string) => {
      const lower = name.toLowerCase()
      if (lower.includes('ad') && !lower.includes('soyad')) next[name] = 'ad'
      else if (lower.includes('firma') || lower.includes('sirket')) next[name] = 'firma'
      else if (lower.includes('telefon')) next[name] = 'telefon'
      else next[name] = variableMapping[name] || 'ad'
    })
    setVariableMapping(next)
  }, [templateId, templateVars.join('|')])

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['wa-campaign-history', brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const res = await whatsappCampaignApi.list({ brand_id: brandId, limit: 20 })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: expandedRecipients = [] } = useQuery({
    queryKey: ['wa-campaign-recipients', expandedCampaignId],
    enabled: Boolean(expandedCampaignId),
    queryFn: async () => {
      const res = await whatsappCampaignApi.recipients(expandedCampaignId!, { limit: 200 })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const toggleContact = (id: number, eligible: boolean) => {
    if (!eligible) return
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setPreview(null)
  }

  const selectAllFiltered = () => {
    const ids = filteredContacts.filter((c: any) => contactEligible(c, brandId)).map((c: any) => c.id)
    setSelectedContactIds(ids)
    setPreview(null)
  }

  const buildPreviewPayload = () => ({
    brand_id: Number(brandId),
    channel_connection_id: Number(channelConnectionId),
    template_id: Number(templateId),
    variable_mapping: variableMapping,
    contact_ids: recipientSource === 'contacts' ? selectedContactIds : undefined,
    phones_paste: recipientSource === 'paste' ? phonesPaste : undefined,
  })

  const runPreview = async () => {
    setPreviewError('')
    setPreview(null)
    if (!templateId) {
      setPreviewError('Pazarlama şablonu seçin')
      return
    }
    setPreviewing(true)
    try {
      let res
      if (recipientSource === 'import') {
        if (!importFile) {
          setPreviewError('Dosya seçin')
          return
        }
        const fd = new FormData()
        fd.append('file', importFile)
        fd.append('brand_id', brandId)
        fd.append('channel_connection_id', channelConnectionId)
        fd.append('template_id', templateId)
        fd.append('variable_mapping', JSON.stringify(variableMapping))
        fd.append(
          'mapping',
          JSON.stringify({
            phone: importPhoneColumn,
            telefon: importPhoneColumn,
            display_name: importNameColumn,
            ad_soyad: importNameColumn,
          })
        )
        res = await whatsappCampaignApi.previewImport(fd)
      } else {
        res = await whatsappCampaignApi.previewRecipients(buildPreviewPayload())
      }
      setPreview(res.data?.data)
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || 'Önizleme alınamadı')
    } finally {
      setPreviewing(false)
    }
  }

  const launchMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: campaignName.trim(),
        brand_id: Number(brandId),
        channel_connection_id: Number(channelConnectionId),
        sender_identity_id: Number(senderIdentityId),
        template_id: Number(templateId),
        variable_mapping: variableMapping,
        contact_ids: recipientSource === 'contacts' ? selectedContactIds : undefined,
        phones_paste: recipientSource === 'paste' ? phonesPaste : undefined,
      }
      if (recipientSource === 'import' && preview?.input_rows) {
        payload.rows = preview.input_rows
      }
      return whatsappCampaignApi.launch(payload)
    },
    onSuccess: () => {
      setLaunchNotice('Toplu gönderim kuyruğa alındı')
      setLaunchError('')
      setPreview(null)
      setCampaignName('')
      setSelectedContactIds([])
      setPhonesPaste('')
      setImportFile(null)
      void refetchHistory()
      void queryClient.invalidateQueries({ queryKey: ['wa-campaign-history', brandId] })
    },
    onError: (err: any) => {
      setLaunchError(err.response?.data?.error || 'Gönderim başlatılamadı')
      setLaunchNotice('')
    },
  })

  const onImportFileChange = async (file: File | null) => {
    setImportFile(file)
    setPreview(null)
    if (!file) {
      setImportHeaders([])
      return
    }
    const text = await file.text()
    const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] || ''
    const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    setImportHeaders(headers)
    if (headers.includes('Telefon')) setImportPhoneColumn('Telefon')
    else if (headers[0]) setImportPhoneColumn(headers[0])
    if (headers.includes('Ad Soyad')) setImportNameColumn('Ad Soyad')
  }

  const downloadSample = async () => {
    const res = await whatsappCampaignApi.sampleCsv()
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'whatsapp-toplu-ornek.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadExport = async (id: number) => {
    const res = await whatsappCampaignApi.exportResults(id)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whatsapp-kampanya-${id}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary: BulkSummary | null = preview?.summary || null
  const canLaunch =
    ready &&
    campaignName.trim() &&
    templateId &&
    summary &&
    summary.sendable > 0 &&
    !launchMutation.isPending

  return (
    <div className="space-y-5 pt-2 border-t border-canvas-line">
      <label className="block text-sm">
        <span className="text-xs text-ink-faint uppercase tracking-wide">Kampanya adı</span>
        <input
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Örn. Bahar indirimi duyurusu"
        />
      </label>

      <div>
        <p className="text-xs text-ink-faint uppercase tracking-wide mb-2">Alıcı kaynağı</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['contacts', 'Kayıtlı kişiler'],
              ['import', 'Excel/CSV yükle'],
              ['paste', 'Numaraları yapıştır'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`px-3 py-2 rounded-lg text-xs ${
                recipientSource === key ? 'bg-dock text-white' : 'border border-canvas-line'
              }`}
              onClick={() => {
                setRecipientSource(key)
                setPreview(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {recipientSource === 'contacts' && (
        <div className="space-y-3 rounded-xl border border-canvas-line p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-[12rem] px-3 py-2 rounded-lg bg-canvas-soft text-sm"
              placeholder="Kişi ara…"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
            <button
              type="button"
              className="text-xs px-3 py-2 rounded-lg border border-canvas-line"
              onClick={selectAllFiltered}
            >
              Filtrelenenleri seç
            </button>
            <span className="text-xs text-ink-faint">{selectedContactIds.length} seçili</span>
          </div>
          {contactsLoading ? (
            <p className="text-sm text-ink-soft flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto space-y-1">
              {filteredContacts.map((c: any) => {
                const eligible = contactEligible(c, brandId)
                const checked = selectedContactIds.includes(c.id)
                return (
                  <li
                    key={c.id}
                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      eligible ? 'hover:bg-canvas-soft' : 'opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      disabled={!eligible}
                      onChange={() => toggleContact(c.id, eligible)}
                    />
                    <div>
                      <p className="font-medium">{c.display_name}</p>
                      <p className="text-xs text-ink-faint">{contactPhone(c) || 'Telefon yok'}</p>
                      {!eligible && (
                        <p className="text-xs text-amber-800">{contactIneligibleReason(c, brandId)}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {recipientSource === 'import' && (
        <div className="space-y-3 rounded-xl border border-canvas-line p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadSample()}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-canvas-line"
            >
              <Download className="w-3.5 h-3.5" />
              Örnek dosya indir
            </button>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="text-sm"
            onChange={(e) => void onImportFileChange(e.target.files?.[0] || null)}
          />
          {importHeaders.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-xs text-ink-faint">Telefon kolonu</span>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-canvas-soft text-sm"
                  value={importPhoneColumn}
                  onChange={(e) => setImportPhoneColumn(e.target.value)}
                >
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs text-ink-faint">Ad Soyad kolonu (opsiyonel)</span>
                <select
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-canvas-soft text-sm"
                  value={importNameColumn}
                  onChange={(e) => setImportNameColumn(e.target.value)}
                >
                  <option value="">—</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className="text-xs text-ink-faint">
            Zorunlu kolon: Telefon. Dosya yüklendikten sonra önizleme yapın; doğrudan gönderilmez.
          </p>
        </div>
      )}

      {recipientSource === 'paste' && (
        <label className="block text-sm">
          <span className="text-xs text-ink-faint uppercase tracking-wide">
            Her satırda bir telefon
          </span>
          <textarea
            className="mt-1 w-full min-h-[120px] px-3 py-2.5 rounded-xl bg-canvas-soft text-sm font-mono"
            placeholder={'+905551112233\n05552223344'}
            value={phonesPaste}
            onChange={(e) => {
              setPhonesPaste(e.target.value)
              setPreview(null)
            }}
          />
        </label>
      )}

      <label className="block text-sm">
        <span className="text-xs text-ink-faint uppercase tracking-wide">
          Pazarlama şablonu (onaylı)
        </span>
        <select
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value)
            setPreview(null)
          }}
          disabled={!ready}
        >
          <option value="">{ready ? 'Seçin' : 'Önce marka ve hat seçin'}</option>
          {templates.map((t: any) => (
            <option key={t.id} value={t.id}>
              {templateOptionLabel(t)}
            </option>
          ))}
        </select>
        {ready && templates.length === 0 && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Toplu gönderim için onaylı pazarlama şablonu gerekli.
          </p>
        )}
      </label>

      {templateVars.length > 0 && (
        <div className="rounded-xl border border-canvas-line p-3 space-y-2">
          <p className="text-xs text-ink-faint uppercase tracking-wide">Değişken eşleme</p>
          {templateVars.map((varName: string) => (
            <label key={varName} className="grid grid-cols-[8rem_1fr] gap-2 items-center text-sm">
              <span className="text-ink-soft">{`{{${varName}}}`}</span>
              <select
                className="px-3 py-2 rounded-lg bg-canvas-soft text-sm"
                value={variableMapping[varName] || ''}
                onChange={(e) =>
                  setVariableMapping({ ...variableMapping, [varName]: e.target.value })
                }
              >
                <option value="">Seçin</option>
                {BUILTIN_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
                {importHeaders.map((h) => (
                  <option key={`col-${h}`} value={h}>
                    Dosya: {h}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={!ready || previewing}
        onClick={() => void runPreview()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-canvas-line text-sm disabled:opacity-40"
      >
        {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
        Alıcıları önizle
      </button>

      {previewError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {previewError}
        </p>
      )}

      {summary && (
        <div className="rounded-xl bg-canvas-soft p-4 space-y-2 text-sm">
          <p className="font-medium">Gönderim özeti</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>Toplam: {summary.total}</div>
            <div className="text-emerald-700">Gönderilebilir: {summary.sendable}</div>
            <div>Geçersiz: {summary.invalid}</div>
            <div>Mükerrer: {summary.duplicate}</div>
            <div>İzin yok: {summary.no_permission}</div>
            <div>Eksik değişken: {summary.missing_variable}</div>
            <div className="md:col-span-2 font-medium">
              Tahmini gönderim: {summary.estimated_sends}
            </div>
          </div>
          {Array.isArray(preview?.sample_previews) && preview.sample_previews.length > 0 && (
            <div className="pt-2 border-t border-canvas-line space-y-2">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Mesaj önizlemesi</p>
              {preview.sample_previews.map((s: any, idx: number) => (
                <div key={idx} className="rounded-lg bg-white/80 p-2 text-xs">
                  <p className="text-ink-faint mb-1">
                    {s.display_name || s.phone}
                  </p>
                  <p className="whitespace-pre-wrap">{s.message}</p>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(preview?.recipients) && preview.recipients.some((r: any) => r.category !== 'sendable') && (
            <details className="text-xs">
              <summary className="cursor-pointer text-ink-soft">Sorunlu satırlar</summary>
              <ul className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {preview.recipients
                  .filter((r: any) => r.category !== 'sendable')
                  .slice(0, 50)
                  .map((r: any, i: number) => (
                    <li key={i}>
                      {r.phone || `#${r.row_number}`}: {r.reason}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {launchNotice && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {launchNotice}
        </p>
      )}
      {launchError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {launchError}
        </p>
      )}

      <button
        type="button"
        disabled={!canLaunch}
        onClick={() => launchMutation.mutate()}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dock text-white text-sm disabled:opacity-40"
      >
        {launchMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Toplu gönderimi başlat
      </button>

      <section className="pt-4 border-t border-canvas-line space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-signal" />
          <h3 className="text-sm font-medium">Kampanya Geçmişi</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-ink-soft">Henüz toplu kampanya yok.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((c: any) => {
              const summaryJson =
                typeof c.recipient_summary === 'object' ? c.recipient_summary : {}
              const expanded = expandedCampaignId === c.id
              return (
                <li key={c.id} className="rounded-xl border border-canvas-line p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-ink-faint">
                        {new Date(c.created_at).toLocaleString('tr-TR')} ·{' '}
                        {c.template_name || c.provider_template_name || 'Şablon'} ·{' '}
                        {campaignStatusLabel(c.status)}
                      </p>
                      <p className="text-xs mt-1">
                        Toplam {c.recipient_count || summaryJson.total || '—'} · Başarılı{' '}
                        {c.sent_count || 0} · Başarısız {c.failed_count || 0} · Bekleyen{' '}
                        {Math.max(
                          0,
                          (c.recipient_count || 0) - (c.sent_count || 0) - (c.failed_count || 0)
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['QUEUED', 'SENDING'].includes(String(c.status).toUpperCase()) && (
                        <button
                          type="button"
                          title="Duraklat"
                          className="p-1.5 rounded-lg border border-canvas-line"
                          onClick={() =>
                            void whatsappCampaignApi.pause(c.id).then(() => refetchHistory())
                          }
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {String(c.status).toUpperCase() === 'PAUSED' && (
                        <button
                          type="button"
                          title="Devam"
                          className="p-1.5 rounded-lg border border-canvas-line"
                          onClick={() =>
                            void whatsappCampaignApi.resume(c.id).then(() => refetchHistory())
                          }
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(String(c.status).toUpperCase()) && (
                        <button
                          type="button"
                          title="İptal"
                          className="p-1.5 rounded-lg border border-canvas-line text-red-600"
                          onClick={() =>
                            void whatsappCampaignApi.cancel(c.id).then(() => refetchHistory())
                          }
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Excel indir"
                        className="p-1.5 rounded-lg border border-canvas-line"
                        onClick={() => void downloadExport(c.id)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded-lg border border-canvas-line"
                        onClick={() => setExpandedCampaignId(expanded ? null : c.id)}
                      >
                        {expanded ? 'Gizle' : 'Alıcılar'}
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <ul className="mt-3 max-h-48 overflow-y-auto text-xs space-y-1 border-t border-canvas-line pt-2">
                      {expandedRecipients.map((r: any) => (
                        <li key={r.id} className="flex justify-between gap-2">
                          <span>{r.phone || r.display_name}</span>
                          <span className="text-ink-faint">
                            {r.status_label || r.status}
                            {r.last_error ? ` — ${r.last_error}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
