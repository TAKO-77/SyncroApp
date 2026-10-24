import { PALETTE } from '../../lib/palette'
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPE } from 'react'
import { useStore } from '../../store/useStore'
import { MN, iso, parse } from '../../lib/dates'
import { Modal, todayIso, uid } from '../../components/common'
import type { Effort, Priority, Task } from '../../types'

const PC: Record<Priority, string> = { urgente: PALETTE.error, alta: PALETTE.clay, media: PALETTE.gold, baixa: PALETTE.sage }
const PN: Record<Priority, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const NX: Record<Priority, Priority> = { urgente: 'alta', alta: 'media', media: 'baixa', baixa: 'urgente' }
const LV: Record<Effort, { n: string; t: string; c: string }> = { rel: { n: 'Muito Rápido', t: 'até 15 min', c: PALETTE.sage }, lig: { n: 'Rápido', t: 'cerca de 30 min', c: PALETTE.slate }, cui: { n: 'Moderado', t: '1 a 2 horas', c: PALETTE.neutral }, exi: { n: 'Demorado', t: 'várias horas', c: PALETTE.clay }, pro: { n: 'Projeto', t: 'várias etapas', c: PALETTE.gold } }
const LK = Object.keys(LV) as Effort[]

function due(d: string, today: string): [string, boolean] {
  if (!d) return ['', false]; if (d < today) return ['Atrasada', true]; if (d === today) return ['Hoje', false]
  const t = new Date(); t.setDate(t.getDate() + 1); if (d === iso(t)) return ['Amanhã', false]
  const x = parse(d); return [`${x.getDate()} ${MN[x.getMonth()]}`, false]
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
  const [sortBy, setSortBy] = useState<'priority' | 'effort' | 'due'>('priority')
  const [noteText, setNoteText] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const noteEditor = useRef<HTMLTextAreaElement>(null)
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
    }
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const workspace = data.workspaces.find(w => w.id === workspaceId) ?? data.workspaces[0]
  const activeWorkspaceId = workspace?.id ?? 'geral'
  // Keep the editor in sync when switching workspaces or loading saved data.
  useEffect(() => { setNoteText(data.taskNotes?.[activeWorkspaceId] ?? ''); setEditingNotes(false) }, [activeWorkspaceId])
  const scoped = workspace?.id === 'geral' ? data.tasks : data.tasks.filter(t => (t.workspaceId ?? 'geral') === workspace?.id)
  const nOpen = scoped.filter(t => !t.d).length
  const list = scoped.filter(t => open ? !t.d : t.d).map((task, index) => ({ task, index })).sort((a, b) => {
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
  const deleteWorkspace = (id: string) => {
    const target = data.workspaces.find(w => w.id === id)
    if (!target || id === 'geral') return
    if (!window.confirm(`Eliminar o espaço “${target.name}”? As tarefas serão movidas para Geral.`)) return
    update(d => { d.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'geral' }); d.workspaces = d.workspaces.filter(w => w.id !== id) })
    setWorkspaceId('geral')
  }
  const add = (e: FormEvent) => { e.preventDefault(); const v = txt.trim(); if (!v) return; update(d => { d.tasks.push({ id: uid('t'), t: v, due: du, p, d: false, effort, workspaceId: workspace?.id ?? 'geral' }) }); setTxt(''); setDu(''); setEffort(''); setP('media'); setOpen(true) }
  const patch = (id: string, fn: (t: Task) => void) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) fn(t) })
  const formatNote = (before: string, after = before, line = false) => {
    const input = noteEditor.current
    if (!input) return
    const start = input.selectionStart, end = input.selectionEnd
    const selected = noteText.slice(start, end) || (line ? 'texto' : 'texto')
    const replacement = line ? `${before}${selected}` : `${before}${selected}${after}`
    const next = noteText.slice(0, start) + replacement + noteText.slice(end)
    setNoteText(next)
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, start + before.length + selected.length) })
  }

  return <section className="page narrow">
    <div className="head2"><h2>Tarefas</h2><div className="seg"><button aria-pressed={open} onClick={() => setOpen(true)}>Pendentes {nOpen}</button><button aria-pressed={!open} onClick={() => setOpen(false)}>Concluídas {scoped.length - nOpen}</button></div></div>
    <div className="workspace-bar"><div className="workspace-picker">
      <button className="workspace-current" type="button" aria-expanded={workspaceMenu} onClick={() => setWorkspaceMenu(!workspaceMenu)}><span className="workspace-mark">▦</span><span><small>ESPAÇO DE TRABALHO</small><b>{workspace?.name ?? 'Geral'}</b></span><span className="workspace-chevron">⌄</span></button>
      {workspaceMenu && <div className="workspace-menu">
        {data.workspaces.map(w => <div className={'workspace-option' + (workspace?.id === w.id ? ' selected' : '')} key={w.id}>
          <button type="button" onClick={() => { setWorkspaceId(w.id); setWorkspaceMenu(false) }}><span className="workspace-option-icon">{w.id === 'geral' ? '▦' : '▣'}</span><span>{w.name}{w.id === 'geral' && <small>Todas as tarefas</small>}</span></button>
          {w.id !== 'geral' && <button type="button" className="workspace-delete" aria-label={`Eliminar ${w.name}`} title="Eliminar espaço" onClick={() => deleteWorkspace(w.id)}>×</button>}
        </div>)}
        <form className="workspace-create" onSubmit={addWorkspace}><input value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} maxLength={32} placeholder="Nome do novo espaço" aria-label="Nome do novo espaço" required /><button className="btn pri" type="submit">+ Criar</button></form>
      </div>}
    </div></div>
    <form className="tadd" onSubmit={add}>
      <input value={txt} maxLength={90} placeholder="Nova tarefa…" aria-label="Nova tarefa" required autoComplete="off" onChange={e => setTxt(e.target.value)} />
      <div className="chips"><span className="mu">Esforço</span>{LK.map(k => <button key={k} type="button" className="chip" aria-pressed={effort === k} title={LV[k].t} style={{ ['--c' as string]: LV[k].c }} onClick={() => setEffort(effort === k ? '' : k)}>{LV[k].n}</button>)}</div>
      <div className="chips"><span className="mu">Prioridade</span>{(['urgente', 'alta', 'media', 'baixa'] as Priority[]).map(k => <button key={k} type="button" className="chip" aria-pressed={p === k} style={{ ['--c' as string]: PC[k] }} onClick={() => setP(k)}>{PN[k]}</button>)}
        <input type="date" value={du} aria-label="Data limite" onChange={e => setDu(e.target.value)} className="auto" /><button className="btn pri sp-l" type="submit">Adicionar</button></div>
    </form>
    {list.length > 1 && <div className="tsub"><label>Ordenar por<select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}><option value="priority">Relevância</option><option value="effort">Tempo estimado</option><option value="due">Data limite</option></select></label></div>}
    <div className="tasks-list" ref={listRef}>{list.length ? list.map(t => { const [lbl, late] = due(t.due, today)
      return <div key={t.id} data-id={t.id} className={'tk' + (t.d ? ' dn' : '')} style={{ ['--c' as string]: PC[t.p] }}>
        {open && <span className="hnd" title="Arrastar" onPointerDown={e => dragStart(e, t.id)}>⋮⋮</span>}
        <input className="rc" type="checkbox" checked={t.d} aria-label="Concluída" onChange={e => patch(t.id, x => { x.d = e.target.checked })} />
        <span className="tt2" onClick={() => setEd({ ...t })}>{t.t}</span>
        {t.n && <small className="tm" title="Tem notas">≡</small>}
        {lbl && <small className={'tm' + (late ? ' late' : '')}>{lbl}</small>}
        {t.effort && <button className="lt" style={{ ['--c' as string]: LV[t.effort].c }} title={LV[t.effort].t}>{LV[t.effort].n}</button>}
        <button className="pp2" onClick={() => patch(t.id, x => { x.p = NX[x.p] })}>{PN[t.p]}</button>
        <button className="x" aria-label="Remover" onClick={() => update(d => { d.tasks = d.tasks.filter(x => x.id !== t.id) })}>✕</button>
      </div> }) : <div className="tem">{open ? 'Tudo em dia. Adiciona a próxima tarefa acima.' : 'Ainda nada concluído.'}</div>}</div>
    {activeWorkspaceId !== 'geral' && <div className="task-notes">
      <div className="task-notes-head"><label htmlFor="task-notes">Tópicos e notas</label>{editingNotes ? <div className="acts"><button type="button" className="btn" onClick={() => { setNoteText(data.taskNotes?.[activeWorkspaceId] ?? ''); setEditingNotes(false) }}>Cancelar</button><button type="button" className="btn pri" onClick={() => { update(d => { d.taskNotes = { ...(d.taskNotes ?? {}), [activeWorkspaceId]: noteText } }); setEditingNotes(false) }}>Guardar</button></div> : <button type="button" className="btn" onClick={() => setEditingNotes(true)}>{data.taskNotes?.[activeWorkspaceId] ? 'Editar' : 'Escrever'}</button>}</div>
      {editingNotes ? <><div className="note-toolbar" aria-label="Formatação do texto">
        <button type="button" title="Negrito" aria-label="Negrito" onClick={() => formatNote('**')}>B</button><button type="button" title="Itálico" aria-label="Itálico" onClick={() => formatNote('_')}><i>I</i></button><span />
        <button type="button" title="Título" aria-label="Título" onClick={() => formatNote('## ', '', true)}>H</button><button type="button" title="Citação" aria-label="Citação" onClick={() => formatNote('> ', '', true)}>❞</button><button type="button" title="Código" aria-label="Código" onClick={() => formatNote('`')}>{'<>'}</button><span />
        <button type="button" title="Lista com pontos" aria-label="Lista com pontos" onClick={() => formatNote('- ', '', true)}>• Lista</button><button type="button" title="Lista numerada" aria-label="Lista numerada" onClick={() => formatNote('1. ', '', true)}>1. Lista</button><button type="button" title="Lista de tarefas" aria-label="Lista de tarefas" onClick={() => formatNote('- [ ] ', '', true)}>☐ Tarefa</button>
      </div><textarea ref={noteEditor} id="task-notes" rows={5} maxLength={5000} value={noteText} placeholder="Escreve tópicos ou texto… Usa a barra para formatar." onChange={e => setNoteText(e.target.value)} autoFocus /></> : <div className="task-notes-content">{data.taskNotes?.[activeWorkspaceId] || <span className="mu">Ainda não há tópicos ou notas neste espaço.</span>}</div>}
      <small>Notas independentes do espaço “{workspace?.name ?? 'Geral'}”.</small>
    </div>}
    {ed && <Modal title="Editar tarefa" onClose={() => setEd(null)}>
      <form className="fgrid" onSubmit={e => { e.preventDefault(); const v = ed.t.trim(); if (!v) return; patch(ed.id, x => Object.assign(x, { ...ed, t: v })); setEd(null) }}>
        <label className="w">Nome<input value={ed.t} required maxLength={90} onChange={e => setEd({ ...ed, t: e.target.value })} /></label>
        <label>Data limite<input type="date" value={ed.due} onChange={e => setEd({ ...ed, due: e.target.value })} /></label>
        <label>Prioridade<select value={ed.p} onChange={e => setEd({ ...ed, p: e.target.value as Priority })}>{(['urgente', 'alta', 'media', 'baixa'] as Priority[]).map(k => <option key={k} value={k}>{PN[k]}</option>)}</select></label>
        <label className="w">Espaço de trabalho<select value={ed.workspaceId ?? 'geral'} onChange={e => setEd({ ...ed, workspaceId: e.target.value })}>{data.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label className="w">Esforço<select value={ed.effort ?? ''} onChange={e => setEd({ ...ed, effort: e.target.value as Effort | '' })}><option value="">Sem definir</option>{LK.map(k => <option key={k} value={k}>{LV[k].n} — {LV[k].t}</option>)}</select></label>
        <label className="w">Notas<textarea rows={3} maxLength={400} value={ed.n ?? ''} onChange={e => setEd({ ...ed, n: e.target.value })} /></label>
        <label className="w ck"><input type="checkbox" checked={ed.d} onChange={e => setEd({ ...ed, d: e.target.checked })} /> Concluída</label>
        <div className="acts w"><button type="button" className="btn dng" onClick={() => { const id = ed.id; update(d => { d.tasks = d.tasks.filter(x => x.id !== id) }); setEd(null) }}>Apagar</button><span className="sp" /><button type="button" className="btn" onClick={() => setEd(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
