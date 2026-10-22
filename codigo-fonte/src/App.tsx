import { useEffect, useState } from 'react'
import { Agenda } from './features/agenda/Agenda'
import { Calendario } from './features/calendario/Calendario'
import { Tarefas } from './features/tarefas/Tarefas'
import { Financas } from './features/financas/Financas'
import { Perfil } from './features/perfil/Perfil'
import { Foco } from './features/foco/Foco'
import { QuickAdd } from './components/QuickAdd'
import { Toast } from './components/Toast'
import { useStore } from './store/useStore'
import { todayIso, useNow } from './components/common'

const SECTIONS = [{ id: 'agenda', label: 'Agenda' }, { id: 'calendario', label: 'Calendário' }, { id: 'tarefas', label: 'Tarefas' }, { id: 'financas', label: 'Finanças' }, { id: 'perfil', label: 'Perfil' }] as const
type Id = typeof SECTIONS[number]['id']

export default function App() {
  const [sec, setSec] = useState<Id>('agenda')
  const [anchor, setAnchor] = useState(todayIso())
  const [qa, setQa] = useState(false)
  const { data, history, undo } = useStore()
  const now = useNow(10000), h = now.getHours()
  const g = h < 6 ? 'Boa noite' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite'
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|SELECT|TEXTAREA/.test((document.activeElement?.tagName) ?? '')
      if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setQa(true); return }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && !qa && '12345'.includes(e.key) && e.key) setSec(SECTIONS[+e.key - 1].id)
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [qa])
  return <div className="app">
    <aside className="sb">
      <div className="brand">Syncro</div>
      <nav className="nav">{SECTIONS.map(s => <button key={s.id} aria-current={sec === s.id ? 'page' : undefined} onClick={() => setSec(s.id)}>{s.label}</button>)}</nav>
      <Foco />
      <button className="btn undo" disabled={!history.length} onClick={undo}>↶ Anular</button>
    </aside>
    <main>
      <div className="top"><div><div className="hello">{g}{data.name ? ', ' : '.'}{data.name && <span className="nm">{data.name}</span>}</div>
        <div className="mu cap">{now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div></div>
        <button className="btn" onClick={() => setQa(true)} title="Adição rápida ( / )">⚡ Adição rápida</button></div>
      {sec === 'agenda' && <Agenda anchor={anchor} setAnchor={setAnchor} />}
      {sec === 'calendario' && <Calendario onOpenDay={ds => { setAnchor(ds); setSec('agenda') }} />}
      {sec === 'tarefas' && <Tarefas />}
      {sec === 'financas' && <Financas />}
      {sec === 'perfil' && <Perfil />}
    </main>
    {qa && <QuickAdd onClose={() => setQa(false)} onEvent={ds => { setAnchor(ds); setSec('agenda') }} />}
    <Toast />
  </div>
}
