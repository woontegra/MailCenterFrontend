import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Forbidden() {
  return (
    <div className="mc-shell pt-8 pb-12 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="mc-panel mc-panel-asymmetric p-10 max-w-md text-center">
        <ShieldOff className="w-12 h-12 text-signal mx-auto mb-4" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep mb-2">403</p>
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Yetkisiz erişim</h1>
        <p className="text-sm text-ink-soft mb-6">
          Bu sayfayı görüntülemek için gerekli yetkiniz yok. Farklı bir hesapla giriş yapın veya
          yöneticinizden yetki isteyin. Bu ekran ana sayfaya sessiz yönlendirme yapmaz.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/channels"
            className="inline-flex px-4 py-2.5 rounded-xl border border-canvas-line text-sm hover:bg-canvas-soft"
          >
            Kanal Bağlantıları
          </Link>
          <Link
            to="/"
            className="inline-flex px-4 py-2.5 rounded-xl bg-dock text-white text-sm hover:bg-dock-raised"
          >
            Akışa dön
          </Link>
        </div>
      </div>
    </div>
  )
}
