import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
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

export default function ContactListsPanel({ onSelectContact }: Props) {
  const queryClient = useQueryClient()
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [error, setError] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importId, setImportId] = useState<number | null>(null)
  const [importMapping, setImportMapping] = useState({
    organization_name: 'Kurum / Kişi adı',
    contact_name: 'Yetkili adı',
    email: 'E-posta',
    phone: 'Telefon',
    city: 'Şehir',
    notes: 'Not',
    email_permission: 'E-posta izni',
    whatsapp_permission: 'WhatsApp izni',
  })
  const [addContactSearch, setAddContactSearch] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['contact-lists', listSearch],
    queryFn: async () => {
      const res = await contactListApi.list({ q: listSearch || undefined })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

  const { data: members = [], isFetching: membersLoading } = useQuery({
    queryKey: ['contact-list-members', selectedListId, memberSearch],
    enabled: Boolean(selectedListId),
    queryFn: async () => {
      const res = await contactListApi.members(selectedListId!, {
        q: memberSearch || undefined,
        limit: 100,
      })
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
  })

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
    mutationFn: async () => {
      if (!selectedListId || !importFile) throw new Error('Dosya ve liste gerekli')
      const fd = new FormData()
      fd.append('file', importFile)
      fd.append('mapping', JSON.stringify(importMapping))
      return contactListApi.previewImport(selectedListId, fd)
    },
    onSuccess: (res) => {
      setImportPreview(res.data?.data)
      setImportId(res.data?.data?.import_id || null)
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Önizleme alınamadı'),
  })

  const applyImportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedListId || !importId) throw new Error('Önce önizleme yapın')
      return contactListApi.applyImport(selectedListId, importId)
    },
    onSuccess: () => {
      setShowImport(false)
      setImportFile(null)
      setImportPreview(null)
      setImportId(null)
      void queryClient.invalidateQueries({ queryKey: ['contact-list-members', selectedListId] })
      void queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
    },
  })

  const downloadSample = async () => {
    const res = await contactListApi.sampleCsv()
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kisi-listesi-ornek.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportList = async (id: number) => {
    const res = await contactListApi.exportList(id)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kisi-listesi-${id}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportImportResults = async () => {
    if (!selectedListId || !importId) return
    const res = await contactListApi.exportImportResults(selectedListId, importId)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `liste-import-sonuc-${importId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

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
                    setShowImport(false)
                    setImportPreview(null)
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
              <p className="text-sm text-ink-soft">Henüz liste yok. Barolar, Serbest Muhasebeciler gibi listeler oluşturabilirsiniz.</p>
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
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-sm"
                  onClick={() => void exportList(selectedList.id)}
                >
                  <Download className="w-3.5 h-3.5" /> Dışa aktar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-canvas-line text-sm"
                  onClick={() => {
                    setShowImport(true)
                    setImportPreview(null)
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

            {showImport && (
              <div className="rounded-xl border border-canvas-line p-3 space-y-3 bg-canvas-soft/40">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void downloadSample()} className="text-xs px-3 py-2 rounded-lg border border-canvas-line inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Örnek dosya
                  </button>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" className="text-sm" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                <div className="grid md:grid-cols-2 gap-2">
                  {Object.entries(importMapping).map(([key, val]) => (
                    <label key={key} className="text-xs">
                      <span className="text-ink-faint">{key}</span>
                      <input
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-white text-sm"
                        value={val}
                        onChange={(e) => setImportMapping({ ...importMapping, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => previewImportMutation.mutate()} disabled={!importFile || previewImportMutation.isPending} className="px-3 py-2 rounded-lg bg-canvas-soft text-sm">
                    Önizle
                  </button>
                  <button type="button" onClick={() => applyImportMutation.mutate()} disabled={!importId || applyImportMutation.isPending} className="px-3 py-2 rounded-lg bg-dock text-white text-sm">
                    Listeye uygula
                  </button>
                  {importId && (
                    <button type="button" onClick={() => void exportImportResults()} className="px-3 py-2 rounded-lg border border-canvas-line text-sm">
                      Sonuç indir
                    </button>
                  )}
                </div>
                {importPreview?.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <span className="rounded-lg bg-white p-2">Toplam: {importPreview.summary.total_rows}</span>
                    <span className="rounded-lg bg-white p-2">Geçerli: {importPreview.summary.valid_rows}</span>
                    <span className="rounded-lg bg-white p-2">Geçersiz: {importPreview.summary.invalid_rows}</span>
                    <span className="rounded-lg bg-white p-2">Mükerrer: {importPreview.summary.duplicate_rows}</span>
                    <span className="rounded-lg bg-white p-2">Mevcut kişi: {importPreview.summary.existing_contacts}</span>
                    <span className="rounded-lg bg-white p-2">Yeni kişi: {importPreview.summary.new_contacts}</span>
                  </div>
                )}
              </div>
            )}

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
              <button type="button" onClick={() => setShowAddMember(true)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-canvas-line text-sm">
                <Users className="w-4 h-4" /> Kişi ekle
              </button>
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
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg hover:bg-canvas-soft">
                      <span>{c.display_name || c.company_name}</span>
                      <button type="button" className="text-xs px-2 py-1 rounded bg-dock text-white" onClick={() => addMembersMutation.mutate([c.id])}>
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
                    <button type="button" className="text-left hover:underline" onClick={() => onSelectContact?.(m.id)}>
                      <p className="font-medium">{[m.first_name, m.last_name].filter(Boolean).join(' ') || m.company_name || 'İsimsiz'}</p>
                      <p className="text-xs text-ink-faint">{m.email || '—'} · {m.phone || '—'}</p>
                    </button>
                    <button type="button" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={() => removeMemberMutation.mutate(m.id)}>
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {members.length === 0 && <li className="py-4 text-sm text-ink-soft">Bu listede henüz üye yok.</li>}
              </ul>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="mc-panel p-5 w-full max-w-md space-y-3">
              <h3 className="font-medium">Yeni kişi listesi</h3>
              <input className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm" placeholder="Liste adı (ör. Barolar)" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              <textarea className="w-full px-3 py-2 rounded-xl bg-canvas-soft text-sm min-h-[80px]" placeholder="Açıklama (opsiyonel)" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-3 py-2 rounded-lg border border-canvas-line text-sm" onClick={() => setShowCreate(false)}>İptal</button>
                <button type="button" className="px-3 py-2 rounded-lg bg-dock text-white text-sm" disabled={!createName.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
