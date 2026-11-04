import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push'

const NOTE: Partial<Record<PushState, string>> = {
  install: 'No iPhone, instala primeiro o Syncro: em Safari, Partilhar → Adicionar ao ecrã principal.',
  unsupported: 'Este navegador não permite notificações.',
  denied: 'Notificações bloqueadas. Permite-as nas definições do telemóvel ou do navegador.',
}

/** Notifications switch of the web/PWA build: reminders arrive through Web Push, even with the app closed. */
export function PushSetting() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { void pushState().then(setState) }, [])
  const toggle = async (on: boolean) => {
    setBusy(true); setError('')
    try {
      if (on) await enablePush(); else await disablePush()
    } catch { setError(on ? 'Não foi possível ligar os avisos. Verifica a ligação e tenta novamente.' : 'Não foi possível desligar os avisos. Verifica a ligação e tenta novamente.') }
    setState(await pushState()); setBusy(false)
  }
  if (!state) return null
  const note = NOTE[state]
  return <>
    <h2 className="sub">Notificações</h2>
    {note ? <p className="mu">{note}</p> : <>
      <label className="ck"><input type="checkbox" className="sw" role="switch" checked={state === 'on'} disabled={busy} onChange={e => void toggle(e.target.checked)} /> Avisar sobre tarefas com hora limite</label>
      <p className="mu">1 hora antes e à hora limite, mesmo com a app fechada. Só neste dispositivo.</p>
      {error && <p className="neg" role="alert">{error}</p>}
    </>}
  </>
}
