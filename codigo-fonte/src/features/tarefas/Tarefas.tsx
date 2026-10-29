import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPE } from 'react'
import { useStore } from '../../store/useStore'
import { Modal, todayIso, uid } from '../../components/common'
import type { Effort, Priority, Task } from '../../types'
import { NoteCard } from './NoteCard'
import { NoteGrid } from './NoteGrid'
import { DatePicker } from '../../components/DatePicker'
import { confirmDialog } from '../../store/confirm'
import { Select } from '../../components/Select'
import { markDone } from '../../lib/cleanup'
import { LK, LV, PC, PN, dueLabel } from '../../lib/tasks'

const NX: Record<Priority, Priority> = { urgente: 'alta', alta: 'media', media: 'baixa', baixa: 'urgente' }
type SortBy = 'priority' | 'effort' | 'due' | 'custom'
const SORT_KEY = 'syncro-task-sort'
const COMPLETE_MS = 1300
const BURST = Array.from({ length: 10 }, (_, i) => i * 36)
const readSort = (): SortBy => {
  try { const v = localStorage.getItem(SORT_KEY); return v === 'effort' || v === 'due' || v === 'custom' ? v : 'priority' } catch { return 'priority' }
}

export function Tarefas() {
  const { data, update } = useStore()
  const today = todayIso()
  const [open, setOpen] = useState(true)
  const [txt, setTxt] = useState(''); const [p, setP] = useState<Priority>('media'); const [du, setDu] = useState(''); const [effort, setEffort] = useState<Effort | ''>('')
  const [ed, setEd] = useState<Task | null>(null)
  const [workspaceId, setWorkspaceId] = useState('geral')
  const [workspaceMenu, setWorkspaceMenu] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>(readSort)
  useEffect(() => { try { localStorage.setItem(SORT_KEY, sortBy) } catch { /* armazenamento indisponível */ } }, [sortBy])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // Tasks being ticked off play the completion animation before they leave the pending list.
  const [completing, setCompleting] = useState<string[]>([])
  const completionTimers = useRef(new Map<string, number>())
  useEffect(() => () => completionTimers.current.forEach(clearTimeout), [])
  const toggleDone = (id: string, done: boolean) => {
    const timers = completionTimers.current
    if (!done || !open) {
      if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); setCompleting(c => c.filter(x => x !== id)); return }
      patch(id, x => markDone(x, done)); return
    }
    setCompleting(c => [...c, id])
    timers.set(id, window.setTimeout(() => {
      timers.delete(id); setCompleting(c => c.filter(x => x !== id)); patch(id, x => markDone(x, true))
    }, COMPLETE_MS))
  }
  const listRef = useRef<HTMLDivElement>(null)
  const dragStart = (e: RPE, id: string) => {
    if (e.button !== 0 || !listRef.current) return
    e.preventDefault()
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('.tk')], i0 = rows.findIndex(r => r.dataset.id === id), n = rows.length
    if (n < 2) return
    const row = rows[i0], step = rows[1].offsetTop - rows[0].offsetTop, sy = e.clientY, sc = scrollY
    let ni = i0; row.classList.add('drag')
    const mv = (m: PointerEvent) => {
      if (m.clientY < 70) scrollBy(0, -14); else if (m.clientY > innerHeight - 70) scrollBy(0, 14)
      const dy = m.clientY - sy + (scrollY - sc); ni = Math.max(0, Math.min(n - 1, i0 + Math.round(dy / step)))
      row.style.transform = `translateY(${dy}px)`
      rows.forEach((r, k) => { if (r !== row) r.style.transform = i0 < ni && k > i0 && k <= ni ? `translateY(${-step}px)` : i0 > ni && k >= ni && k < i0 ? `translateY(${step}px)` : '' })
    }
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      rows.forEach(r => { r.style.transform = ''; r.classList.remove('drag') })
      if (ni === i0) return
      const ids = rows.map(r => r.dataset.id as string), [mvd] = ids.splice(i0, 1); ids.splice(ni, 0, mvd)
      update(d => { const slots: number[] = []; d.tasks.forEach((t, k) => { if (ids.includes(t.id)) slots.push(k) }); const by = Object.fromEntries(d.tasks.map(t => [t.id, t])); slots.forEach((k, j) => { d.tasks[k] = by[ids[j]] }) })
      // The stored order now matches what the user arranged, so keep showing it.
      setSortBy('custom')
    }
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const workspace = data.workspaces.find(w => w.id === workspaceId) ?? data.workspaces[0]
  const activeWorkspaceId = workspace?.id ?? 'geral'
  useEffect(() => setEditingNoteId(null), [activeWorkspaceId])
  const notes = data.notes.filter(n => n.workspaceId === activeWorkspaceId)
  const scoped = workspace?.id === 'geral' ? data.tasks : data.tasks.filter(t => (t.workspaceId ?? 'geral') === workspace?.id)
  const nOpen = scoped.filter(t => !t.d).length
  const list = scoped.filter(t => open ? !t.d : t.d).map((task, index) => ({ task, index })).sort((a, b) => {
    if (sortBy === 'custom') return a.index - b.index
    if (sortBy === 'priority') return ({ urgente: 0, alta: 1, media: 2, baixa: 3 }[a.task.p] - { urgente: 0, alta: 1, media: 2, baixa: 3 }[b.task.p]) || a.index - b.index
    if (sortBy === 'effort') return ((a.task.effort ? LK.indexOf(a.task.effort as Effort) : 99) - (b.task.effort ? LK.indexOf(b.task.effort as Effort) : 99)) || a.index - b.index
    return ((a.task.due || '9999-99-99').localeCompare(b.task.due || '9999-99-99')) || a.index - b.index
  }).map(x => x.task)
  const addWorkspace = (e: FormEvent) => {
    e.preventDefault()
    const name = newWorkspaceName.trim()
    if (!name) return
    const id = uid('w')
    update(d => { d.workspaces.push({ id, name }) })
    setWorkspaceId(id); setNewWorkspaceName(''); setWorkspaceMenu(false)
  }
  const deleteWorkspace = async (id: string) => {
    const target = data.workspaces.find(w => w.id === id)
    if (!target || id === 'geral') return
    if (!await confirmDialog({ title: `Eliminar o espaço “${target.name}”?`, message: 'As tarefas serão movidas para Geral e as notas deste espaço serão apagadas.', confirmLabel: 'Eliminar', danger: true })) return
    update(d => { d.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'geral' }); d.workspaces = d.workspaces.filter(w => w.id !== id); d.notes = d.notes.filter(n => n.workspaceId !== id) })
    setWorkspaceId('geral')
  }
  const add = (e: FormEvent) => { e.preventDefault(); const v = txt.trim(); if (!v) return; update(d => { d.tasks.push({ id: uid('t'), t: v, due: du, p, d: false, effort, workspaceId: workspace?.id ?? 'geral' }) }); setTxt(''); setDu(''); setEffort(''); setP('media'); setOpen(true) }
  const patch = (id: string, fn: (t: Task) => void) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) fn(t) })
  const addNote = () => { const id = uid('n'); update(d => { d.notes.push({ id, workspaceId: activeWorkspaceId, text: '' }) }); setEditingNoteId(id) }
  const saveNote = (id: string, text: string) => update(d => { const n = d.notes.find(x => x.id === id); if (n) n.text = text })
  const deleteNote = (id: string) => update(d => { d.notes = d.notes.filter(n => n.id !== id) })

  return <section className="page tasks-page"><div className="tasks-main">
    <div className="head2"><h2>Tarefas</h2><div className="seg"><button aria-pressed={open} onClick={() => setOpen(true)}>Pendentes {nOpen}</button><button aria-pressed={!open} onClick={() => setOpen(false)}>Concluídas {scoped.length - nOpen}</button></div></div>
    <div className="workspace-bar"><div className="workspace-picker">
      <button className="workspace-current" type="button" aria-expanded={workspaceMenu} onClick={() => setWorkspaceMenu(!workspaceMenu)}><span className="workspace-mark">▦</span><span><small>ESPAÇO DE TRABALHO</small><b>{workspace?.name ?? 'Geral'}</b></span><span className="workspace-chevron">⌄</span></button>
      {workspaceMenu && <div className="workspace-menu">
        {data.workspaces.map(w => <div className={'workspace-option' + (workspace?.id === w.id ? ' selected' : '')} key={w.id}>
          <button type="button" onClick={() => { setWorkspaceId(w.id); setWorkspaceMenu(false) }}><span className="workspace-option-icon">{w.id === 'geral' ? '▦' : '▣'}</span><span>{w.name}{w.id === 'geral' && <small>Todas as tarefas</small>}</span></button>
          {w.id !== 'geral' && <button type="button" className="workspace-delete" aria-label={`Eliminar ${w.name}`} title="Eliminar espaço" onClick={() => void deleteWorkspace(w.id)}>×</button>}
        </div>)}
        <form className="workspace-create" onSubmit={addWorkspace}><input value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} maxLength={32} placeholder="Nome do novo espaço" aria-label="Nome do novo espaço" required /><button className="btn pri" type="submit">+ Criar</button></form>
      </div>}
    </div></div>
    <form className="tadd" onSubmit={add}>
      <input value={txt} maxLength={90} placeholder="Nova tarefa…" aria-label="Nova tarefa" required autoComplete="off" onChange={e => setTxt(e.target.value)} />
      <div className="chips"><span className="mu">Esforço</span>{LK.map(k => <button key={k} type="button" className="chip" aria-pressed={effort === k} title={LV[k].t} style={{ ['--c' as string]: LV[k].c }} onClick={() => setEffort(effort === k ? '' : k)}>{LV[k].n}</button>)}</div>
      <div className="chips"><span className="mu">Prioridade</span>{(['urgente', 'alta', 'media', 'baixa'] as Priority[]).map(k => <button key={k} type="button" className="chip" aria-pressed={p === k} style={{ ['--c' as string]: PC[k] }} onClick={() => setP(k)}>{PN[k]}</button>)}
        <DatePicker value={du} aria-label="Data limite" onChange={setDu} className="auto" /><button className="btn pri sp-l" type="submit">Adicionar</button></div>
    </form>
    {list.length > 1 && <div className="tsub"><label>Ordenar por<Select<SortBy> value={sortBy} onChange={setSortBy} options={[{ value: 'priority', label: 'Relevância' }, { value: 'effort', label: 'Tempo estimado' }, { value: 'due', label: 'Data limite' }, { value: 'custom', label: 'Customizado' }]} /></label></div>}
    <div className="tasks-list" ref={listRef}>{list.length ? list.map(t => { const [lbl, late] = dueLabel(t.due, today)
      const done = completing.includes(t.id)
      return <div key={t.id} data-id={t.id} className={'tk' + (t.d ? ' dn' : '') + (done ? ' completing' : '')} style={{ ['--c' as string]: PC[t.p] }}>
        {open && <span className="hnd" title="Arrastar" onPointerDown={e => dragStart(e, t.id)}>⋮⋮</span>}
        <span className="rc-wrap"><input className="rc" type="checkbox" checked={t.d || done} aria-label="Concluída" onChange={e => toggleDone(t.id, e.target.checked)} />
          {done && <span className="burst" aria-hidden="true">{BURST.map(a => <i key={a} style={{ ['--a' as string]: `${a}deg` }} />)}</span>}</span>
        <span className="tt2" onClick={() => setEd({ ...t })}><span className="tt2-text">{t.t}</span></span>
        {t.n && <small className="tm" title="Tem notas">≡</small>}
        {lbl && <small className={'tm' + (late ? ' late' : '')}>{lbl}</small>}
        {t.effort && <button className="lt" style={{ ['--c' as string]: LV[t.effort].c }} title={LV[t.effort].t}>{LV[t.effort].n}</button>}
        <button className="pp2" onClick={() => patch(t.id, x => { x.p = NX[x.p] })}>{PN[t.p]}</button>
        <button className="x" aria-label="Remover" onClick={() => update(d => { d.tasks = d.tasks.filter(x => x.id !== t.id) })}>✕</button>
      </div> }) : <div className="tem">{open ? 'Tudo em dia. Adiciona a próxima tarefa acima.' : 'Ainda nada concluído.'}</div>}</div>
    </div>
    {activeWorkspaceId !== 'geral' && <div className="task-notes">
      <div className="task-notes-head"><label>Tópicos e notas</label><button type="button" className="btn" onClick={addNote}>+ Nova nota</button></div>
      {notes.length ? <NoteGrid>{notes.map(n => <NoteCard key={n.id} text={n.text} editing={editingNoteId === n.id}
        onEdit={() => setEditingNoteId(n.id)}
        onSave={text => { saveNote(n.id, text); if (editingNoteId === n.id) setEditingNoteId(null) }}
        onCancel={() => { if (!n.text) deleteNote(n.id); setEditingNoteId(null) }}
        onDelete={async () => { if (!n.text || await confirmDialog({ title: 'Apagar esta nota?', message: 'Esta ação não pode ser anulada.', confirmLabel: 'Apagar', danger: true })) deleteNote(n.id) }} />)}</NoteGrid>
        : <div className="task-notes-content"><span className="mu">Ainda não há tópicos ou notas neste espaço.</span></div>}
      <small>Notas independentes do espaço “{workspace?.name ?? 'Geral'}”.</small>
    </div>}
    {ed && <Modal title="Editar tarefa" onClose={() => setEd(null)}>
      <form className="fgrid" onSubmit={e => { e.preventDefault(); const v = ed.t.trim(); if (!v) return; patch(ed.id, x => Object.assign(x, { ...ed, t: v })); setEd(null) }}>
        <label className="w">Nome<input value={ed.t} required maxLength={90} onChange={e => setEd({ ...ed, t: e.target.value })} /></label>
        <label>Data limite<DatePicker value={ed.due} onChange={due => setEd({ ...ed, due })} /></label>
        <label>Prioridade<Select<Priority> value={ed.p} onChange={p => setEd({ ...ed, p })} options={(['urgente', 'alta', 'media', 'baixa'] as Priority[]).map(k => ({ value: k, label: PN[k], color: PC[k] }))} /></label>
        <label className="w">Espaço de trabalho<Select value={ed.workspaceId ?? 'geral'} onChange={workspaceId => setEd({ ...ed, workspaceId })} options={data.workspaces.map(w => ({ value: w.id, label: w.name }))} /></label>
        <label className="w">Esforço<Select<Effort | ''> value={ed.effort ?? ''} onChange={effort => setEd({ ...ed, effort })} options={[{ value: '', label: 'Sem definir' }, ...LK.map(k => ({ value: k, label: LV[k].n, hint: LV[k].t, color: LV[k].c }))]} /></label>
        <label className="w">Notas<textarea rows={3} maxLength={400} value={ed.n ?? ''} onChange={e => setEd({ ...ed, n: e.target.value })} /></label>
        <label className="w ck"><input type="checkbox" checked={ed.d} onChange={e => setEd({ ...ed, d: e.target.checked })} /> Concluída</label>
        <div className="acts w"><button type="button" className="btn dng" onClick={() => { const id = ed.id; update(d => { d.tasks = d.tasks.filter(x => x.id !== id) }); setEd(null) }}>Apagar</button><span className="sp" /><button type="button" className="btn" onClick={() => setEd(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
