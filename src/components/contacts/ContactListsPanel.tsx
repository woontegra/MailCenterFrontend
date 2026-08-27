import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { contactApi, contactListApi } from '../../services/api'

type Props = {
  onSelectContact?: (id: number) => void
}

type ImportMapping = Record<string, string>

const MAPPING_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'organization_name', label: 'Kurum / Kişi Adı' },
  { key: 'contact_name', label: 'Yetkili Adı' },
  { key: 'email', label: 'E-posta' },
  { key: 'phone', label: 'Telefon' },
  { key: 'city', label: 'Şehir' },
  { key: 'notes', label: 'Not' },
  { key: 'email_permission', label: 'E-posta İzni' },
  { key: 'whatsapp_permission', label: 'WhatsApp İzni' },
]

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function OverlayModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-dock/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`mc-panel w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[min(92vh,900px)] flex flex-col shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-canvas-line shrink-0">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-canvas-soft text-ink-soft"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      </div>
    </div>,
    document.body
  )
}

function FormatMenu({
  label,
  options,
}: {
  label: string
  options: Array<{ label: string; onClick: () => void }>
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 z-20 min-w-[10rem] rounded-xl border border-canvas-line bg-white shadow-lg py-1">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-canvas-soft"
                onClick={() => {
                  setOpen(false)
                  opt.onClick()
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_MAPPING: ImportMapping = {
  organization_name: '',
  contact_name: '',
  email: '',
  phone: '',
  city: '',
  notes: '',
  email_permission: '',
  whatsapp_permission: '',
}

export default function ContactListsPanel({ onSelectContact }: Props) {
  const queryClient = useQueryClient()
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [memberPageSize, setMemberPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25)
  const [listSearch, setListSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [error, setError] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importId, setImportId] = useState<number | null>(null)
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMapping, setImportMapping] = useState<ImportMapping>(EMPTY_MAPPING)
  const [addContactSearch, setAddContactSearch] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)

  const memberOffset = (memberPage - 1) * memberPageSize

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['contact-lists', listSearch],
    queryFn: async () => {
      const res = await contactListApi.list({ q: listSearch || undefined })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: membersPayload, isFetching: membersLoading } = useQuery({
    queryKey: ['contact-list-members', selectedListId, memberSearch, memberPage, memberPageSize],
    enabled: Boolean(selectedListId),
    queryFn: async () => {
      const res = await contactListApi.members(selectedListId!, {
        q: memberSearch || undefined,
        limit: memberPageSize,
        offset: memberOffset,
      })
      return {
        rows: Array.isArray(res.data?.data) ? res.data.data : [],
        total: Number(res.data?.total || 0),
      }
    },
  })

  const members = membersPayload?.rows || []
  const memberTotal = membersPayload?.total || 0
  const memberTotalPages = Math.max(1, Math.ceil(memberTotal / memberPageSize))

  const { data: pickerContacts = [] } = useQuery({
    queryKey: ['contacts-picker-lists', addContactSearch],
    enabled: showAddMember,
    queryFn: async () => {
      const res = await contactApi.list({ q: addContactSearch || undefined, status: 'ACTIVE', limit: 50 })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const selectedList = useMemo(
    () => lists.find((l: any) => Number(l.id) === Number(selectedListId)),
    [lists, selectedListId]
  )

  useEffect(() => {
    setMemberPage(1)
  }, [selectedListId, memberSearch, memberPageSize])

  const closeImportModal = useCallback(() => {
    setShowImport(false)
    setImportFile(null)
    setImportPreview(null)
    setImportId(null)
    setImportHeaders([])
    setImportMapping(EMPTY_MAPPING)
    setError('')
  }, [])

  const createMutation = useMutation({
    mutationFn: () => contactListApi.create({ name: createName.trim(), description: createDesc.trim() || null }),
    onSuccess: (res) => {
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      setSelectedListId(res.data?.data?.id || null)
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Liste oluşturulamadı'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactListApi.remove(id),
    onSuccess: () => {
      setSelectedListId(null)
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
  })

  const addMembersMutation = useMutation({
    mutationFn: (contactIds: number[]) =>
      contactListApi.addMembers(selectedListId!, { contact_ids: contactIds }),
    onSuccess: () => {
      setShowAddMember(false)
      void queryClient.invalidateQueries({ queryKey: ['contact-list-members', selectedListId] })
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (contactId: number) => contactListApi.removeMember(selectedListId!, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contact-list-members', selectedListId] })
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
  })

  const previewImportMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedListId) throw new Error('Liste seçin')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mapping', JSON.stringify(importMapping))
      return contactListApi.previewImport(selectedListId, fd)
    },
    onSuccess: (res) => {
      const data = res.data?.data
      setImportPreview(data)
      setImportId(data?.import_id || null)
      setImportHeaders(Array.isArray(data?.headers) ? data.headers : [])
      const applied = data?.applied_mapping || data?.detected_mapping || {}
      setImportMapping((prev) => ({
        ...prev,
        organization_name: applied.organization_name || prev.organization_name || '',
        contact_name: applied.contact_name || prev.contact_name || '',
        email: applied.email || prev.email || '',
        phone: applied.phone || prev.phone || '',
        city: applied.city || prev.city || '',
        notes: applied.notes || prev.notes || '',
        email_permission: applied.email_permission || prev.email_permission || '',
        whatsapp_permission: applied.whatsapp_permission || prev.whatsapp_permission || '',
      }))
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Önizleme alınamadı'),
  })

  useEffect(() => {
    if (!showImport || !importFile || !selectedListId) return
    const timer = window.setTimeout(() => {
      previewImportMutation.mutate(importFile)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [showImport, importFile, selectedListId])

  const applyImportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedListId || !importId) throw new Error('Önce önizleme yapın')
      return contactListApi.applyImport(selectedListId, importId)
    },
    onSuccess: () => {
      closeImportModal()
      void queryClient.invalidateQueries({ queryKey: ['contact-list-members', selectedListId] })
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Import uygulanamadı'),
  })

  const downloadSample = async (format: 'csv' | 'xlsx') => {
    const res =
      format === 'csv' ? await contactListApi.sampleCsv() : await contactListApi.sampleXlsx()
    const type =
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    downloadBlob(new Blob([res.data], { type }), `kisi-listesi-ornek.${format}`)
  }

  const exportList = async (id: number, format: 'xlsx' | 'csv') => {
    const res = await contactListApi.exportList(id, format)
    const type =
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    downloadBlob(new Blob([res.data], { type }), `kisi-listesi-${id}.${format}`)
  }

  const exportImportResults = async () => {
    if (!selectedListId || !importId) return
    const res = await contactListApi.exportImportResults(selectedListId, importId)
    downloadBlob(
      new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `liste-import-sonuc-${importId}.xlsx`
    )
  }

  const memberDisplayName = (m: any) =>
    m.display_name ||
    String(m.company_name || '').trim() ||
    [m.first_name, m.last_name].filter(Boolean).join(' ').trim() ||
    'Ad bilgisi yok'

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dock text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni liste
          </button>
        </div>
        <input
          className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
          placeholder="Liste ara…"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
        />
        {isLoading ? (
          <p className="text-sm text-ink-soft flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
          </p>
        ) : (
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
            {lists.map((list: any) => (
              <li key={list.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedListId(list.id)
                    closeImportModal()
                  }}
                  className={`w-full text-left rounded-xl border p-3 text-sm transition ${
                    selectedListId === list.id
                      ? 'border-signal bg-signal/5'
                      : 'border-canvas-line hover:bg-canvas-soft'
                  }`}
                >
                  <p className="font-medium flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5" />
                    {list.name}
                  </p>
                  <p className="text-xs text-ink-faint mt-1">
                    {list.member_count || 0} üye · {list.valid_email_count || 0} e-posta ·{' '}
                    {list.valid_phone_count || 0} telefon · {list.permission_ok_count || 0} izinli
                  </p>
                </button>
              </li>
            ))}
            {lists.length === 0 && (
              <p className="text-sm text-ink-soft">
                Henüz liste yok. Barolar, Serbest Muhasebeciler gibi listeler oluşturabilirsiniz.
              </p>
            )}
          </ul>
        )}
      </aside>

      <section className="mc-panel p-4 space-y-4 min-h-[24rem]">
        {!selectedList ? (
          <p className="text-sm text-ink-soft">Detay için bir liste seçin veya yeni liste oluşturun.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{selectedList.name}</h2>
                {selectedList.description && (
                  <p className="text-sm text-ink-soft mt-1">{selectedList.description}</p>
                )}
                <p className="text-xs text-ink-faint mt-2">
                  {selectedList.member_count || 0} üye · Güncelleme:{' '}
                  {new Date(selectedList.updated_at).toLocaleString('tr-TR')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <FormatMenu
                  label="Dışa aktar"
                  options={[
                    {
                      label: 'Excel (.xlsx)',
                      onClick: () => void exportList(selectedList.id, 'xlsx'),
                    },
                    {
                      label: 'CSV (.csv)',
                      onClick: () => void exportList(selectedList.id, 'csv'),
                    },
                  ]}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-sm"
                  onClick={() => {
                    setShowImport(true)
                    setImportPreview(null)
                    setImportId(null)
                    setImportFile(null)
                    setImportMapping(EMPTY_MAPPING)
                  }}
                >
                  <Upload className="w-3.5 h-3.5" /> Excel/CSV yükle
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Kişiler silinmeyecek; yalnızca liste kaldırılacak. Devam edilsin mi?'
                      )
                    ) {
                      deleteMutation.mutate(selectedList.id)
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Listeyi sil
                </button>
              </div>
            </div>

            <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-y border-canvas-line space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[12rem]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-canvas-soft text-sm"
                    placeholder="Üye ara…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-canvas-line text-sm"
                >
                  <Users className="w-4 h-4" /> Kişi ekle
                </button>
                <label className="text-xs text-ink-soft inline-flex items-center gap-1">
                  Sayfa
                  <select
                    className="px-2 py-1.5 rounded-lg border border-canvas-line bg-white text-sm"
                    value={memberPageSize}
                    onChange={(e) =>
                      setMemberPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                    }
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                <span>
                  Toplam {memberTotal} sonuç · Sayfa {memberPage}/{memberTotalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={memberPage <= 1}
                    onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-canvas-line disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={memberPage >= memberTotalPages}
                    onClick={() => setMemberPage((p) => Math.min(memberTotalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-canvas-line disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {showAddMember && (
              <div className="rounded-xl border border-canvas-line p-3 space-y-2">
                <input
                  className="w-full px-3 py-2 rounded-lg bg-canvas-soft text-sm"
                  placeholder="Kişi ara…"
                  value={addContactSearch}
                  onChange={(e) => setAddContactSearch(e.target.value)}
                />
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {pickerContacts.map((c: any) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg hover:bg-canvas-soft"
                    >
                      <span>{c.display_name || c.company_name || 'Ad bilgisi yok'}</span>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-dock text-white"
                        onClick={() => addMembersMutation.mutate([c.id])}
                      >
                        Ekle
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="text-xs text-ink-faint" onClick={() => setShowAddMember(false)}>
                  Kapat
                </button>
              </div>
            )}

            {membersLoading ? (
              <p className="text-sm text-ink-soft">Üyeler yükleniyor…</p>
            ) : (
              <ul className="divide-y divide-canvas-line">
                {members.map((m: any) => (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      className="text-left hover:underline min-w-0"
                      onClick={() => onSelectContact?.(m.id)}
                    >
                      <p className="font-medium truncate">{memberDisplayName(m)}</p>
                      <p className="text-xs text-ink-faint truncate">
                        {m.email || '—'} · {m.phone || '—'}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 shrink-0"
                      onClick={() => {
                        if (
                          window.confirm(
                            `${memberDisplayName(m)} listeden çıkarılsın mı? Kişi silinmez; yalnızca liste üyeliği kaldırılır.`
                          )
                        ) {
                          removeMemberMutation.mutate(m.id)
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="py-4 text-sm text-ink-soft">Bu listede henüz üye yok.</li>
                )}
              </ul>
            )}
          </>
        )}

        {error && !showImport && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}
      </section>

      <OverlayModal open={showCreate} onClose={() => setShowCreate(false)} title="Yeni kişi listesi">
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm"
            placeholder="Liste adı (ör. Barolar)"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm min-h-[80px]"
            placeholder="Açıklama (opsiyonel)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
              onClick={() => setShowCreate(false)}
            >
              İptal
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-dock text-white text-sm"
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Oluştur
            </button>
          </div>
        </div>
      </OverlayModal>

      <OverlayModal
        open={showImport}
        onClose={closeImportModal}
        title="Excel/CSV ile liste yükle"
        wide
      >
        <div className="space-y-4">
          <FormatMenu
            label="Örnek şablon indir"
            options={[
              { label: 'Excel (.xlsx)', onClick: () => void downloadSample('xlsx') },
              { label: 'CSV (.csv)', onClick: () => void downloadSample('csv') },
            ]}
          />

          <label className="block text-sm">
            <span className="text-ink-soft">Dosya (.xlsx, .xls, .csv)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setImportFile(file)
                setImportPreview(null)
                setImportId(null)
              }}
            />
          </label>

          {importHeaders.length > 0 && (
            <p className="text-xs text-ink-soft">
              Dosya kolonları: {importHeaders.join(', ')}
            </p>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Kolon eşleştirme</p>
            <div className="grid md:grid-cols-2 gap-2">
              {MAPPING_FIELDS.map(({ key, label }) => (
                <label key={key} className="text-xs">
                  <span className="text-ink-faint">{label}</span>
                  <select
                    className="mt-1 w-full px-2 py-1.5 rounded-lg bg-white text-sm border border-canvas-line"
                    value={importMapping[key] || ''}
                    onChange={(e) =>
                      setImportMapping({ ...importMapping, [key]: e.target.value })
                    }
                  >
                    <option value="">— Seçin —</option>
                    {importHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => importFile && previewImportMutation.mutate(importFile)}
              disabled={!importFile || previewImportMutation.isPending}
              className="px-3 py-2 rounded-lg bg-canvas-soft text-sm inline-flex items-center gap-1"
            >
              {previewImportMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Önizle
            </button>
            <button
              type="button"
              onClick={() => applyImportMutation.mutate()}
              disabled={!importId || applyImportMutation.isPending}
              className="px-3 py-2 rounded-lg bg-dock text-white text-sm"
            >
              Listeye uygula
            </button>
            {importId && (
              <button
                type="button"
                onClick={() => void exportImportResults()}
                className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
              >
                Sonuç indir
              </button>
            )}
          </div>

          {importPreview?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <span className="rounded-lg bg-canvas-soft p-2">Toplam: {importPreview.summary.total_rows}</span>
              <span className="rounded-lg bg-canvas-soft p-2">Geçerli: {importPreview.summary.valid_rows}</span>
              <span className="rounded-lg bg-canvas-soft p-2">Geçersiz: {importPreview.summary.invalid_rows}</span>
              <span className="rounded-lg bg-canvas-soft p-2">Mükerrer: {importPreview.summary.duplicate_rows}</span>
              <span className="rounded-lg bg-canvas-soft p-2">
                Mevcut kişi: {importPreview.summary.existing_contacts}
              </span>
              <span className="rounded-lg bg-canvas-soft p-2">Yeni kişi: {importPreview.summary.new_contacts}</span>
            </div>
          )}

          {Array.isArray(importPreview?.rows) && importPreview.rows.length > 0 && (
            <div className="rounded-xl border border-canvas-line overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-canvas-soft sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5">Satır</th>
                      <th className="text-left px-2 py-1.5">Kurum / Kişi</th>
                      <th className="text-left px-2 py-1.5">E-posta</th>
                      <th className="text-left px-2 py-1.5">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.slice(0, 20).map((row: any) => (
                      <tr key={row.row_number} className="border-t border-canvas-line/60">
                        <td className="px-2 py-1.5">{row.row_number}</td>
                        <td className="px-2 py-1.5">{row.organization_name || '—'}</td>
                        <td className="px-2 py-1.5">{row.email || '—'}</td>
                        <td className="px-2 py-1.5">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
      </OverlayModal>
    </div>
  )
}
