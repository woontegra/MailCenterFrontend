import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Shield } from 'lucide-react'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { APP_DISPLAY_NAME, APP_TAGLINE } from '../../config/app'
import LoginBackground from '../../components/auth/LoginBackground'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await authApi.login(email, password)
      if (data.success) {
        setAuth(data.token, data.user)
        navigate('/')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LoginBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 sm:px-8 py-10 lg:py-14">
        <div className="w-full max-w-[1100px] grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_440px] gap-12 xl:gap-16 items-center">
          {/* Sol: sade marka alanı */}
          <section className="hidden lg:flex flex-col justify-center">
            <div className="mc-reveal max-w-lg">
              <div className="inline-flex items-center gap-3.5 mb-8">
                <div className="mc-login-logo-mark mc-login-logo-mark-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-ink tracking-tight">
                    {APP_DISPLAY_NAME}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-signal-deep font-medium mt-0.5">
                    {APP_TAGLINE}
                  </p>
                </div>
              </div>

              <h1 className="font-display text-[2.15rem] xl:text-[2.5rem] font-bold text-ink leading-[1.15] tracking-tight">
                E-posta, SMS ve WhatsApp
                <span className="mc-login-headline-accent"> tek merkezde</span>
              </h1>

              <p className="mt-5 text-base xl:text-lg text-ink-soft leading-relaxed">
                Gerçek zamanlı gelen kutusu, birleşik konuşmalar ve profesyonel gönderim
                altyapısı.
              </p>

              <div className="mt-8 flex items-center gap-2 text-sm text-ink-faint">
                <Shield className="w-4 h-4 text-signal/80" />
                <span>Çok kiracılı güvenli oturum · tenant izolasyonu</span>
              </div>
            </div>
          </section>

          {/* Sağ: form */}
          <section className="w-full flex flex-col items-center lg:items-stretch justify-center">
            <div className="lg:hidden mc-reveal text-center mb-8 relative z-20">
              <div className="inline-flex items-center justify-center mc-login-logo-mark mc-login-logo-mark-lg mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">{APP_DISPLAY_NAME}</h1>
              <p className="text-xs text-signal-deep font-medium tracking-widest uppercase mt-1">
                {APP_TAGLINE}
              </p>
            </div>

            <div className="mc-reveal mc-reveal-delay-1 w-full max-w-[420px] lg:max-w-none mx-auto relative z-20">
              <div className="mc-login-card">
                <div className="mb-7">
                  <h2 className="font-display text-xl xl:text-2xl font-bold text-ink">
                    Hoş geldiniz
                  </h2>
                  <p className="text-sm text-ink-soft mt-1.5">Hesabınıza giriş yapın</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3.5 bg-red-50 border border-red-200/90 rounded-xl" role="alert">
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="login-email" className="mc-login-label">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="mc-login-field-icon" aria-hidden />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mc-login-input mc-login-input-with-icon"
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="mc-login-label">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="mc-login-field-icon" aria-hidden />
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mc-login-input mc-login-input-with-icon"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="mc-login-submit w-full mt-1">
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>

                <div className="mt-7 pt-6 border-t border-canvas-line/80 text-center">
                  <p className="text-sm text-ink-soft">
                    Don&apos;t have an account?{' '}
                    <Link
                      to="/register"
                      className="font-semibold text-signal-deep hover:text-signal transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
