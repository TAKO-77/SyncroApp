import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { hideSplash, showSplash, splashLanded } from '../../lib/splash'
import { supabaseConfigured } from '../../lib/supabase'
import { startSync, stopSync, type LegacyChoice } from '../../lib/sync/engine'
import { initAuth, signOut, useAuth } from '../../store/useAuth'
import { AuthScreen } from './AuthScreen'
import { confirmDialog } from '../../store/confirm'
import { useT } from '../../lib/i18n/useT'

type Phase = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error' } | { kind: 'choose'; resolve: (choice: LegacyChoice) => void }

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="auth"><div className="auth-card" role="status"><h2>{title}</h2>{children}</div></main>
}

/** Shows the sign-in screen until there is a user, then loads that user's data before rendering the app. */
export function AccountGate({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { ready, user } = useAuth()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { initAuth() }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    setPhase({ kind: 'loading' })
    startSync(user.id).then(r => { if (active) setPhase(r) }, () => { if (active) setPhase({ kind: 'error' }) })
    return () => { active = false; stopSync() }
  }, [user?.id, attempt])

  // The logo covers the screen while booting. Auth and data load behind it from the start; what comes next mounts once both are done and the logo has formed, then the logo fades away.
  const booting = supabaseConfigured && (!ready || (!!user && phase.kind === 'loading'))
  const [landed, setLanded] = useState(!supabaseConfigured)
  const splashRun = useRef(0)
  useLayoutEffect(() => {
    if (!booting) return
    const run = ++splashRun.current
    showSplash()
    setLanded(false)
    void splashLanded().then(() => { if (run === splashRun.current) setLanded(true) })
  }, [booting])
  const reveal = !booting && landed
  useEffect(() => { if (reveal) hideSplash() }, [reveal])

  if (!supabaseConfigured) return <Notice title={t('auth.setup.title')}><p className="mu">{t('auth.setup.text')}</p></Notice>
  if (!reveal) return null
  if (!user) return <AuthScreen />
  if (phase.kind === 'error') return <Notice title={t('auth.loadError.title')}>
    <p className="mu">{t('auth.loadError.text')}</p>
    <div className="auth-links"><button className="btn pri" onClick={() => setAttempt(a => a + 1)}>{t('auth.loadError.retry')}</button><button className="btn ghost" onClick={() => void signOut()}>{t('auth.loadError.signOut')}</button></div>
  </Notice>
  if (phase.kind === 'choose') {
    const pick = (choice: LegacyChoice) => { phase.resolve(choice); setPhase({ kind: 'ready' }) }
    return <Notice title={t('auth.legacy.title')}>
      <p className="mu">{t('auth.legacy.text')}</p>
      <div className="auth-choices">
        <button className="btn pri" onClick={() => pick('merge')}>{t('auth.legacy.merge')}</button>
        <button className="btn" onClick={() => pick('cloud')}>{t('auth.legacy.cloud')}</button>
        <button className="btn dng" onClick={async () => { if (await confirmDialog({ title: t('auth.legacy.confirmTitle'), message: t('auth.legacy.confirmText'), confirmLabel: t('auth.legacy.confirmLabel'), danger: true })) pick('local') }}>{t('auth.legacy.local')}</button>
      </div>
      <p className="mu">{t('auth.legacy.note')}</p>
    </Notice>
  }
  return <>{children}</>
}
