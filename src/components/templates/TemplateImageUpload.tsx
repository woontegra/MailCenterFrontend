import { DragEvent, useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { templateMediaApi } from '../../services/api'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const MAX_MB = 2

export type TemplateMediaUploadResult = {
  publicUrl: string
  mediaAssetId: number
  originalFileName: string
}

type Props = {
  src: string
  mediaAssetId?: number
  originalFileName?: string
  brandId?: string
  disabled?: boolean
  onUploaded: (result: TemplateMediaUploadResult) => void
  onClear: () => void
}

function formatBytes(size?: number) {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function TemplateImageUpload({
  src,
  mediaAssetId,
  originalFileName,
  brandId,
  disabled,
  onUploaded,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lastSize, setLastSize] = useState<number | undefined>()

  const uploadFile = useCallback(
    async (file: File) => {
      setError('')
      setUploading(true)
      try {
        const res = await templateMediaApi.upload(file, brandId ? Number(brandId) : undefined)
        const data = res.data?.data
        if (!data?.publicUrl) {
          throw new Error('Yükleme yanıtı geçersiz')
        }
        setLastSize(data.sizeBytes)
        onUploaded({
          publicUrl: data.publicUrl,
          mediaAssetId: data.id,
          originalFileName: data.originalFileName || file.name,
        })
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Görsel yüklenemedi')
      } finally {
        setUploading(false)
        setDragOver(false)
      }
    },
    [brandId, onUploaded]
  )

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file || disabled || uploading) return
    void uploadFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    handleFiles(e.dataTransfer.files)
  }

  if (src) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-canvas-line bg-canvas-soft/40 p-2">
          <img
            src={src}
            alt="Önizleme"
            className="max-h-28 w-auto max-w-full mx-auto object-contain rounded"
          />
        </div>
        {(originalFileName || mediaAssetId) && (
          <p className="text-[11px] text-ink-faint truncate">
            {originalFileName || 'Yüklenen görsel'}
            {lastSize ? ` · ${formatBytes(lastSize)}` : ''}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-canvas-line text-xs hover:bg-canvas-soft disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Görseli değiştir
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Görseli kaldır
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-signal bg-signal/5'
            : 'border-canvas-line bg-canvas-soft/30 hover:border-signal/40 hover:bg-canvas-soft/50'
        } ${disabled || uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-ink-soft">
            <Loader2 className="w-8 h-8 animate-spin text-signal" />
            <p className="text-sm">Yükleniyor…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-8 h-8 text-ink-faint" />
            <p className="text-sm font-medium text-ink">Bilgisayardan yükle</p>
            <p className="text-xs text-ink-soft">Sürükleyip bırakın veya dosya seçin</p>
            <p className="text-[11px] text-ink-faint">PNG, JPG, WEBP, GIF · en fazla {MAX_MB} MB</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-canvas-line text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5" />
              Dosya seç
            </button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
