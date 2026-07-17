import { useEffect, useRef, useState } from 'react'

type Props = {
  html: string
  title?: string
}

/**
 * Isolated email HTML viewer: sandbox iframe + auto height.
 * Scripts/forms are blocked; links open in a new tab via base target.
 */
export default function EmailHtmlFrame({ html, title = 'E-posta içeriği' }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(120)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const resize = () => {
      try {
        const doc = iframe.contentDocument
        const body = doc?.body
        const htmlEl = doc?.documentElement
        if (!body) return
        const next = Math.max(
          body.scrollHeight,
          htmlEl?.scrollHeight || 0,
          body.offsetHeight,
          80
        )
        setHeight(Math.min(Math.max(next + 8, 80), 12000))
      } catch {
        /* cross-origin — ignore */
      }
    }

    iframe.addEventListener('load', resize)
    // Measure after paint in case load already fired
    const t = window.setTimeout(resize, 50)
    return () => {
      iframe.removeEventListener('load', resize)
      window.clearTimeout(t)
    }
  }, [html])

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-canvas-line/60 bg-white">
      <iframe
        ref={iframeRef}
        title={title}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={html}
        style={{ height }}
        className="w-full max-w-full border-0 block bg-white"
      />
    </div>
  )
}
