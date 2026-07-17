import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  GripVertical,
  Monitor,
  Save,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import {
  BLOCK_LABELS,
  type BlockType,
  type EditorDocument,
  type EmailBlock,
  type TemplateKind,
  TEMPLATE_VARIABLES,
  PREVIEW_SAMPLE_VALUES,
} from '../../types/emailTemplate'
import {
  applyBrandToDocument,
  createBlock,
  createStarterDocument,
  hasBulkCompliance,
  moveBlock,
} from '../../utils/emailBlockDefaults'
import { brandApi, templateApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import TemplateImageUpload from './TemplateImageUpload'

type Props = {
  templateId?: number
}

const PALETTE: BlockType[] = [
  'heading',
  'text',
  'image',
  'logo',
  'button',
  'divider',
  'spacer',
  'columns1',
  'columns2',
  'columns3',
  'social',
  'company_info',
  'unsubscribe',
  'footer',
]

function BlockPreview({ block }: { block: EmailBlock }) {
  const p = block.props
  switch (block.type) {
    case 'heading':
      return <p className="font-semibold text-ink truncate">{String(p.text || 'Başlık')}</p>
    case 'text':
      return <p className="text-sm text-ink-soft line-clamp-2">{String(p.text || '')}</p>
    case 'image':
    case 'logo':
      return p.src ? (
        <img
          src={String(p.src)}
          alt={String(p.alt || block.type === 'logo' ? 'Logo' : 'Görsel')}
          className="max-h-16 max-w-full object-contain rounded"
        />
      ) : (
        <div className="text-xs text-ink-faint">{block.type === 'logo' ? 'Logo eklenmedi' : 'Görsel eklenmedi'}</div>
      )
    case 'button':
      return (
        <span className="inline-block px-3 py-1 rounded text-xs text-white" style={{ background: String(p.bgColor || '#1a2332') }}>
          {String(p.text || 'Buton')}
        </span>
      )
    default:
      return <p className="text-xs text-ink-faint">{BLOCK_LABELS[block.type]}</p>
  }
}

export default function EmailTemplateEditor({ templateId }: Props) {
  const navigate = useNavigate()
  const canManage = useAuthStore((s) => s.hasPermission('TEMPLATE_MANAGE'))
  const [loading, setLoading] = useState(Boolean(templateId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('Yeni e-posta şablonu')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [brandId, setBrandId] = useState('')
  const [isDraft, setIsDraft] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [templateKind, setTemplateKind] = useState<TemplateKind>('INDIVIDUAL')
  const [doc, setDoc] = useState<EditorDocument>(() => createStarterDocument())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [fullscreen, setFullscreen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [bulkWarning, setBulkWarning] = useState('')
  const [advancedUrlOpen, setAdvancedUrlOpen] = useState(false)

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandApi.list()).data,
  })

  const selectedBrand = useMemo(
    () => brands.find((b: any) => String(b.id) === brandId) || null,
    [brands, brandId]
  )

  const selectedBlock = useMemo(
    () => doc.blocks.find((b) => b.id === selectedId) || null,
    [doc.blocks, selectedId]
  )

  const compilePreview = useCallback(async () => {
    try {
      const res = await templateApi.compile({
        editor_json: doc,
        subject,
        preheader,
      })
      let html = res.data?.data?.html || ''
      for (const [key, value] of Object.entries(PREVIEW_SAMPLE_VALUES)) {
        html = html.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
      }
      setPreviewHtml(html)
    } catch {
      setPreviewHtml('<p style="padding:16px;color:#64748b;">Önizleme yüklenemedi</p>')
    }
  }, [doc, subject, preheader])

  useEffect(() => {
    const t = setTimeout(() => void compilePreview(), 350)
    return () => clearTimeout(t)
  }, [compilePreview])

  useEffect(() => {
    if (templateKind !== 'BULK') {
      setBulkWarning('')
      return
    }
    const check = hasBulkCompliance(doc.blocks)
    setBulkWarning(check.ok ? '' : `Toplu gönderim için eksik: ${check.missing.join(', ')}`)
  }, [doc.blocks, templateKind])

  useEffect(() => {
    if (!templateId) return
    setLoading(true)
    templateApi
      .get(templateId)
      .then((res) => {
        const tpl = res.data?.data
        if (!tpl) throw new Error('Şablon bulunamadı')
        setName(tpl.name || '')
        setDescription(tpl.description || '')
        setSubject(tpl.subject || '')
        setPreheader(tpl.preheader || '')
        setBrandId(tpl.brand_id ? String(tpl.brand_id) : '')
        setIsDraft(tpl.is_draft !== false)
        setIsActive(tpl.is_active !== false)
        setTemplateKind(tpl.template_kind === 'BULK' ? 'BULK' : 'INDIVIDUAL')
        if (tpl.editor_json && Array.isArray(tpl.editor_json.blocks)) {
          setDoc(tpl.editor_json as EditorDocument)
        } else if (tpl.content) {
          setDoc({
            version: 1,
            blocks: [createBlock('text', { text: 'Legacy HTML şablon — blok editörüne aktarın veya yeniden oluşturun.' })],
            settings: { contentWidth: 600 },
          })
        }
      })
      .catch((err: any) => setError(err.response?.data?.error || 'Şablon yüklenemedi'))
      .finally(() => setLoading(false))
  }, [templateId])

  const updateBlock = (id: string, patch: Record<string, unknown>) => {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)),
    }))
  }

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    setDoc((prev) => ({ ...prev, blocks: [...prev.blocks, block] }))
    setSelectedId(block.id)
  }

  const removeBlock = (id: string) => {
    setDoc((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }))
    if (selectedId === id) setSelectedId(null)
  }

  const duplicateBlock = (id: string) => {
    setDoc((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const src = prev.blocks[idx]
      const copy: EmailBlock = {
        ...structuredClone(src),
        id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
      const blocks = [...prev.blocks]
      blocks.splice(idx + 1, 0, copy)
      return { ...prev, blocks }
    })
  }

  const save = async () => {
    if (!canManage) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name,
        description: description || null,
        subject,
        preheader: preheader || null,
        brand_id: brandId ? Number(brandId) : null,
        channel_type: 'EMAIL',
        editor_json: doc,
        is_draft: isDraft,
        is_active: isActive,
        template_kind: templateKind,
        is_shared: true,
      }
      if (templateId) {
        await templateApi.update(templateId, payload)
      } else {
        const res = await templateApi.create(payload)
        const id = res.data?.data?.id
        if (id) {
          navigate(`/templates/${id}/edit`, { replace: true })
        }
      }
      setNotice('Şablon kaydedildi')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (key: string) => {
    if (!selectedBlock || !['heading', 'text', 'button', 'footer', 'unsubscribe', 'company_info'].includes(selectedBlock.type)) return
    const field =
      selectedBlock.type === 'button'
        ? 'text'
        : selectedBlock.type === 'company_info'
          ? 'companyName'
          : 'text'
    const current = String(selectedBlock.props[field] || '')
    updateBlock(selectedBlock.id, { [field]: `${current}{{${key}}}` })
  }

  if (loading) {
    return <div className="p-8 text-ink-soft">Şablon yükleniyor…</div>
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col min-h-0 bg-canvas-soft/30">
      <header className="shrink-0 border-b border-canvas-line bg-white px-4 py-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate('/templates')} className="text-sm text-ink-soft hover:text-ink">
          ← Şablonlar
        </button>
        <input
          className="flex-1 min-w-[12rem] px-3 py-2 rounded-lg border border-canvas-line text-sm font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-lg border border-canvas-line text-sm"
          value={brandId}
          onChange={(e) => {
            const nextBrandId = e.target.value
            setBrandId(nextBrandId)
            const brand = brands.find((b: any) => String(b.id) === nextBrandId)
            if (brand) {
              setDoc((prev) =>
                applyBrandToDocument(prev, {
                  name: brand.name,
                  logo_url: brand.logo_url,
                  accent_color: brand.accent_color,
                  domain: brand.domain,
                  contact_email: brand.contact_email,
                })
              )
            }
          }}
        >
          <option value="">Marka seçin</option>
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select className="px-3 py-2 rounded-lg border border-canvas-line text-sm" value={templateKind} onChange={(e) => setTemplateKind(e.target.value as TemplateKind)}>
          <option value="INDIVIDUAL">Bireysel</option>
          <option value="BULK">Toplu gönderim</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} />
          Taslak
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Aktif
        </label>
        {canManage && (
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm">
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        )}
      </header>

      {(error || notice || bulkWarning) && (
        <div className={`shrink-0 px-4 py-2 text-sm ${error ? 'bg-red-50 text-red-600' : bulkWarning ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {error || bulkWarning || notice}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_280px]">
        {/* Palette */}
        <aside className="border-r border-canvas-line bg-white p-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Bloklar</p>
          <div className="space-y-1">
            {PALETTE.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="w-full text-left px-2.5 py-2 rounded-lg text-sm hover:bg-canvas-soft border border-transparent hover:border-canvas-line"
              >
                {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas + preview */}
        <main className="min-h-0 flex flex-col overflow-hidden">
          <div className="shrink-0 px-4 py-2 border-b border-canvas-line bg-white flex flex-wrap gap-2 items-center">
            <input className="flex-1 min-w-[10rem] px-2 py-1.5 rounded border border-canvas-line text-sm" placeholder="E-posta konusu" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <input className="flex-1 min-w-[10rem] px-2 py-1.5 rounded border border-canvas-line text-sm" placeholder="Ön izleme metni (preheader)" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
            <button type="button" onClick={() => setPreviewMode('desktop')} className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-canvas-soft' : ''}`}><Monitor className="w-4 h-4" /></button>
            <button type="button" onClick={() => setPreviewMode('mobile')} className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-canvas-soft' : ''}`}><Smartphone className="w-4 h-4" /></button>
            <button type="button" onClick={() => setFullscreen(true)} className="p-2 rounded"><Eye className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2">
            <div className="overflow-y-auto p-3 space-y-2 border-r border-canvas-line">
              {doc.blocks.map((block, index) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) setDoc((prev) => ({ ...prev, blocks: moveBlock(prev.blocks, dragIndex, index) }))
                    setDragIndex(null)
                  }}
                  className={`rounded-lg border p-3 cursor-pointer ${selectedId === block.id ? 'border-signal bg-signal/5' : 'border-canvas-line bg-white hover:border-canvas-line/80'}`}
                  onClick={() => setSelectedId(block.id)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase text-ink-faint mb-1">{BLOCK_LABELS[block.type]}</p>
                      <BlockPreview block={block} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" className="p-1 hover:bg-canvas-soft rounded" onClick={(e) => { e.stopPropagation(); setDoc((prev) => ({ ...prev, blocks: moveBlock(prev.blocks, index, index - 1) })) }}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" className="p-1 hover:bg-canvas-soft rounded" onClick={(e) => { e.stopPropagation(); setDoc((prev) => ({ ...prev, blocks: moveBlock(prev.blocks, index, index + 1) })) }}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button type="button" className="p-1 hover:bg-canvas-soft rounded" onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id) }}><Copy className="w-3.5 h-3.5" /></button>
                      <button type="button" className="p-1 hover:bg-red-50 text-red-500 rounded" onClick={(e) => { e.stopPropagation(); removeBlock(block.id) }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-y-auto p-4 bg-canvas-soft/40 flex justify-center">
              <div className={`bg-white shadow-sm border border-canvas-line ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[640px]'}`}>
                <iframe title="Önizleme" srcDoc={previewHtml} className="w-full min-h-[480px] border-0" sandbox="allow-same-origin" />
              </div>
            </div>
          </div>
        </main>

        {/* Settings */}
        <aside className="border-l border-canvas-line bg-white p-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Blok ayarları</p>
          {!selectedBlock ? (
            <p className="text-sm text-ink-soft">Düzenlemek için bir blok seçin.</p>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs text-ink-soft">
                Hizalama
                <select className="mt-1 w-full px-2 py-1.5 rounded border border-canvas-line text-sm" value={String(selectedBlock.props.align || 'left')} onChange={(e) => updateBlock(selectedBlock.id, { align: e.target.value })}>
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                </select>
              </label>
              {['heading', 'text', 'button', 'footer'].includes(selectedBlock.type) && (
                <label className="block text-xs text-ink-soft">
                  Metin
                  <textarea className="mt-1 w-full px-2 py-1.5 rounded border border-canvas-line text-sm min-h-[80px]" value={String(selectedBlock.props.text || '')} onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })} />
                </label>
              )}
              {['image', 'logo'].includes(selectedBlock.type) && (
                <>
                  <div>
                    <p className="text-xs text-ink-soft mb-2">
                      {selectedBlock.type === 'logo' ? 'Logo' : 'Görsel'}
                    </p>
                    <TemplateImageUpload
                      src={String(selectedBlock.props.src || '')}
                      mediaAssetId={
                        selectedBlock.props.mediaAssetId != null
                          ? Number(selectedBlock.props.mediaAssetId)
                          : undefined
                      }
                      originalFileName={String(selectedBlock.props.originalFileName || '')}
                      brandId={brandId || undefined}
                      disabled={!canManage}
                      onUploaded={(result) =>
                        updateBlock(selectedBlock.id, {
                          src: result.publicUrl,
                          mediaAssetId: result.mediaAssetId,
                          originalFileName: result.originalFileName,
                          logoSource: selectedBlock.type === 'logo' ? 'upload' : undefined,
                        })
                      }
                      onClear={() =>
                        updateBlock(selectedBlock.id, {
                          src: '',
                          mediaAssetId: null,
                          originalFileName: '',
                          logoSource: selectedBlock.type === 'logo' ? 'brand' : undefined,
                        })
                      }
                    />
                  </div>

                  {selectedBlock.type === 'logo' && selectedBrand?.logo_url && (
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() =>
                        updateBlock(selectedBlock.id, {
                          src: selectedBrand.logo_url,
                          logoSource: 'brand',
                          mediaAssetId: null,
                          originalFileName: '',
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-canvas-line text-xs text-left hover:bg-canvas-soft disabled:opacity-50"
                    >
                      Marka logosunu kullan
                    </button>
                  )}

                  <label className="block text-xs text-ink-soft">
                    Genişlik (px)
                    <select
                      className="mt-1 w-full px-2 py-1.5 rounded border border-canvas-line text-sm"
                      value={String(selectedBlock.props.width || (selectedBlock.type === 'logo' ? 160 : 560))}
                      onChange={(e) => updateBlock(selectedBlock.id, { width: Number(e.target.value) })}
                    >
                      {selectedBlock.type === 'logo' ? (
                        <>
                          <option value="80">80 px</option>
                          <option value="120">120 px</option>
                          <option value="160">160 px</option>
                          <option value="200">200 px</option>
                          <option value="240">240 px</option>
                        </>
                      ) : (
                        <>
                          <option value="280">280 px</option>
                          <option value="420">420 px</option>
                          <option value="560">560 px</option>
                        </>
                      )}
                    </select>
                  </label>

                  {selectedBlock.type === 'image' && (
                    <>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedBlock.props.fullWidth)}
                          onChange={(e) =>
                            updateBlock(selectedBlock.id, { fullWidth: e.target.checked })
                          }
                        />
                        Tam genişlik
                      </label>
                      <label className="block text-xs text-ink-soft">
                        Tıklanınca gidilecek bağlantı
                        <input
                          className="mt-1 w-full px-2 py-1.5 rounded border text-sm"
                          value={String(selectedBlock.props.link || '')}
                          onChange={(e) => updateBlock(selectedBlock.id, { link: e.target.value })}
                          placeholder="https://"
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-xs text-ink-soft">
                    Alt metin
                    <input
                      className="mt-1 w-full px-2 py-1.5 rounded border text-sm"
                      value={String(selectedBlock.props.alt || '')}
                      onChange={(e) => updateBlock(selectedBlock.id, { alt: e.target.value })}
                    />
                  </label>

                  <div>
                    <button
                      type="button"
                      onClick={() => setAdvancedUrlOpen((v) => !v)}
                      className="text-xs text-signal-deep hover:underline"
                    >
                      {advancedUrlOpen ? 'URL ile eklemeyi gizle' : 'URL ile ekle (gelişmiş)'}
                    </button>
                    {advancedUrlOpen && (
                      <label className="block text-xs text-ink-soft mt-2">
                        Görsel URL
                        <input
                          className="mt-1 w-full px-2 py-1.5 rounded border text-sm"
                          value={String(selectedBlock.props.src || '')}
                          onChange={(e) =>
                            updateBlock(selectedBlock.id, {
                              src: e.target.value,
                              logoSource: selectedBlock.type === 'logo' ? 'url' : undefined,
                              mediaAssetId: null,
                            })
                          }
                          placeholder="https://"
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
              {selectedBlock.type === 'button' && (
                <label className="block text-xs text-ink-soft">Bağlantı<input className="mt-1 w-full px-2 py-1.5 rounded border text-sm" value={String(selectedBlock.props.url || '')} onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })} /></label>
              )}
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={Boolean(selectedBlock.hiddenOnMobile)} onChange={(e) => setDoc((prev) => ({ ...prev, blocks: prev.blocks.map((b) => b.id === selectedBlock.id ? { ...b, hiddenOnMobile: e.target.checked } : b) }))} />
                Mobilde gizle
              </label>
              <div>
                <p className="text-xs text-ink-soft mb-1">Değişken ekle</p>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button key={v.key} type="button" className="px-2 py-1 rounded bg-canvas-soft text-[11px]" onClick={() => insertVariable(v.key)}>
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="mt-6">
            <label className="block text-xs text-ink-soft">Açıklama<textarea className="mt-1 w-full px-2 py-1.5 rounded border text-sm min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          </div>
        </aside>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b">
              <span className="font-medium">Tam ekran önizleme</span>
              <button type="button" onClick={() => setFullscreen(false)}><X className="w-5 h-5" /></button>
            </div>
            <iframe title="Tam ekran" srcDoc={previewHtml} className="flex-1 w-full border-0" sandbox="allow-same-origin" />
          </div>
        </div>
      )}
    </div>
  )
}
