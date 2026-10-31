import { useEffect, useState } from 'react'
import { CalendarDays, CalendarClock, House, ListTodo, Wallet, UserRound, PanelLeft, Plus, Settings } from 'lucide-react'
import { Inicio, TodaySummary } from './features/inicio/Inicio'
import { DN, MN, dow } from './lib/dates'
import { Agenda, type AgendaView } from './features/agenda/Agenda'
import { Calendario } from './features/calendario/Calendario'
import { Tarefas } from './features/tarefas/Tarefas'
import { Financas } from './features/financas/Financas'
import { Perfil } from './features/perfil/Perfil'
import { Definicoes } from './features/perfil/Definicoes'
import { Foco } from './features/foco/Foco'
import { ProfileButton } from './features/perfil/ProfileButton'
import { QuickAdd } from './components/QuickAdd'
import { Toast } from './components/Toast'
import { applyTheme, useStore } from './store/useStore'
import { LogoFilter, todayIso, useNow } from './components/common'
import { cleanUpNoteImages } from './lib/noteImages'
import { purgeExpired } from './lib/cleanup'
const syncroSymbol = new URL('./assets/syncro-symbol.png', import.meta.url).href
const syncroLogo = new URL('./assets/syncro-logo.png', import.meta.url).href

const SECTIONS = [{ id: 'inicio', label: 'Início', icon: House }, { id: 'agenda', label: 'Agenda', icon: CalendarClock }, { id: 'calendario', label: 'Calendário', icon: CalendarDays }, { id: 'tarefas', label: 'Tarefas', icon: ListTodo }, { id: 'financas', label: 'Finanças', icon: Wallet }, { id: 'perfil', label: 'Perfil', icon: UserRound }, { id: 'definicoes', label: 'Definições', icon: Settings }] as const
type Id = typeof SECTIONS[number]['id']

export default function App() {
  const [sec, setSec] = useState<Id>('inicio')
  const [anchor, setAnchor] = useState(todayIso())
  const [agendaView, setAgendaView] = useState<AgendaView>('week')
  const [workspaceId, setWorkspaceId] = useState('geral')
  const [qa, setQa] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data, sidebarAutoOpen, focusTimer, theme } = useStore()
  useEffect(() => { setSidebarOpen(false) }, [sidebarAutoOpen])
  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => {
    // Removes old completed tasks and past one-off events at start-up and then every hour.
    const purge = () => {
      const { data: current, update: commit } = useStore.getState(), today = todayIso()
      if (purgeExpired(structuredClone(current), today)) commit(d => { purgeExpired(d, today) })
    }
    purge()
    const timer = setInterval(purge, 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    // Once per session, after start-up sync has had time to run.
    const timer = setTimeout(() => { const { data: current, history } = useStore.getState(); void cleanUpNoteImages([JSON.stringify(current.notes), ...history]).catch(() => undefined) }, 15000)
    return () => clearTimeout(timer)
  }, [])
  const now = useNow(10000), h = now.getHours()
  const g = h < 6 ? 'Boa noite' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|SELECT|TEXTAREA/.test((document.activeElement?.tagName) ?? '')
      if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setQa(true); return }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && !qa && '1234567'.includes(e.key) && e.key) setSec(SECTIONS[+e.key - 1].id)
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [qa])
  return <div className={`app${sidebarOpen ? ' sidebar-open' : ''}${sec === 'agenda' || sec === 'calendario' ? ' schedule-layout' : ''}`}>
    <LogoFilter />
    <aside id="sidebar" className="sb" onMouseEnter={() => { if (sidebarAutoOpen) setSidebarOpen(true) }} onMouseLeave={() => { if (sidebarAutoOpen) setSidebarOpen(false) }} onFocus={() => { if (sidebarAutoOpen) setSidebarOpen(true) }} onBlur={e => { if (sidebarAutoOpen && !e.currentTarget.contains(e.relatedTarget as Node | null)) setSidebarOpen(false) }}>
      {!sidebarAutoOpen && <button className="sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} title={sidebarOpen ? 'Fechar barra lateral' : 'Abrir barra lateral'} aria-expanded={sidebarOpen} aria-controls="sidebar" onClick={() => setSidebarOpen(open => !open)}><PanelLeft size={20} strokeWidth={1.5} aria-hidden="true" /></button>}
      <div className="brand"><img src={syncroSymbol} alt="Syncro" width={162} height={178} /><span aria-hidden="true">SYNCRO</span></div>
      <nav className="nav">{SECTIONS.filter(s => s.id !== 'definicoes' && s.id !== 'perfil').map(s => <button key={s.id} title={s.label} aria-label={s.label} aria-current={sec === s.id ? 'page' : undefined} onClick={() => setSec(s.id)}><s.icon size={20} strokeWidth={1.5} aria-hidden="true" /><span>{s.label}</span></button>)}</nav>
      {focusTimer && <Foco />}
      <nav className="nav settings-nav" aria-label="Definições"><button title="Definições" aria-label="Definições" aria-current={sec === 'definicoes' ? 'page' : undefined} onClick={() => setSec('definicoes')}><Settings size={20} strokeWidth={1.5} aria-hidden="true" /><span>Definições</span></button></nav>
    </aside>
    <main>
      <div className="mobile-brand"><img src={syncroLogo} alt="Syncro" width={607} height={222} /></div>
      <div className={'top' + (sec === 'inicio' ? ' hero' : '')}><div>{sec === 'inicio' && <><div className="hello">{g}{data.name ? ', ' : '.'}{data.name && <span className="nm">{data.name}</span>}</div><TodaySummary /></>}</div>
        <div className="top-actions"><button type="button" className="date-pill" title={`${now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Abrir calendário`} onClick={() => setSec('calendario')}>
          <span>{DN[dow(now)]}, {now.getDate()} {MN[now.getMonth()]}</span><span className="mu num">{now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span><span className="date-pill-ic"><CalendarDays size={16} strokeWidth={1.5} aria-hidden="true" /></span></button>
          <button className="btn pri" onClick={() => setQa(true)} title="Adição rápida ( / )"><Plus size={16} strokeWidth={2} aria-hidden="true" />Adição rápida</button><ProfileButton active={sec === 'perfil'} onClick={() => setSec('perfil')} /></div></div>
      {sec === 'inicio' && <Inicio go={setSec} />}
      {sec === 'agenda' && <Agenda anchor={anchor} setAnchor={setAnchor} view={agendaView} setView={setAgendaView} />}
      {sec === 'calendario' && <Calendario onOpenDay={ds => { setAnchor(ds); setSec('agenda') }} />}
      {sec === 'tarefas' && <Tarefas workspaceId={workspaceId} setWorkspaceId={setWorkspaceId} />}
      {sec === 'financas' && <Financas />}
      {sec === 'perfil' && <Perfil />}
      {sec === 'definicoes' && <Definicoes />}
    </main>
    {qa && <QuickAdd onClose={() => setQa(false)} onEvent={ds => { setAnchor(ds); setSec('agenda') }} />}
    <Toast />
  </div>
}
