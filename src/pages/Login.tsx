import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { WaveLines } from '@/components/WaveLines'
import { ApiError } from '@/lib/api'
import { useSession } from '@/store/auth'
import { Button, Checkbox, Icon, Input } from '@/ui'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-primary">
        <span className="h-4.5 w-1.5 rounded-[2px] bg-white" />
      </span>
      <span className="text-[15px] font-medium tracking-[0.08em]">INVENTUM</span>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const login = useSession((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Введите email и пароль')
    setBusy(true)
    try {
      await login(email, password, remember)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Нет связи с сервером')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full bg-surface lg:grid-cols-[1fr_1fr]">
      <div className="flex min-h-screen flex-col px-6 py-5 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-88.5 flex-1 flex-col justify-center pb-16">
          <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight">Войти в INVENTUM</h1>

          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              icon="mail"
              placeholder="name@inventum.uz"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              autoFocus
            />
            <Input
              label="Пароль"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              icon="lock"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              error={error}
              suffix={
                <button
                  type="button"
                  aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setShow((v) => !v)}
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-fg"
                >
                  <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
                </button>
              }
            />
            <Checkbox checked={remember} onChange={setRemember}>Запомнить меня на этом устройстве</Checkbox>
            <Button type="submit" size="lg" block disabled={busy}>{busy ? 'Входим…' : 'Войти'}</Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted">
            Забыли пароль или нет аккаунта? Обратитесь к владельцу центра.
          </p>

        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-linear-to-r from-primary-active/70 via-primary to-primary" />
        {/* Белые линии-волны; маска оставляет их яркими справа и растворяет к левому краю */}
        <WaveLines
          className="absolute inset-0 size-full"
          style={{
            maskImage: 'radial-gradient(circle at 75% 60%, #000 0%, #000 30%, transparent 68%)',
            WebkitMaskImage: 'radial-gradient(circle at 75% 60%, #000 0%, #000 30%, transparent 68%)',
          }}
        />
        <div className="absolute bottom-[22%] left-14 max-w-md text-white">
          <p className="mb-3 font-mono text-xs tracking-wide">INVENTUM CRM</p>
          <h2 className="text-[32px] leading-[1.15] font-semibold tracking-tight">Всё об учебном центре в одном месте.</h2>
          <p className="mt-3 text-white/85">Ученики, группы, посещаемость и оплаты — быстро и без лишних кликов.</p>
        </div>
      </div>
    </div>
  )
}
