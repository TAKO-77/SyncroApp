import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPE } from 'react'
import { ChevronRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Modal, uid, useIsPhone, useNow } from '../../components/common'
import { useCompletion } from '../../components/useCompletion'
import type { Effort, Priority, Task } from '../../types'
import { NoteCard } from './NoteCard'
import { NoteGrid } from './NoteGrid'
import { SubtaskList } from './SubtaskList'
import { AutoGrowTextarea } from '../../components/AutoGrowTextarea'
import { addSubtaskDraft, applySubtaskEdits, hasBlankSubtask, splitSubtasks, withoutTask, type SubtaskDraft } from '../../lib/subtasks'
import { TASK_NOTES_WARN, taskNotesCount, taskNotesError } from '../../lib/taskNotes'
import { DatePicker } from '../../components/DatePicker'
import { TimePicker } from '../../components/TimePicker'
import { confirmDialog } from '../../store/confirm'
import { Select } from '../../components/Select'
import { LK, LV, PC, PN, PRIORITIES, TASK_TITLE_MAX, dueLabel, markDone, newTask, nextPriority } from '../../lib/tasks'
import { dueForTime } from '../../lib/taskDue'
import { hm, minuteOfDay, todayIso } from '../../lib/dates'
import { readItem, writeJson } from '../../lib/storage'
import { Glider } from '../../components/Glider'
import { movedOrder, orderByIds, parseOrder, parseSort, parseSortMap, reorderTasks, sortTasks, withSort, withoutSort, type SortBy, type SortMap } from '../../lib/taskSort'

const SORT_KEY = 'syncro-task-sort'
const WORKSPACE_SORT_KEY = 'syncro-task-sort-by-workspace'
const GERAL_ORDER_KEY = 'syncro-task-order-geral'
const PRIORITY_OPTIONS = PRIORITIES.map(k => ({ value: k, label: PN[k], color: PC[k] }))
const EFFORT_OPTIONS: { value: Effort | ''; label: string; hint?: string; color?: string }[] = [{ value: '', label: 'Sem definir' }, ...LK.map(k => ({ value: k, label: LV[k].n, hint: LV[k].t, color: LV[k].c }))]
const BURST = Array.from({ length: 10 }, (_, i) => i * 36)

export function Tarefas({ workspaceId, setWorkspaceId }: { workspaceId: string; setWorkspaceId: (id: string) => void }) {
  const { data, update } = useStore()
  const phone = useIsPhone()
  const now = useNow(), today = todayIso(), nowTime = hm(minuteOfDay(now))
  const [open, setOpen] = useState(true)
  const newTaskInput = useRef<HTMLInputElement>(null)
  const [txt, setTxt] = useState(''); const [p, setP] = useState<Priority>('media'); const [du, setDu] = useState(''); const [duTime, setDuTime] = useState(''); const [effort, setEffort] = useState<Effort | ''>('')
  const [ed, setEd] = useState<Task | null>(null)
  // The subtasks when the editor opened, to tell this edit apart from what a sync brings in meanwhile.
  const [edBaseSubtasks, setEdBaseSubtasks] = useState<SubtaskDraft[]>([])
  const [edSubtasks, setEdSubtasks] = useState<SubtaskDraft[]>([])
  const [edNewSubtask, setEdNewSubtask] = useState('')
  const { main, children } = splitSubtasks(data.tasks)
  const openEditor = (t: Task) => {
    const drafts = (children.get(t.id) ?? []).map(({ id, t: title, d }) => ({ id, t: title, d }))
    setEd({ ...t }); setEdBaseSubtasks(drafts); setEdSubtasks(drafts); setEdNewSubtask('')
  }
  // A subtask cannot have subtasks of its own, and it follows its main task's workspace.
  const editingSubtask = !!ed && !main.some(t => t.id === ed.id)
  const saveEditor = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!ed) return
    const v = ed.t.trim()
    if (!v) return
    if (hasBlankSubtask(edSubtasks) || taskNotesError(ed.n)) { e.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return }
    // A title typed but not yet added is still something the user meant to keep.
    const drafts = addSubtaskDraft(edSubtasks, edNewSubtask, uid('t')) ?? edSubtasks
    update(d => {
      const x = d.tasks.find(t => t.id === ed.id)
      if (!x) return
      Object.assign(x, { ...ed, t: v })
      if (!editingSubtask) applySubtaskEdits(d, x, edBaseSubtasks, drafts, today)
    })
    setEd(null)
  }
  const [expanded, setExpanded] = useState<string[]>([])
  const toggleExpanded = (id: string) => setExpanded(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  const [workspaceMenu, setWorkspaceMenu] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [sorts, setSorts] = useState<SortMap>(() => parseSortMap(readItem(WORKSPACE_SORT_KEY)))
  const [oldSort] = useState<SortBy>(() => parseSort(readItem(SORT_KEY)))
  useEffect(() => writeJson(WORKSPACE_SORT_KEY, sorts), [sorts])
  // Geral shows every workspace, so its custom order is kept apart from the order of data.tasks.
  const [geralOrder, setGeralOrder] = useState<string[] | null>(() => parseOrder(readItem(GERAL_ORDER_KEY)))
  useEffect(() => { if (geralOrder) writeJson(GERAL_ORDER_KEY, geralOrder) }, [geralOrder])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // Tasks being ticked off play the completion animation before they leave the pending list.
  const { completing, start: startCompletion, cancel: cancelCompletion } = useCompletion(id => patch(id, x => markDone(x, true)))
  const toggleDone = (id: string, done: boolean) => {
    if (!done || !open) { if (!cancelCompletion(id)) patch(id, x => markDone(x, done)); return }
    startCompletion(id, listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`))
  }
  const listRef = useRef<HTMLDivElement>(null)
  const dragStart = (e: RPE, id: string) => {
    // A row moves among its siblings, with its subtasks: main tasks in the list, subtasks under their main task.
    const siblings = e.currentTarget.closest('.tk-group')?.parentElement
    if (e.button !== 0 || !siblings) return
    e.preventDefault()
    const rows = [...siblings.children] as HTMLElement[], i0 = rows.findIndex(r => r.dataset.group === id), n = rows.length
    if (n < 2) return
    // Rows can differ in height: the dragged row takes a neighbour's place once its edge passes that neighbour's middle.
    const row = rows[i0], sy = e.clientY, sc = scrollY, tops = rows.map(r => r.offsetTop), middles = rows.map((r, k) => tops[k] + r.offsetHeight / 2)
    const step = row.offsetHeight + rows[1].offsetTop - rows[0].offsetTop - rows[0].offsetHeight
    let ni = i0; row.classList.add('drag')
    const mv = (m: PointerEvent) => {
      if (m.clientY < 70) scrollBy(0, -14); else if (m.clientY > innerHeight - 70) scrollBy(0, 14)
      const dy = m.clientY - sy + (scrollY - sc), top = tops[i0] + dy, bottom = top + row.offsetHeight
      ni = i0
      for (let k = i0 + 1; k < n && bottom > middles[k]; k++) ni = k
      for (let k = i0 - 1; k >= 0 && top < middles[k]; k--) ni = k
      row.style.transform = `translateY(${dy}px)`
      rows.forEach((r, k) => { if (r !== row) r.style.transform = i0 < ni && k > i0 && k <= ni ? `translateY(${-step}px)` : i0 > ni && k >= ni && k < i0 ? `translateY(${step}px)` : '' })
    }
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      rows.forEach(r => { r.style.transform = ''; r.classList.remove('drag') })
      if (ni === i0) return
      const ids = rows.map(r => r.dataset.group as string), [mvd] = ids.splice(i0, 1); ids.splice(ni, 0, mvd)
      const inMainList = siblings === listRef.current
      if (inMainList && activeWorkspaceId === 'geral') setGeralOrder(movedOrder(orderByIds(main, geralOrder ?? []).map(t => t.id), ids))
      else {
        // Geral keeps the order it shows now when another workspace changes data.tasks.
        if (inMainList && !geralOrder) setGeralOrder(main.map(t => t.id))
        update(d => { d.tasks = reorderTasks(d.tasks, ids) })
      }
      // The stored order now matches what the user arranged, so keep showing it.
      if (inMainList) setSort('custom')
    }
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const workspace = data.workspaces.find(w => w.id === workspaceId) ?? data.workspaces[0]
  const activeWorkspaceId = workspace?.id ?? 'geral'
  const sortBy = sorts[activeWorkspaceId] ?? oldSort
  const setSort = (sort: SortBy) => setSorts(map => withSort(map, activeWorkspaceId, sort))
  useEffect(() => setEditingNoteId(null), [activeWorkspaceId])
  const notes = data.notes.filter(n => n.workspaceId === activeWorkspaceId)
  const scoped = workspace?.id === 'geral' ? main : main.filter(t => (t.workspaceId ?? 'geral') === workspace?.id)
  const nOpen = scoped.filter(t => !t.d).length
  const list = sortTasks((sortBy === 'custom' && activeWorkspaceId === 'geral' && geralOrder ? orderByIds(scoped, geralOrder) : scoped).filter(t => open ? !t.d : t.d), sortBy)
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
    update(d => { d.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'geral' }); d.workspaces = d.workspaces.filter(w => w.id !== id); d.notes = d.notes.filter(n => n.workspaceId !== id) }); setSorts(map => withoutSort(map, id))
    setWorkspaceId('geral')
  }
  const add = (e: FormEvent) => { e.preventDefault(); const v = txt.trim(); if (!v) return; update(d => { d.tasks.push(newTask(uid('t'), { t: v, due: du, dueTime: duTime, p, effort, workspaceId: activeWorkspaceId })) }); setTxt(''); setDu(''); setDuTime(''); setEffort(''); setP('media'); setOpen(true) }
  const patch = (id: string, fn: (t: Task) => void) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) fn(t) })
  const addNote = () => { const id = uid('n'); update(d => { d.notes.push({ id, workspaceId: activeWorkspaceId, text: '' }) }); setEditingNoteId(id) }
  const saveNote = (id: string, text: string) => update(d => { const n = d.notes.find(x => x.id === id); if (n) n.text = text })
  const deleteNote = (id: string) => update(d => { d.notes = d.notes.filter(n => n.id !== id) })

  const dueDate = <DatePicker value={du} aria-label="Data limite" onChange={v => { setDu(v); if (!v) setDuTime('') }} className={phone ? undefined : 'auto'} />
  const dueClock = <TimePicker value={duTime} aria-label="Hora limite" onChange={v => { setDuTime(v); setDu(dueForTime(du, v, today)) }} className={phone ? undefined : 'auto'} />

  return <section className="page tasks-page"><div className="tasks-main">
    <div className="head2"><h2>Tarefas</h2><div className="seg"><button aria-pressed={open} onClick={() => setOpen(true)}>Pendentes {nOpen}</button><button aria-pressed={!open} onClick={() => setOpen(false)}>Concluídas {scoped.length - nOpen}</button><Glider /></div></div>
    <div className="workspace-bar"><div className="workspace-picker">
      <button className="workspace-current" type="button" aria-expanded={workspaceMenu} onClick={() => setWorkspaceMenu(!workspaceMenu)}><span className="workspace-mark">▦</span><span><small>Espaço de trabalho</small><b>{workspace?.name ?? 'Geral'}</b></span><span className="workspace-chevron">⌄</span></button>
      {workspaceMenu && <div className="workspace-menu">
        {data.workspaces.map(w => <div className={'workspace-option' + (workspace?.id === w.id ? ' selected' : '')} key={w.id}>
          <button type="button" onClick={() => { setWorkspaceId(w.id); setWorkspaceMenu(false) }}><span className="workspace-option-icon">{w.id === 'geral' ? '▦' : '▣'}</span><span>{w.name}{w.id === 'geral' && <small>Todas as tarefas</small>}</span></button>
          {w.id !== 'geral' && <button type="button" className="workspace-delete" aria-label={`Eliminar ${w.name}`} title="Eliminar espaço" onClick={() => void deleteWorkspace(w.id)}>×</button>}
        </div>)}
        <form className="workspace-create" onSubmit={addWorkspace}><input value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} maxLength={32} placeholder="Nome do novo espaço" aria-label="Nome do novo espaço" required /><button className="btn pri" type="submit">+ Criar</button></form>
      </div>}
    </div></div>
    <form className="tadd" onSubmit={add}>
      <div className="tadd-text">
        <input ref={newTaskInput} value={txt} maxLength={TASK_TITLE_MAX} placeholder="Nova tarefa…" aria-label="Nova tarefa" required autoComplete="off" onChange={e => setTxt(e.target.value)} />
        {txt && <button type="button" className="x tadd-clear" title="Limpar texto" aria-label="Limpar texto" onClick={() => { setTxt(''); newTaskInput.current?.focus() }}>✕</button>}
      </div>
      {phone ? <div className="tadd-fields">
        <label>Esforço<Select<Effort | ''> value={effort} onChange={setEffort} options={EFFORT_OPTIONS} /></label>
        <label>Prioridade<Select<Priority> value={p} onChange={setP} options={PRIORITY_OPTIONS} /></label>
        <label>Data limite{dueDate}</label>
        <label>Hora limite{dueClock}</label>
        <button className="btn pri" type="submit">Adicionar</button>
      </div> : <>
      <div className="chips"><span className="mu">Esforço</span>{LK.map(k => <button key={k} type="button" className="chip" aria-pressed={effort === k} title={LV[k].t} style={{ ['--c' as string]: LV[k].c }} onClick={() => setEffort(effort === k ? '' : k)}>{LV[k].n}</button>)}</div>
      <div className="chips"><span className="mu">Prioridade</span>{PRIORITIES.map(k => <button key={k} type="button" className="chip" aria-pressed={p === k} style={{ ['--c' as string]: PC[k] }} onClick={() => setP(k)}>{PN[k]}</button>)}
        {dueDate}
        {dueClock}<button className="btn pri sp-l" type="submit">Adicionar</button></div>
      </>}
    </form>
    {list.length > 1 && <div className="tsub"><label>Ordenar por<Select<SortBy> value={sortBy} onChange={setSort} options={[{ value: 'priority', label: 'Relevância' }, { value: 'effort', label: 'Tempo estimado' }, { value: 'due', label: 'Data limite' }, { value: 'custom', label: 'Customizado' }]} /></label></div>}
    <div className="tasks-list" ref={listRef}>{list.length ? list.map(t => {
      const subs = children.get(t.id) ?? [], isExpanded = subs.length > 0 && expanded.includes(t.id)
      return <div key={t.id} data-group={t.id} className="tk-group">
        {renderRow(t, subs, isExpanded)}
        {isExpanded && <div id={`subtasks-${t.id}`} className="tk-children" role="group" aria-label={`Subtarefas de ${t.t}`}>
          {subs.map(s => <div key={s.id} data-group={s.id} className="tk-group">{renderRow(s, [], false, true)}</div>)}
        </div>}
      </div>
    }) : <div className="tem">{open ? 'Tudo em dia. Adiciona a próxima tarefa acima.' : 'Ainda nada concluído.'}</div>}</div>
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
    {ed && <Modal title={editingSubtask ? 'Editar subtarefa' : 'Editar tarefa'} onClose={() => setEd(null)}>
      <form className="fgrid" onSubmit={saveEditor}>
        <label className="w">Nome<input value={ed.t} required maxLength={TASK_TITLE_MAX} onChange={e => setEd({ ...ed, t: e.target.value })} /></label>
        {!editingSubtask && <SubtaskList subtasks={edSubtasks} onChange={setEdSubtasks} newTitle={edNewSubtask} onNewTitle={setEdNewSubtask} />}
        <label>Data limite<DatePicker value={ed.due} onChange={due => setEd({ ...ed, due, dueTime: due ? ed.dueTime : '' })} /></label>
        <label>Hora limite<TimePicker value={ed.dueTime ?? ''} onChange={dueTime => setEd({ ...ed, dueTime, due: dueForTime(ed.due, dueTime, today) })} /></label>
        <label className="w">Prioridade<Select<Priority> value={ed.p} onChange={p => setEd({ ...ed, p })} options={PRIORITY_OPTIONS} /></label>
        {!editingSubtask && <label className="w">Espaço de trabalho<Select value={ed.workspaceId ?? 'geral'} onChange={workspaceId => setEd({ ...ed, workspaceId })} options={data.workspaces.map(w => ({ value: w.id, label: w.name }))} /></label>}
        <label className="w">Esforço<Select<Effort | ''> value={ed.effort ?? ''} onChange={effort => setEd({ ...ed, effort })} options={EFFORT_OPTIONS} /></label>
        <div className="w task-notes-field">
          <label>Notas<AutoGrowTextarea value={ed.n ?? ''} aria-invalid={!!taskNotesError(ed.n)} aria-describedby={taskNotesError(ed.n) ? 'task-notes-error' : undefined} onChange={e => setEd({ ...ed, n: e.target.value })} /></label>
          {taskNotesError(ed.n) ? <small id="task-notes-error" className="field-error" role="alert">{taskNotesError(ed.n)}</small>
            : (ed.n ?? '').length >= TASK_NOTES_WARN && <small className="mu num">{taskNotesCount(ed.n)}</small>}
        </div>
        <label className="w ck"><input type="checkbox" checked={ed.d} onChange={e => setEd({ ...ed, d: e.target.checked })} /> Concluída</label>
        <div className="acts w"><button type="button" className="btn dng" onClick={() => { const id = ed.id; update(d => { d.tasks = withoutTask(d.tasks, id) }); setEd(null) }}>Apagar</button><span className="sp" /><button type="button" className="btn" onClick={() => setEd(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>

  /** One task row. A subtask stays visible when ticked, struck through under its main task. */
  function renderRow(t: Task, subs: Task[], isExpanded: boolean, isSubtask = false) {
    const [lbl, late] = dueLabel(t, today, nowTime)
    const done = completing.includes(t.id)
    return <div data-id={t.id} className={'tk' + (t.d ? ' dn' : '') + (done ? ' completing' : '')} style={{ ['--c' as string]: PC[t.p] }}>
        {open && <span className="hnd" title="Arrastar" onPointerDown={e => dragStart(e, t.id)}>⋮⋮</span>}
        <span className="rc-wrap"><input className="rc" type="checkbox" checked={t.d || done} aria-label="Concluída" onChange={e => { const checked = e.target.checked; if (isSubtask) patch(t.id, x => markDone(x, checked)); else toggleDone(t.id, checked) }} />
          {done && <span className="burst" aria-hidden="true">{BURST.map(a => <i key={a} style={{ ['--a' as string]: `${a}deg` }} />)}</span>}</span>
        <span className="tt2" onClick={() => openEditor(t)}><span className="tt2-text">{t.t}</span></span>
        <span className="tk-meta">
          {subs.length > 0 && <button type="button" className="tk-expand" aria-expanded={isExpanded} aria-controls={isExpanded ? `subtasks-${t.id}` : undefined} aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} subtarefas de ${t.t}, ${subs.filter(s => s.d).length} de ${subs.length} concluídas`} title={isExpanded ? 'Recolher subtarefas' : 'Ver subtarefas'} onClick={() => toggleExpanded(t.id)}><ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" /><span className="num">{subs.filter(s => s.d).length}/{subs.length}</span></button>}
          {t.n && <small className="tm" title="Tem notas">≡</small>}
          {lbl && <small className={'tm' + (late ? ' late' : '')}>{lbl}</small>}
          {t.effort && <button className="lt" style={{ ['--c' as string]: LV[t.effort].c }} title={LV[t.effort].t}>{LV[t.effort].n}</button>}
          <button className="pp2" onClick={() => patch(t.id, x => { x.p = nextPriority(x.p) })}>{PN[t.p]}</button>
        </span>
        <button className="x" aria-label="Remover" onClick={() => update(d => { d.tasks = withoutTask(d.tasks, t.id) })}>✕</button>
      </div>
  }
}
