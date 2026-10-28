import assert from 'node:assert/strict'
import { toRows } from '../codigo-fonte/src/lib/sync/rows.ts'
import type { AppData } from '../codigo-fonte/src/types.ts'
import { addDays, isIsoDate } from '../syncro-app/src/lib/dates.ts'
import { nextPosition } from '../syncro-app/src/lib/records.ts'
import { noteFromRow, noteToRow, parseInline, parseNote, prefixLines, toggleTaskLine, validateNote, wrapSelection } from '../syncro-app/src/lib/notes.ts'
import {
  GENERAL_WORKSPACE_ID, NOTES_MAX, TITLE_MAX, dueLabel, nextPriority, sortTasks,
  taskFromRow, taskToRow, tasksInWorkspace, validateTaskDraft, validateWorkspaceName, withGeneralWorkspace, workspaceFromRow,
} from '../syncro-app/src/lib/tasks.ts'
import type { Task, TaskDraft } from '../syncro-app/src/types/tasks.ts'

// Checks the Expo app's task logic and that its rows match the ones the desktop app syncs.
const task = (over: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Relatório', due: '2026-10-30', priority: 'alta', done: false, effort: 'cui', workspaceId: 'w1', notes: 'Ver anexos', position: 0, ...over,
})
const draft = (over: Partial<TaskDraft> = {}): TaskDraft => ({ title: 'Comprar pão', due: '', priority: 'media', effort: '', workspaceId: 'geral', notes: '', done: false, ...over })
const results: string[] = []
const test = (name: string, fn: () => void) => { fn(); results.push(name) }

test('row round trip keeps every field', () => {
  const t = task()
  assert.deepEqual(taskFromRow({ ...taskToRow(t) }), t)
  const empty = task({ due: '', effort: '', notes: '' })
  assert.deepEqual(taskFromRow({ ...taskToRow(empty) }), empty)
})

test('empty optional fields are stored as null, like the desktop app', () => {
  const row = taskToRow(task({ due: '', effort: '' }))
  assert.equal(row.due, null)
  assert.equal(row.effort, null)
})

test('rows match the columns the desktop sync writes', () => {
  const data = {
    tasks: [
      { id: 't1', t: 'Relatório', due: '2026-10-30', p: 'alta', d: false, effort: 'cui', workspaceId: 'w1', n: 'Ver anexos' },
      { id: 't2', t: 'Compras', due: '', p: 'media', d: true, effort: '', workspaceId: 'geral' },
    ],
    workspaces: [], ev: [], fin: [], days: [], cats: [], dayCats: [], notes: [], reset: '',
    sleep: { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' },
  } as AppData
  const desktop = toRows(data).tasks
  assert.deepEqual(taskToRow(task()), desktop.t1)
  assert.deepEqual(taskToRow(task({ id: 't2', title: 'Compras', due: '', priority: 'media', done: true, effort: '', workspaceId: 'geral', notes: '', position: 1 })), desktop.t2)
})

test('rows from the server with missing or unknown values get safe defaults', () => {
  const t = taskFromRow({ id: 'x', title: 'A', due: null, priority: 'other', done: null, effort: 'nope', workspace_id: '', notes: null, position: null })
  assert.deepEqual(t, { id: 'x', title: 'A', due: '', priority: 'media', done: false, effort: '', workspaceId: GENERAL_WORKSPACE_ID, notes: '', position: 0 })
})

test('Geral is always listed first', () => {
  const list = withGeneralWorkspace([workspaceFromRow({ id: 'w2', name: 'B', position: 2 }), workspaceFromRow({ id: 'w1', name: 'A', position: 1 })])
  assert.deepEqual(list.map(w => w.id), ['geral', 'w1', 'w2'])
  const stored = withGeneralWorkspace([{ id: 'w1', name: 'A', position: 1 }, { id: 'geral', name: 'Geral', position: 0 }])
  assert.deepEqual(stored.map(w => w.id), ['geral', 'w1'])
})

test('new items go after the last position', () => {
  assert.equal(nextPosition([]), 0)
  assert.equal(nextPosition([{ position: 3 }, { position: 7 }, { position: 1 }]), 8)
})

test('priority cycles through all four levels', () => {
  assert.deepEqual([nextPriority('urgente'), nextPriority('alta'), nextPriority('media'), nextPriority('baixa')], ['alta', 'media', 'baixa', 'urgente'])
})

test('validation trims and accepts a valid draft', () => {
  const r = validateTaskDraft(draft({ title: '  Ler  ', notes: ' nota ', due: '2026-02-28' }))
  assert.deepEqual(r, { ok: true, value: draft({ title: 'Ler', notes: 'nota', due: '2026-02-28' }) })
})

test('validation rejects bad input before it reaches Supabase', () => {
  assert.equal(validateTaskDraft(draft({ title: '   ' })).ok, false)
  assert.equal(validateTaskDraft(draft({ title: 'x'.repeat(TITLE_MAX + 1) })).ok, false)
  assert.equal(validateTaskDraft(draft({ title: 'x'.repeat(TITLE_MAX) })).ok, true)
  assert.equal(validateTaskDraft(draft({ due: '2026-02-30' })).ok, false)
  assert.equal(validateTaskDraft(draft({ due: '30/10/2026' })).ok, false)
  assert.equal(validateTaskDraft(draft({ notes: 'x'.repeat(NOTES_MAX + 1) })).ok, false)
  assert.equal(validateTaskDraft(draft({ priority: 'x' as never })).ok, false)
  assert.equal(validateTaskDraft(draft({ effort: 'x' as never })).ok, false)
  assert.equal(validateTaskDraft(draft({ workspaceId: '' })).ok, false)
})

test('workspace names are trimmed and limited', () => {
  assert.deepEqual(validateWorkspaceName('  Casa '), { ok: true, value: 'Casa' })
  assert.equal(validateWorkspaceName(' ').ok, false)
  assert.equal(validateWorkspaceName('x'.repeat(33)).ok, false)
})

test('dates', () => {
  assert.equal(isIsoDate('2024-02-29'), true)
  assert.equal(isIsoDate('2025-02-29'), false)
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  const today = '2026-10-28'
  assert.deepEqual(dueLabel('', today), { label: '', late: false })
  assert.deepEqual(dueLabel('2026-10-27', today), { label: 'Atrasada', late: true })
  assert.deepEqual(dueLabel(today, today), { label: 'Hoje', late: false })
  assert.deepEqual(dueLabel('2026-10-29', today), { label: 'Amanhã', late: false })
  assert.deepEqual(dueLabel('2026-11-05', today), { label: '5 nov', late: false })
})

test('Geral shows every task; other workspaces only their own', () => {
  const tasks = [task({ id: 'a', workspaceId: 'geral' }), task({ id: 'b', workspaceId: 'w1' }), task({ id: 'c', workspaceId: 'w2' })]
  assert.deepEqual(tasksInWorkspace(tasks, 'geral').map(t => t.id), ['a', 'b', 'c'])
  assert.deepEqual(tasksInWorkspace(tasks, 'w1').map(t => t.id), ['b'])
})

test('sorting keeps the stored order for ties and does not mutate', () => {
  const tasks = [
    task({ id: 'a', priority: 'baixa', effort: '', due: '', position: 0 }),
    task({ id: 'b', priority: 'urgente', effort: 'pro', due: '2026-11-01', position: 1 }),
    task({ id: 'c', priority: 'baixa', effort: 'rel', due: '2026-10-29', position: 2 }),
    task({ id: 'd', priority: 'alta', effort: 'rel', due: '', position: 3 }),
  ]
  const before = JSON.stringify(tasks)
  assert.deepEqual(sortTasks(tasks, 'priority').map(t => t.id), ['b', 'd', 'a', 'c'])
  assert.deepEqual(sortTasks(tasks, 'effort').map(t => t.id), ['c', 'd', 'b', 'a'])
  assert.deepEqual(sortTasks(tasks, 'due').map(t => t.id), ['c', 'b', 'a', 'd'])
  assert.deepEqual(sortTasks([...tasks].reverse(), 'custom').map(t => t.id), ['a', 'b', 'c', 'd'])
  assert.equal(JSON.stringify(tasks), before)
})

test('workspace notes read and write the same rows as the desktop sync', () => {
  const data = { tasks: [], workspaces: [], ev: [], fin: [], days: [], cats: [], dayCats: [], reset: '', sleep: { bed: '23:30', wake: '07:30', wk: false, bed2: '', wake2: '' },
    notes: [{ id: 'n1', workspaceId: 'w1', text: '- [ ] rever' }, { id: 'n2', workspaceId: 'w1', text: '' }] } as AppData
  for (const row of Object.values(toRows(data).workspace_notes)) assert.deepEqual(noteToRow(noteFromRow(row)), row)
  assert.equal(validateNote('x'.repeat(5001)).ok, false)
})

test('notes markdown subset', () => {
  assert.deepEqual(parseNote('## Título\n> citação\n- ponto\n2. dois\n- [x] feito\n\ntexto').map(l => l.kind), ['heading', 'quote', 'bullet', 'numbered', 'task', 'gap', 'paragraph'])
  assert.deepEqual(parseInline('**a** _b_ `c` veja www.x.pt.'), [
    { kind: 'bold', text: 'a' }, { kind: 'text', text: ' ' }, { kind: 'italic', text: 'b' }, { kind: 'text', text: ' ' }, { kind: 'code', text: 'c' },
    { kind: 'text', text: ' veja ' }, { kind: 'link', text: 'www.x.pt', href: 'https://www.x.pt' }, { kind: 'text', text: '.' },
  ])
  assert.deepEqual(parseInline('javascript:alert(1)'), [{ kind: 'text', text: 'javascript:alert(1)' }])
  assert.equal(toggleTaskLine('a\n- [ ] b\n  - [x] c', 1), 'a\n- [x] b\n  - [x] c')
  assert.equal(toggleTaskLine('a\n- [ ] b\n  - [x] c', 2), 'a\n- [ ] b\n  - [ ] c')
})

test('note formatting toolbar', () => {
  assert.deepEqual(wrapSelection('ola mundo', { start: 4, end: 9 }, '**'), { text: 'ola **mundo**', selection: { start: 6, end: 11 } })
  assert.deepEqual(wrapSelection('', { start: 0, end: 0 }, '_'), { text: '_texto_', selection: { start: 1, end: 6 } })
  assert.equal(prefixLines('um\ndois\ntres', { start: 1, end: 6 }, '- [ ] ').text, '- [ ] um\n- [ ] dois\ntres')
})

console.log(`test-tasks: ${results.length} passed\n  ${results.join('\n  ')}`)
