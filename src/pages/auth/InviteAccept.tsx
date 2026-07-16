import { FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { invitesApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { APP_DISPLAY_NAME } from '../../config/app'

export default function InviteAccept() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: invite, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['invite-validate', token],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await invitesApi.validate(token)
      return res.data?.data
    },
    retry: false,
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await invitesApi.accept({
        token,
        password,
        name,
        email: email || invite?.email,
      })
      if (res.data?.token && res.data?.user) {
        setAuth(res.data.token, res.data.user)
        navigate('/')
      } else {
        setError('Davet kabul edilemedi')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Davet kabul edilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen mc-dot-grid flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="mc-panel mc-panel-asymmetric w-full max-w-md p-8 space-y-3"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-signal-deep">Davet</p>
        <h1 className="font-display text-2xl font-semibold text-ink">{APP_DISPLAY_NAME}</h1>
        {isLoading && <p className="text-sm text-ink-soft">Davet doğrulanıyor…</p>}
        {(isError || !invite) && !isLoading && (
          <p className="text-sm text-red-600">
            {(queryError as any)?.response?.data?.error || 'Geçersiz veya süresi dolmuş davet'}
          </p>
        )}
        {invite && (
          <>
            <p className="text-sm text-ink-soft">
              <strong>{invite.tenant_name}</strong> ekibine{' '}
              <strong>{invite.tenant_role}</strong> olarak davet edildiniz.
            </p>
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              placeholder="Ad soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              type="email"
              required
              placeholder="E-posta (davet ile aynı)"
              defaultValue={invite.email}
              value={email || invite.email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full px-3 py-2.5 rounded-xl bg-canvas-soft text-sm"
              type="password"
              required
              minLength={8}
              placeholder="Parola (min. 8)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-signal text-white text-sm disabled:opacity-50"
            >
              Daveti kabul et
            </button>
          </>
        )}
      </form>
    </div>
  )
}
