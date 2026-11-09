import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore, type Theme } from '../../store/useStore'
import { reducedMotion } from '../../lib/media'
import { parseAppData } from '../../lib/schema'
import { desktop } from '../../lib/desktop'
import { PushSetting } from './PushSetting'
import { syncNow, useSync, type SyncStatus } from '../../lib/sync/engine'
import { signOut, useAuth } from '../../store/useAuth'
import { confirmDialog } from '../../store/confirm'
import { Glider } from '../../components/Glider'
import { useT } from '../../lib/i18n/useT'
import { LANGUAGES, LANGUAGE_NAMES, isLanguage } from '../../lib/i18n/languages'
import type { MessageKey } from '../../lib/i18n/translate'

const SYNC_LABEL: Record<SyncStatus, MessageKey> = { idle: 'sync.idle', syncing: 'sync.syncing', synced: 'sync.synced', offline: 'sync.offline', error: 'sync.error' }

export function Definicoes() {
  const { t, tn, locale } = useT()
  const { data, update, replace, sidebarAutoOpen, setSidebarAutoOpen, focusTimer, setFocusTimer, notifications, setNotifications, theme, setTheme } = useStore()
  const { user, offline } = useAuth()
  const sync = useSync()
  const [msg, setMsg] = useState('')
  /** Changes the theme with a circle that grows from the switch over the old screen (View Transitions). */
  const switchTheme = (next: Theme, from: HTMLElement) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (!doc.startViewTransition || reducedMotion()) { setTheme(next); return }
    const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    doc.startViewTransition(() => flushSync(() => setTheme(next))).ready.then(() => {
      document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })
    }).catch(() => undefined)
  }
  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  useEffect(() => {
    const bridge = desktop
    if (!bridge) return
    const onMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return
      const payload = event.data as { type?: string; version?: string; message?: string; busy?: boolean }
      if (payload.type !== 'syncro:update-status') return
      if (typeof payload.version === 'string') setVersion(payload.version)
      if (typeof payload.message === 'string') setUpdateStatus(payload.message)
      setCheckingUpdates(payload.busy === true)
    }
    bridge.addEventListener('message', onMessage)
    bridge.postMessage('syncro:version')
    return () => bridge.removeEventListener('message', onMessage)
  }, [])
  const checkUpdates = () => {
    if (!desktop) return
    setCheckingUpdates(true)
    setUpdateStatus(t('settings.searchingUpdates'))
    desktop.postMessage('syncro:check-for-updates')
  }
  const leave = async () => {
    if (sync.pending && !await confirmDialog({ title: t('settings.signOutTitle'), message: tn('settings.signOutPending', sync.pending), confirmLabel: t('settings.signOut'), danger: true })) return
    void signOut()
  }
  const file = useRef<HTMLInputElement>(null)
  const exportar = () => {
    const txt = JSON.stringify({ app: 'syncro', v: 1, exported: new Date().toISOString(), data }, null, 1)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }))
    a.download = `syncro-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg(t('settings.exported', { events: data.ev.length, tasks: data.tasks.length }))
  }
  const importar = async (f?: File) => {
    if (!f) return
    try {
      const raw = JSON.parse(await f.text()), d = parseAppData(raw)
      if (!d) throw new Error()
      // A backup from before the language choice keeps the account's language.
      const source = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw
      if (!isLanguage(source?.language)) d.language = data.language
      replace(d); setMsg(t('settings.imported'))
    } catch { setMsg(t('settings.invalidFile')) }
  }

  return <section className="page narrow settings-page">
    <h2>{t('settings.title')}</h2>
    <h2 className="sub">{t('settings.account')}</h2>
    <p>{user?.email}</p>
    <p className="mu" role="status" aria-live="polite">{offline ? t('settings.offlineSession') : t(SYNC_LABEL[sync.status])}{sync.pending ? ` · ${t('settings.pending', { n: sync.pending })}` : ''}{sync.lastSync && sync.status === 'synced' ? ` · ${new Date(sync.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
    {sync.rejected > 0 && <p className="mu">{tn('settings.rejected', sync.rejected)}</p>}
    <div className="row">
      <button className="btn" disabled={sync.status === 'syncing'} onClick={() => { void syncNow() }}>{t('settings.syncNow')}</button>
      <button className="btn" onClick={leave}>{t('settings.signOut')}</button>
    </div>
    <h2 className="sub">{t('settings.updates')}</h2>
    {desktop ? <>
      <p className="mu">{version ? t('settings.installedVersion', { version }) : t('settings.gettingVersion')}</p>
      <button className="btn" disabled={checkingUpdates} onClick={checkUpdates}>{checkingUpdates ? t('settings.checking') : t('settings.checkUpdates')}</button>
      <p className="mu" role="status" aria-live="polite">{updateStatus}</p>
    </> : <p className="mu">{t('settings.installedVersion', { version: __APP_VERSION__ })} · {new Date(__APP_BUILD__).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
    <p className="wide-only"><a className="btn" href="https://github.com/TAKO-77/SyncroApp/releases/latest" target="_blank" rel="noreferrer">{t('settings.download')}</a></p>
    {!desktop && <PushSetting />}
    {desktop && <>
      <h2 className="sub">{t('settings.notifications')}</h2>
      <label className="ck"><input type="checkbox" className="sw" role="switch" checked={notifications} onChange={e => setNotifications(e.target.checked)} /> {t('settings.notifyComputer')}</label>
      <p className="mu">{t('settings.notifyComputerNote')}</p>
    </>}
    <h2 className="sub">{t('settings.language')}</h2>
    <div className="seg language-choice" role="group" aria-label={t('settings.language')}>
      {LANGUAGES.map(lang => <button key={lang} type="button" lang={lang} aria-pressed={data.language === lang} onClick={() => { if (lang !== data.language) update(d => { d.language = lang }) }}>{LANGUAGE_NAMES[lang]}</button>)}
      <Glider />
    </div>
    <p className="mu">{t('settings.languageNote')}</p>
    <h2 className="sub">{t('settings.appearance')}</h2>
    <label className="ck"><input type="checkbox" className="sw" role="switch" checked={theme === 'light'} onChange={e => switchTheme(e.target.checked ? 'light' : 'dark', e.currentTarget)} /> {t('settings.lightMode')}</label>
    <div className="wide-only">
      <h2 className="sub">{t('settings.sidebar')}</h2>
      <label className="ck"><input type="checkbox" className="sw" role="switch" checked={sidebarAutoOpen} onChange={e => setSidebarAutoOpen(e.target.checked)} aria-describedby="sidebar-preference-description" /> {t('settings.sidebarAutoOpen')}</label>
      <p id="sidebar-preference-description" className="mu">{t(sidebarAutoOpen ? 'settings.sidebarAutoOpenOn' : 'settings.sidebarAutoOpenOff')}</p>
      <label className="ck"><input type="checkbox" className="sw" role="switch" checked={focusTimer} onChange={e => setFocusTimer(e.target.checked)} /> {t('settings.focusTimer')}</label>
    </div>
    <h2 className="sub">{t('settings.data')}</h2>
    <div className="row">
      <button className="btn" onClick={exportar}>{t('settings.export')}</button>
      <button className="btn" onClick={() => file.current?.click()}>{t('settings.import')}</button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void importar(e.target.files?.[0]); e.target.value = '' }} />
    </div>
    <p className="mu" role="status">{msg}</p>
  </section>
}
