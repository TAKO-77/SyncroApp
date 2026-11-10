import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { refreshPush } from '../../lib/push'
import { LogoFilter } from '../../components/common'
import { useT } from '../../lib/i18n/useT'
import type { MessageKey, Translator } from '../../lib/i18n/translate'
const syncroLogo = new URL('../../assets/syncro-logo.png', import.meta.url).href

type Mode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE = /^\d{6,10}$/
const MIN_PASSWORD = 8

const MESSAGES: Record<string, MessageKey> = {
  invalid_credentials: 'auth.err.invalid_credentials',
  user_already_exists: 'auth.err.user_already_exists',
  weak_password: 'auth.err.weak_password',
  otp_expired: 'auth.err.otp_expired',
  over_email_send_rate_limit: 'auth.err.over_email_send_rate_limit',
  over_request_rate_limit: 'auth.err.over_request_rate_limit',
}
function describe(t: Translator['t'], error: { code?: string; message: string; name?: string }) {
  if (error.code && MESSAGES[error.code]) return t(MESSAGES[error.code])
  if (error.name === 'AuthRetryableFetchError') return t('auth.err.network')
  return t('auth.err.generic')
}

function EyeIcon({ off }: { off: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
}

const TITLES: Record<Mode, MessageKey> = { signin: 'auth.title.signin', signup: 'auth.title.signup', confirm: 'auth.title.confirm', forgot: 'auth.title.forgot', reset: 'auth.title.reset' }
const SUBMIT: Record<Mode, MessageKey> = { signin: 'auth.submit.signin', signup: 'auth.submit.signup', confirm: 'auth.submit.confirm', forgot: 'auth.submit.forgot', reset: 'auth.submit.reset' }

export function AuthScreen() {
  const { t } = useT()
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
    if (mode !== 'reset' && !EMAIL.test(mail)) return setError(t('auth.err.email'))
    if ((mode === 'signin' || mode === 'signup' || mode === 'reset') && password.length < MIN_PASSWORD) return setError(t('auth.err.passwordLength', { n: MIN_PASSWORD }))
    if ((mode === 'confirm' || mode === 'reset') && !CODE.test(code.trim())) return setError(t('auth.err.code'))
    setBusy(true); setError('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (error?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: mail })
          return go('confirm', t('auth.info.confirm'))
        }
        if (error) setError(describe(t, error))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password })
        if (error) setError(describe(t, error))
        else if (!data.session) go('confirm', t('auth.info.codeSent', { email: mail }))
      } else if (mode === 'confirm') {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'email' })
        if (error) setError(describe(t, error))
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(mail)
        if (error) setError(describe(t, error))
        else go('reset', t('auth.info.resetSent', { email: mail }))
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: mail, token: code.trim(), type: 'recovery' })
        if (error) return setError(describe(t, error))
        const { data: updated, error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) setError(describe(t, updateError))
        else {
          // A reset means the old password may be compromised: end the other sessions and drop every push subscription;
          // this device registers again right away. None of it may block the reset.
          try { await supabase.auth.signOut({ scope: 'others' }) } catch { /* ignore */ }
          try { if (updated.user) await supabase.from('push_subscriptions').delete().eq('user_id', updated.user.id) } catch { /* ignore */ }
          try { await refreshPush() } catch { /* ignore */ }
        }
      }
    } catch {
      setError(t('auth.err.network'))
    } finally { setBusy(false) }
  }

  const resend = async () => {
    setBusy(true); setError('')
    const mail = email.trim().toLowerCase()
    const { error } = mode === 'confirm' ? await supabase.auth.resend({ type: 'signup', email: mail }) : await supabase.auth.resetPasswordForEmail(mail)
    setBusy(false)
    if (error) setError(describe(t, error)); else setInfo(t('auth.info.resent'))
  }

  return <main className="auth">
    <LogoFilter />
    <form className="auth-card" onSubmit={submit} noValidate>
      <img className="auth-logo" src={syncroLogo} alt="Syncro" width={607} height={222} />
      <h2>{t(TITLES[mode])}</h2>
      {info && <p className="mu" role="status">{info}</p>}
      {mode !== 'reset' && <label>{t('auth.email')}<input type="email" value={email} autoComplete="email" required autoFocus disabled={mode === 'confirm'} onChange={e => setEmail(e.target.value)} /></label>}
      {(mode === 'confirm' || mode === 'reset') && <label>{t('auth.code')}<input value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={10} required autoFocus onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>}
      {(mode === 'signin' || mode === 'signup' || mode === 'reset') && <label>{t(mode === 'reset' ? 'auth.newPassword' : 'auth.password')}<span className="auth-password">
        <input type={showPassword ? 'text' : 'password'} value={password} minLength={MIN_PASSWORD} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required onChange={e => setPassword(e.target.value)} />
        <button type="button" className="auth-eye" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} title={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}><EyeIcon off={showPassword} /></button>
      </span></label>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="btn pri" type="submit" disabled={busy}>{busy ? t('auth.busy') : t(SUBMIT[mode])}</button>
      <div className="auth-links">
        {mode === 'signin' && <><button type="button" className="btn ghost" onClick={() => go('signup')}>{t('auth.submit.signup')}</button><button type="button" className="btn ghost" onClick={() => go('forgot')}>{t('auth.forgotLink')}</button></>}
        {mode === 'signup' && <button type="button" className="btn ghost" onClick={() => go('signin')}>{t('auth.haveAccount')}</button>}
        {(mode === 'confirm' || mode === 'reset') && <button type="button" className="btn ghost" disabled={busy} onClick={() => void resend()}>{t('auth.resend')}</button>}
        {mode !== 'signin' && mode !== 'signup' && <button type="button" className="btn ghost" onClick={() => go('signin')}>{t('auth.back')}</button>}
      </div>
    </form>
  </main>
}
