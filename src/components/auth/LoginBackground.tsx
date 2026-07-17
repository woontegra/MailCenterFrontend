/** Hafif teknolojik login arka planı — sade, abartısız */
export default function LoginBackground() {
  return (
    <div className="mc-login-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#eef2f6] via-[#f5f7fa] to-[#e4f0f2]" />
      <div className="absolute inset-0 mc-login-grid-fine opacity-50" />
      <div className="mc-login-glow mc-login-glow-a" />
      <div className="mc-login-glow mc-login-glow-b" />
      <div className="mc-login-stream mc-login-stream-1">
        <span className="mc-login-stream-dot" />
      </div>
      <div className="mc-login-stream mc-login-stream-2">
        <span className="mc-login-stream-dot mc-login-stream-dot-d2" />
      </div>
      <div className="absolute inset-0 mc-login-vignette" />
    </div>
  )
}
