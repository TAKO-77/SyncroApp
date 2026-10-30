import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { parseAppData } from '../../lib/schema'
import { desktop } from '../../lib/desktop'
import { flush, pull, useSync, type SyncStatus } from '../../lib/sync/engine'
import { signOut, useAuth } from '../../store/useAuth'
import { confirmDialog } from '../../store/confirm'

const SYNC_LABEL: Record<SyncStatus, string> = { idle: 'A preparar a sincronização…', syncing: 'A sincronizar…', synced: 'Sincronizado', offline: 'Sem ligação — as alterações ficam guardadas neste dispositivo', error: 'Não foi possível sincronizar' }

export function Definicoes() {
  const { data, replace, sidebarAutoOpen, setSidebarAutoOpen, focusTimer, setFocusTimer, theme, setTheme } = useStore()
  const { user, offline } = useAuth()
  const sync = useSync()
  const [msg, setMsg] = useState('')
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
    setUpdateStatus('A procurar atualizações…')
    desktop.postMessage('syncro:check-for-updates')
  }
  const leave = async () => {
    if (sync.pending && !await confirmDialog({ title: 'Terminar sessão?', message: `Há ${sync.pending} alteraç${sync.pending === 1 ? 'ão' : 'ões'} por enviar. Se terminares sessão, só serão enviadas quando voltares a entrar neste dispositivo.`, confirmLabel: 'Terminar sessão', danger: true })) return
    void signOut()
  }
  const file = useRef<HTMLInputElement>(null)
  const exportar = () => {
    const txt = JSON.stringify({ app: 'syncro', v: 1, exported: new Date().toISOString(), data }, null, 1)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }))
    a.download = `syncro-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg(`Exportado: ${data.ev.length} eventos, ${data.tasks.length} tarefas.`)
  }
  const importar = async (f?: File) => {
    if (!f) return
    try {
      const d = parseAppData(JSON.parse(await f.text()))
      if (!d) throw new Error()
      replace(d); setMsg('Dados importados.')
    } catch { setMsg('Ficheiro inválido.') }
  }

  return <section className="page narrow">
    <h2>Definições</h2>
    <h2 className="sub">Conta</h2>
    <p>{user?.email}</p>
    <p className="mu" role="status" aria-live="polite">{offline ? 'Sessão sem ligação — a usar os dados guardados neste dispositivo.' : SYNC_LABEL[sync.status]}{sync.pending ? ` · ${sync.pending} por enviar` : ''}{sync.lastSync && sync.status === 'synced' ? ` · ${new Date(sync.lastSync).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
    {sync.rejected > 0 && <p className="mu">{sync.rejected} alteraç{sync.rejected === 1 ? 'ão foi recusada' : 'ões foram recusadas'} pelo servidor por conterem dados inválidos.</p>}
    <div className="row">
      <button className="btn" disabled={sync.status === 'syncing'} onClick={() => { void flush().then(pull) }}>Sincronizar agora</button>
      <button className="btn" onClick={leave}>Terminar sessão</button>
    </div>
    <h2 className="sub">Atualizações</h2>
    {desktop ? <>
      <p className="mu">{version ? `Versão instalada: ${version}` : 'A obter a versão instalada…'}</p>
      <button className="btn" disabled={checkingUpdates} onClick={checkUpdates}>{checkingUpdates ? 'A verificar…' : 'Procurar atualizações'}</button>
      <p className="mu" role="status" aria-live="polite">{updateStatus}</p>
    </> : <p className="mu">No navegador, o Syncro está sempre na versão mais recente: basta recarregar a página. A procura de atualizações só existe na aplicação Windows.</p>}
    <p><a className="btn" href="https://github.com/TAKO-77/SyncroApp/releases/latest" target="_blank" rel="noreferrer">Descarregar a versão mais recente no GitHub</a></p>
    <h2 className="sub">Aparência</h2>
    <label className="ck"><input type="checkbox" checked={theme === 'light'} onChange={e => setTheme(e.target.checked ? 'light' : 'dark')} /> Modo claro</label>
    <div className="wide-only">
      <h2 className="sub">Barra lateral</h2>
      <label className="ck"><input type="checkbox" checked={sidebarAutoOpen} onChange={e => setSidebarAutoOpen(e.target.checked)} aria-describedby="sidebar-preference-description" /> Abrir automaticamente ao passar o rato</label>
      <p id="sidebar-preference-description" className="mu">{sidebarAutoOpen ? 'Ativo — a barra abre automaticamente ao passar o rato.' : 'Desativado — usa os ícones para mudar de aba ou o botão no topo da barra para abrir e fechar manualmente.'}</p>
      <label className="ck"><input type="checkbox" checked={focusTimer} onChange={e => setFocusTimer(e.target.checked)} /> Mostrar temporizador de foco</label>
    </div>
    <h2 className="sub">Dados e cópia de segurança</h2>
    <div className="row">
      <button className="btn" onClick={exportar}>Exportar</button>
      <button className="btn" onClick={() => file.current?.click()}>Importar ficheiro</button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void importar(e.target.files?.[0]); e.target.value = '' }} />
    </div>
    <p className="mu" role="status">{msg}</p>
  </section>
}
