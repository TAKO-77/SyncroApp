import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { hideSplash, showSplash, splashLanded } from '../../lib/splash'
import { supabaseConfigured } from '../../lib/supabase'
import { startSync, stopSync, type LegacyChoice } from '../../lib/sync/engine'
import { initAuth, signOut, useAuth } from '../../store/useAuth'
import { AuthScreen } from './AuthScreen'
import { confirmDialog } from '../../store/confirm'

type Phase = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error' } | { kind: 'choose'; resolve: (choice: LegacyChoice) => void }

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="auth"><div className="auth-card" role="status"><h2>{title}</h2>{children}</div></main>
}

/** Shows the sign-in screen until there is a user, then loads that user's data before rendering the app. */
export function AccountGate({ children }: { children: ReactNode }) {
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

  if (!supabaseConfigured) return <Notice title="Ligação à base de dados por configurar"><p className="mu">Define VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em codigo-fonte/.env e volta a compilar a aplicação.</p></Notice>
  if (!reveal) return null
  if (!user) return <AuthScreen />
  if (phase.kind === 'error') return <Notice title="Não foi possível carregar os teus dados">
    <p className="mu">O primeiro acesso a esta conta neste dispositivo precisa de ligação à Internet.</p>
    <div className="auth-links"><button className="btn pri" onClick={() => setAttempt(a => a + 1)}>Tentar novamente</button><button className="btn ghost" onClick={() => void signOut()}>Terminar sessão</button></div>
  </Notice>
  if (phase.kind === 'choose') {
    const pick = (choice: LegacyChoice) => { phase.resolve(choice); setPhase({ kind: 'ready' }) }
    return <Notice title="Já tens dados nesta conta">
      <p className="mu">Este dispositivo também tem dados guardados antes de iniciares sessão. Escolhe o que pretendes manter.</p>
      <div className="auth-choices">
        <button className="btn pri" onClick={() => pick('merge')}>Juntar os dois</button>
        <button className="btn" onClick={() => pick('cloud')}>Manter só os dados da conta</button>
        <button className="btn dng" onClick={async () => { if (await confirmDialog({ title: 'Substituir pelos dados deste dispositivo?', message: 'Os dados da conta que não existem neste dispositivo serão eliminados.', confirmLabel: 'Substituir', danger: true })) pick('local') }}>Substituir pelos dados deste dispositivo</button>
      </div>
      <p className="mu">Os dados deste dispositivo ficam guardados como cópia de segurança local em qualquer dos casos.</p>
    </Notice>
  }
  return <>{children}</>
}
