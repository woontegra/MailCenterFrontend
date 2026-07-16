import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, Link2 } from 'lucide-react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

/**
 * Lightweight HTML editor without third-party packages.
 * Uses contentEditable + basic formatting commands only.
 */
export default function SimpleHtmlEditor({
  value,
  onChange,
  placeholder = 'Mesaj içeriği…',
  minHeight = '220px',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastExternal = useRef(value)

  useEffect(() => {
    if (!ref.current) return
    if (value !== lastExternal.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value || ''
      lastExternal.current = value
    }
  }, [value])

  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    if (ref.current) {
      const html = ref.current.innerHTML
      lastExternal.current = html
      onChange(html)
    }
  }

  return (
    <div className="rounded-xl border border-canvas-line bg-white overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-canvas-line bg-canvas-soft">
        <button type="button" className="p-1.5 rounded-lg hover:bg-white text-ink-soft" onClick={() => run('bold')} aria-label="Kalın">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className="p-1.5 rounded-lg hover:bg-white text-ink-soft" onClick={() => run('italic')} aria-label="İtalik">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" className="p-1.5 rounded-lg hover:bg-white text-ink-soft" onClick={() => run('underline')} aria-label="Altı çizili">
          <Underline className="w-4 h-4" />
        </button>
        <button type="button" className="p-1.5 rounded-lg hover:bg-white text-ink-soft" onClick={() => run('insertUnorderedList')} aria-label="Liste">
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-white text-ink-soft"
          onClick={() => {
            const url = window.prompt('Bağlantı URL')
            if (url) run('createLink', url)
          }}
          aria-label="Bağlantı"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        className="px-3 py-2.5 text-sm text-ink outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-ink-faint"
        style={{ minHeight }}
        onInput={() => {
          if (!ref.current) return
          const html = ref.current.innerHTML
          lastExternal.current = html
          onChange(html)
        }}
        suppressContentEditableWarning
      />
    </div>
  )
}
