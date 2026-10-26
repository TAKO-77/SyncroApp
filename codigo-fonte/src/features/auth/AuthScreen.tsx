import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { LogoFilter } from '../../components/common'
const syncroLogo = new URL('../../assets/syncro-logo.png', import.meta.url).href

type Mode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6,10}$/
const MIN_PASSWORD = 8

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou palavra-passe incorretos.',
  user_already_exists: 'Já existe uma conta com este email. Inicia sessão.',
  weak_password: 'A palavra-passe é demasiado fraca.',
  otp_expired: 'O código expirou ou está incorreto. Pede um novo código.',
  over_email_send_rate_limit: 'Foram enviados demasiados emails. Tenta novamente daqui a alguns minutos.',
  over_request_rate_limit: 'Demasiadas tentativas. Aguarda um pouco e tenta novamente.',
}
function describe(error: { code?: string; message: string; name?: string }) {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]
  if (error.name === 'AuthRetryableFetchError') return 'Sem ligação ao servidor. Verifica a ligação à Internet.'
  return 'Não foi possível concluir o pedido. Tenta novamente.'
}

function EyeIcon({ off }: { off: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
}

const TITLES: Record<Mode, string> = { signin: 'Iniciar sessão', signup: 'Criar conta', confirm: 'Confirmar email', forgot: 'Recuperar palavra-passe', reset: 'Nova palavra-passe' }

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const go = (next: Mode, message = '') => { setMode(next); setError(''); setInfo(message); setCode(''); setShowPassword(false); if (next !== 'signin' && next !== 'signup') setPassword('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (mode !== 'reset' && !EMAIL.test(mail)) return setError('Indica um email válido.')
    if ((mode === 'signin' || mode === 'signup' || mode === 'reset') && password.length < MIN_PASSWORD) return setError(`A palavra-passe deve ter pelo menos ${MIN_PASSWORD} caracteres.`)
    if ((mode === 'confirm' || mode === 'reset') && !CODE.test(code.trim())) return setError('Indica o código recebido por email.')
    setBusy(true); setError('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (error?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: mail })
          return go('confirm', 'Confirma o teu email com o código que te enviámos.')
        }
        if (error) setError(describe(error))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password })
        if (error) setError(describe(error))
        else if (!data.session) go('confirm', `Enviámos um código para ${mail}.`)
      } else if (mode === 'confirm') {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'email' })
        if (error) setError(describe(error))
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(mail)
        if (error) setError(describe(error))
        else go('reset', `Se existir uma conta para ${mail}, vais receber um código.`)
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'recovery' })
        if (error) return setError(describe(error))
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) setError(describe(updateError))
      }
    } catch {
      setError('Sem ligação ao servidor. Verifica a ligação à Internet.')
    } finally { setBusy(false) }
  }

  const resend = async () => {
    setBusy(true); setError('')
    const mail = email.trim().toLowerCase()
    const { error } = mode === 'confirm' ? await supabase.auth.resend({ type: 'signup', email: mail }) : await supabase.auth.resetPasswordForEmail(mail)
    setBusy(false)
    if (error) setError(describe(error)); else setInfo('Enviámos um novo código.')
  }

  return <main className="auth">
    <LogoFilter />
    <form className="auth-card" onSubmit={submit} noValidate>
      <img className="auth-logo" src={syncroLogo} alt="Syncro" width={607} height={222} />
      <h2>{TITLES[mode]}</h2>
      {info && <p className="mu" role="status">{info}</p>}
      {mode !== 'reset' && <label>Email<input type="email" value={email} autoComplete="email" required autoFocus disabled={mode === 'confirm'} onChange={e => setEmail(e.target.value)} /></label>}
      {(mode === 'confirm' || mode === 'reset') && <label>Código<input value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={10} required autoFocus onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>}
      {(mode === 'signin' || mode === 'signup' || mode === 'reset') && <label>{mode === 'reset' ? 'Nova palavra-passe' : 'Palavra-passe'}<span className="auth-password">
        <input type={showPassword ? 'text' : 'password'} value={password} minLength={MIN_PASSWORD} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required onChange={e => setPassword(e.target.value)} />
        <button type="button" className="auth-eye" aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}><EyeIcon off={showPassword} /></button>
      </span></label>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Aguarda…' : { signin: 'Entrar', signup: 'Criar conta', confirm: 'Confirmar', forgot: 'Enviar código', reset: 'Guardar palavra-passe' }[mode]}</button>
      <div className="auth-links">
        {mode === 'signin' && <><button type="button" className="btn ghost" onClick={() => go('signup')}>Criar conta</button><button type="button" className="btn ghost" onClick={() => go('forgot')}>Esqueci-me da palavra-passe</button></>}
        {mode === 'signup' && <button type="button" className="btn ghost" onClick={() => go('signin')}>Já tenho conta</button>}
        {(mode === 'confirm' || mode === 'reset') && <button type="button" className="btn ghost" disabled={busy} onClick={() => void resend()}>Reenviar código</button>}
        {mode !== 'signin' && mode !== 'signup' && <button type="button" className="btn ghost" onClick={() => go('signin')}>Voltar</button>}
      </div>
    </form>
  </main>
}
