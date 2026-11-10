import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPE } from 'react'
import { ChevronRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../lib/i18n/useT'
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
import { EFFORT_COLORS, LK, PC, PRIORITIES, TASK_TITLE_MAX, dueLabel, effortHint, effortLabel, markDone, newTask, nextPriority, priorityLabel, workspaceLabel } from '../../lib/tasks'
import { dueForTime } from '../../lib/taskDue'
import { hm, minuteOfDay, todayIso } from '../../lib/dates'
import { readItem, writeJson } from '../../lib/storage'
import { Glider } from '../../components/Glider'
import { movedOrder, orderByIds, parseOrder, parseSort, parseSortMap, reorderTasks, sortTasks, withSort, withoutSort, type SortBy, type SortMap } from '../../lib/taskSort'

const SORT_KEY = 'syncro-task-sort'
const WORKSPACE_SORT_KEY = 'syncro-task-sort-by-workspace'
const GERAL_ORDER_KEY = 'syncro-task-order-geral'
const BURST = Array.from({ length: 10 }, (_, i) => i * 36)

export function Tarefas({ workspaceId, setWorkspaceId }: { workspaceId: string; setWorkspaceId: (id: string) => void }) {
  const { data, update } = useStore()
  const { t: tl, lang } = useT()
  const PRIORITY_OPTIONS = PRIORITIES.map(k => ({ value: k, label: priorityLabel(k, lang), color: PC[k] }))
  const EFFORT_OPTIONS: { value: Effort | ''; label: string; hint?: string; color?: string }[] = [{ value: '', label: tl('tarefas.effort.none') }, ...LK.map(k => ({ value: k, label: effortLabel(k, lang), hint: effortHint(k, lang), color: EFFORT_COLORS[k] }))]
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
    if (hasBlankSubtask(edSubtasks) || taskNotesError(ed.n, lang)) { e.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return }
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
  const workspaceName = workspace ? workspaceLabel(workspace, lang) : tl('tarefas.workspace.geral')
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
    if (!await confirmDialog({ title: tl('tarefas.workspace.deleteTitle', { name: target.name }), message: tl('tarefas.workspace.deleteMessage'), confirmLabel: tl('tarefas.workspace.deleteConfirm'), danger: true })) return
    update(d => { d.tasks.forEach(t => { if (t.workspaceId === id) t.workspaceId = 'geral' }); d.workspaces = d.workspaces.filter(w => w.id !== id); d.notes = d.notes.filter(n => n.workspaceId !== id) }); setSorts(map => withoutSort(map, id))
    setWorkspaceId('geral')
  }
  const add = (e: FormEvent) => { e.preventDefault(); const v = txt.trim(); if (!v) return; update(d => { d.tasks.push(newTask(uid('t'), { t: v, due: du, dueTime: duTime, p, effort, workspaceId: activeWorkspaceId })) }); setTxt(''); setDu(''); setDuTime(''); setEffort(''); setP('media'); setOpen(true) }
  const patch = (id: string, fn: (t: Task) => void) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) fn(t) })
  const addNote = () => { const id = uid('n'); update(d => { d.notes.push({ id, workspaceId: activeWorkspaceId, text: '' }) }); setEditingNoteId(id) }
  const saveNote = (id: string, text: string) => update(d => { const n = d.notes.find(x => x.id === id); if (n) n.text = text })
  const deleteNote = (id: string) => update(d => { d.notes = d.notes.filter(n => n.id !== id) })

  const dueDate = <DatePicker value={du} aria-label={tl('tarefas.dueDate')} onChange={v => { setDu(v); if (!v) setDuTime('') }} className={phone ? undefined : 'auto'} />
  const dueClock = <TimePicker value={duTime} aria-label={tl('tarefas.dueTime')} onChange={v => { setDuTime(v); setDu(dueForTime(du, v, today)) }} className={phone ? undefined : 'auto'} />

  return <section className="page tasks-page"><div className="tasks-main">
    <div className="head2"><h2>{tl('tarefas.title')}</h2><div className="seg"><button aria-pressed={open} onClick={() => setOpen(true)}>{tl('tarefas.pending')} {nOpen}</button><button aria-pressed={!open} onClick={() => setOpen(false)}>{tl('tarefas.completed')} {scoped.length - nOpen}</button><Glider /></div></div>
    <div className="workspace-bar"><div className="workspace-picker">
      <button className="workspace-current" type="button" aria-expanded={workspaceMenu} onClick={() => setWorkspaceMenu(!workspaceMenu)}><span className="workspace-mark">▦</span><span><small>{tl('tarefas.workspace.label')}</small><b>{workspaceName}</b></span><span className="workspace-chevron">⌄</span></button>
      {workspaceMenu && <div className="workspace-menu">
        {data.workspaces.map(w => <div className={'workspace-option' + (workspace?.id === w.id ? ' selected' : '')} key={w.id}>
          <button type="button" onClick={() => { setWorkspaceId(w.id); setWorkspaceMenu(false) }}><span className="workspace-option-icon">{w.id === 'geral' ? '▦' : '▣'}</span><span>{workspaceLabel(w, lang)}{w.id === 'geral' && <small>{tl('tarefas.workspace.all')}</small>}</span></button>
          {w.id !== 'geral' && <button type="button" className="workspace-delete" aria-label={tl('tarefas.workspace.deleteAria', { name: w.name })} title={tl('tarefas.workspace.deleteHint')} onClick={() => void deleteWorkspace(w.id)}>×</button>}
        </div>)}
        <form className="workspace-create" onSubmit={addWorkspace}><input value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} maxLength={32} placeholder={tl('tarefas.workspace.newName')} aria-label={tl('tarefas.workspace.newName')} required /><button className="btn pri" type="submit">{tl('tarefas.workspace.create')}</button></form>
      </div>}
    </div></div>
    <form className="tadd" onSubmit={add}>
      <div className="tadd-text">
        <input ref={newTaskInput} value={txt} maxLength={TASK_TITLE_MAX} placeholder={tl('tarefas.new.placeholder')} aria-label={tl('tarefas.new.placeholder').replace('…', '')} required autoComplete="off" onChange={e => setTxt(e.target.value)} />
        {txt && <button type="button" className="x tadd-clear" title={tl('tarefas.new.clear')} aria-label={tl('tarefas.new.clear')} onClick={() => { setTxt(''); newTaskInput.current?.focus() }}>✕</button>}
      </div>
      {phone ? <div className="tadd-fields">
        <label>{tl('tarefas.effort')}<Select<Effort | ''> value={effort} onChange={setEffort} options={EFFORT_OPTIONS} /></label>
        <label>{tl('tarefas.priorityLabel')}<Select<Priority> value={p} onChange={setP} options={PRIORITY_OPTIONS} /></label>
        <label>{tl('tarefas.dueDate')}{dueDate}</label>
        <label>{tl('tarefas.dueTime')}{dueClock}</label>
        <button className="btn pri" type="submit">{tl('tarefas.add')}</button>
      </div> : <>
      <div className="chips"><span className="mu">{tl('tarefas.effort')}</span>{LK.map(k => <button key={k} type="button" className="chip" aria-pressed={effort === k} title={effortHint(k, lang)} style={{ ['--c' as string]: EFFORT_COLORS[k] }} onClick={() => setEffort(effort === k ? '' : k)}>{effortLabel(k, lang)}</button>)}</div>
      <div className="chips"><span className="mu">{tl('tarefas.priorityLabel')}</span>{PRIORITIES.map(k => <button key={k} type="button" className="chip" aria-pressed={p === k} style={{ ['--c' as string]: PC[k] }} onClick={() => setP(k)}>{priorityLabel(k, lang)}</button>)}
        {dueDate}
        {dueClock}<button className="btn pri sp-l" type="submit">{tl('tarefas.add')}</button></div>
      </>}
    </form>
    {list.length > 1 && <div className="tsub"><label>{tl('tarefas.sortBy')}<Select<SortBy> value={sortBy} onChange={setSort} options={[{ value: 'priority', label: tl('tarefas.sort.priority') }, { value: 'effort', label: tl('tarefas.sort.effort') }, { value: 'due', label: tl('tarefas.sort.due') }, { value: 'custom', label: tl('tarefas.sort.custom') }]} /></label></div>}
    <div className="tasks-list" ref={listRef}>{list.length ? list.map(t => {
      const subs = children.get(t.id) ?? [], isExpanded = subs.length > 0 && expanded.includes(t.id)
      return <div key={t.id} data-group={t.id} className="tk-group">
        {renderRow(t, subs, isExpanded)}
        {isExpanded && <div id={`subtasks-${t.id}`} className="tk-children" role="group" aria-label={tl('tarefas.subtasksOf', { title: t.t })}>
          {subs.map(s => <div key={s.id} data-group={s.id} className="tk-group">{renderRow(s, [], false, true)}</div>)}
        </div>}
      </div>
    }) : <div className="tem">{open ? tl('tarefas.empty.open') : tl('tarefas.empty.done')}</div>}</div>
    </div>
    {activeWorkspaceId !== 'geral' && <div className="task-notes">
      <div className="task-notes-head"><label>{tl('tarefas.notes.title')}</label><button type="button" className="btn" onClick={addNote}>{tl('tarefas.notes.new')}</button></div>
      {notes.length ? <NoteGrid>{notes.map(n => <NoteCard key={n.id} text={n.text} editing={editingNoteId === n.id}
        onEdit={() => setEditingNoteId(n.id)}
        onSave={text => { saveNote(n.id, text); if (editingNoteId === n.id) setEditingNoteId(null) }}
        onCancel={() => { if (!n.text) deleteNote(n.id); setEditingNoteId(null) }}
        onDelete={async () => { if (!n.text || await confirmDialog({ title: tl('tarefas.notes.deleteTitle'), message: tl('tarefas.notes.deleteMessage'), confirmLabel: tl('tarefas.delete'), danger: true })) deleteNote(n.id) }} />)}</NoteGrid>
        : <div className="task-notes-content"><span className="mu">{tl('tarefas.notes.none')}</span></div>}
      <small>{tl('tarefas.notes.independent', { name: workspaceName })}</small>
    </div>}
    {ed && <Modal title={editingSubtask ? tl('tarefas.edit.subtask') : tl('tarefas.edit.task')} onClose={() => setEd(null)}>
      <form className="fgrid" onSubmit={saveEditor}>
        <label className="w">{tl('tarefas.edit.name')}<input value={ed.t} required maxLength={TASK_TITLE_MAX} onChange={e => setEd({ ...ed, t: e.target.value })} /></label>
        {!editingSubtask && <SubtaskList subtasks={edSubtasks} onChange={setEdSubtasks} newTitle={edNewSubtask} onNewTitle={setEdNewSubtask} />}
        <label>{tl('tarefas.dueDate')}<DatePicker value={ed.due} onChange={due => setEd({ ...ed, due, dueTime: due ? ed.dueTime : '' })} /></label>
        <label>{tl('tarefas.dueTime')}<TimePicker value={ed.dueTime ?? ''} onChange={dueTime => setEd({ ...ed, dueTime, due: dueForTime(ed.due, dueTime, today) })} /></label>
        <label className="w">{tl('tarefas.priorityLabel')}<Select<Priority> value={ed.p} onChange={p => setEd({ ...ed, p })} options={PRIORITY_OPTIONS} /></label>
        {!editingSubtask && <label className="w">{tl('tarefas.workspace.label')}<Select value={ed.workspaceId ?? 'geral'} onChange={workspaceId => setEd({ ...ed, workspaceId })} options={data.workspaces.map(w => ({ value: w.id, label: workspaceLabel(w, lang) }))} /></label>}
        <label className="w">{tl('tarefas.effort')}<Select<Effort | ''> value={ed.effort ?? ''} onChange={effort => setEd({ ...ed, effort })} options={EFFORT_OPTIONS} /></label>
        <div className="w task-notes-field">
          <label>{tl('tarefas.edit.notes')}<AutoGrowTextarea value={ed.n ?? ''} aria-invalid={!!taskNotesError(ed.n, lang)} aria-describedby={taskNotesError(ed.n, lang) ? 'task-notes-error' : undefined} onChange={e => setEd({ ...ed, n: e.target.value })} /></label>
          {taskNotesError(ed.n, lang) ? <small id="task-notes-error" className="field-error" role="alert">{taskNotesError(ed.n, lang)}</small>
            : (ed.n ?? '').length >= TASK_NOTES_WARN && <small className="mu num">{taskNotesCount(ed.n, lang)}</small>}
        </div>
        <label className="w ck"><input type="checkbox" checked={ed.d} onChange={e => setEd({ ...ed, d: e.target.checked })} /> {tl('tarefas.edit.done')}</label>
        <div className="acts w"><button type="button" className="btn dng" onClick={() => { const id = ed.id; update(d => { d.tasks = withoutTask(d.tasks, id) }); setEd(null) }}>{tl('tarefas.delete')}</button><span className="sp" /><button type="button" className="btn" onClick={() => setEd(null)}>{tl('tarefas.cancel')}</button><button className="btn pri" type="submit">{tl('tarefas.save')}</button></div>
      </form></Modal>}
  </section>

  /** One task row. A subtask stays visible when ticked, struck through under its main task. */
  function renderRow(t: Task, subs: Task[], isExpanded: boolean, isSubtask = false) {
    const [lbl, late] = dueLabel(t, today, nowTime, lang)
    const done = completing.includes(t.id)
    return <div data-id={t.id} className={'tk' + (t.d ? ' dn' : '') + (done ? ' completing' : '')} style={{ ['--c' as string]: PC[t.p] }}>
        {open && <span className="hnd" title={tl('tarefas.drag')} onPointerDown={e => dragStart(e, t.id)}>⋮⋮</span>}
        <span className="rc-wrap"><input className="rc" type="checkbox" checked={t.d || done} aria-label={tl('tarefas.doneAria')} onChange={e => { const checked = e.target.checked; if (isSubtask) patch(t.id, x => markDone(x, checked)); else toggleDone(t.id, checked) }} />
          {done && <span className="burst" aria-hidden="true">{BURST.map(a => <i key={a} style={{ ['--a' as string]: `${a}deg` }} />)}</span>}</span>
        <span className="tt2" onClick={() => openEditor(t)}><span className="tt2-text">{t.t}</span></span>
        <span className="tk-meta">
          {subs.length > 0 && <button type="button" className="tk-expand" aria-expanded={isExpanded} aria-controls={isExpanded ? `subtasks-${t.id}` : undefined} aria-label={tl(isExpanded ? 'tarefas.collapseAria' : 'tarefas.expandAria', { title: t.t, done: subs.filter(s => s.d).length, total: subs.length })} title={isExpanded ? tl('tarefas.collapse') : tl('tarefas.expand')} onClick={() => toggleExpanded(t.id)}><ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" /><span className="num">{subs.filter(s => s.d).length}/{subs.length}</span></button>}
          {t.n && <small className="tm" title={tl('tarefas.hasNotes')}>≡</small>}
          {lbl && <small className={'tm' + (late ? ' late' : '')}>{lbl}</small>}
          {t.effort && <button className="lt" style={{ ['--c' as string]: EFFORT_COLORS[t.effort] }} title={effortHint(t.effort, lang)}>{effortLabel(t.effort, lang)}</button>}
          <button className="pp2" onClick={() => patch(t.id, x => { x.p = nextPriority(x.p) })}>{priorityLabel(t.p, lang)}</button>
        </span>
        <button className="x" aria-label={tl('tarefas.remove')} onClick={() => update(d => { d.tasks = withoutTask(d.tasks, t.id) })}>✕</button>
      </div>
  }
}
