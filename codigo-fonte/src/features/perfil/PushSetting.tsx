import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push'
import { useT } from '../../lib/i18n/useT'
import type { MessageKey } from '../../lib/i18n/translate'

const NOTE: Partial<Record<PushState, MessageKey>> = { install: 'settings.pushInstall', unsupported: 'settings.pushUnsupported', denied: 'settings.pushDenied' }

/** Notifications switch of the web/PWA build: reminders arrive through Web Push, even with the app closed. */
export function PushSetting() {
  const { t } = useT()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { void pushState().then(setState) }, [])
  const toggle = async (on: boolean) => {
    setBusy(true); setError('')
    try {
      if (on) await enablePush(); else await disablePush()
    } catch { setError(t(on ? 'settings.pushOnError' : 'settings.pushOffError')) }
    setState(await pushState()); setBusy(false)
  }
  if (!state) return null
  const note = NOTE[state]
  return <>
    <h2 className="sub">{t('settings.notifications')}</h2>
    {note ? <p className="mu">{t(note)}</p> : <>
      <label className="ck"><input type="checkbox" className="sw" role="switch" checked={state === 'on'} disabled={busy} onChange={e => void toggle(e.target.checked)} /> {t('settings.notifyDevice')}</label>
      <p className="mu">{t('settings.notifyDeviceNote')}</p>
      {error && <p className="neg" role="alert">{error}</p>}
    </>}
  </>
}
