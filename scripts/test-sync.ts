import assert from 'node:assert/strict'
import { applyRemote, coalesce, diffRows, emptyRows, fromRows, mergeWithServer, toRows, type Rows, type SyncOp } from '../codigo-fonte/src/lib/sync/rows.ts'
import type { AppData } from '../codigo-fonte/src/types.ts'
import { purgeExpired } from '../codigo-fonte/src/lib/cleanup.ts'
import { markDone } from '../codigo-fonte/src/lib/tasks.ts'
import { addMonths, monthGrid, ymAdd } from '../codigo-fonte/src/lib/dates.ts'
import { monthTotals, overallBalance } from '../codigo-fonte/src/lib/finance.ts'
import { daysLeft, defaultEndTime, endTimeInvalid, specialBlocksOn, specialDayTime, upcomingSpecialDays, weekBars } from '../codigo-fonte/src/lib/specialDays.ts'
import { dueForTime, dueKey, isOverdue } from '../codigo-fonte/src/lib/taskDue.ts'
import { parseQ } from '../codigo-fonte/src/lib/quick.ts'
import { WEEK_RANGE, clipToWeek, weekScale } from '../codigo-fonte/src/lib/agendaFit.ts'
import { eventsOn } from '../codigo-fonte/src/lib/recurrence.ts'
import { noticeTarget, reminderText, remindersBetween } from '../codigo-fonte/src/lib/reminders.ts'
import { expirySeconds, isPushEndpoint, localMinutes, noticeTarget as serverTarget, reminderAlertsAt, reminderText as serverText, remindersAt, type ReminderRow } from '../supabase/functions/send-reminders/rules.ts'
import { addSubtaskDraft, applySubtaskEdits, hasBlankSubtask, splitSubtasks, withoutTask } from '../codigo-fonte/src/lib/subtasks.ts'
import { NOTE_TEXT_MAX, TASK_NOTES_MAX, taskNotesError } from '../codigo-fonte/src/lib/taskNotes.ts'
import { parseAppData } from '../codigo-fonte/src/lib/schema.ts'
import { applyReminderEdit, concludeReminder, reminderAlertsBetween, lastOccurrence, leadAvailable, occurrenceAfter, reminderError, reminderStatus, reopenReminder } from '../codigo-fonte/src/lib/reminderItems.ts'
import type { ReminderItem } from '../codigo-fonte/src/types.ts'
import { sleepIv, sleepSchedule, sleepTargetDays, sleepWeek } from '../codigo-fonte/src/lib/sleep.ts'
import { movedOrder, orderByIds, parseOrder, parseSort, parseSortMap, withSort, withoutSort } from '../codigo-fonte/src/lib/taskSort.ts'
import { readFileSync } from 'node:fs'

// Checks the mapping between the local document and the Supabase rows used by the sync engine.
const base = (): AppData => ({
  ev: [
    { id: 'e1', title: 'Aulas', start: '08:10', end: '09:30', date: '2026-10-19', rep: 'weekly', cat: 'presencial', color: '#cf7f7f', done: { '2026-10-19': true }, ex: { '2026-10-26': { x: 1 } } },
    { id: 'e2', title: 'Ginásio', start: '18:00', end: '19:00', date: '2026-10-20', rep: 'custom', days: [1, 3], cat: 'exercicio', done: {} },
  ],
  tasks: [
    { id: 't1', t: 'Relatório', due: '2026-10-30', dueTime: '18:30', p: 'alta', d: false, effort: 'cui', workspaceId: 'w1', n: 'Ver anexos' },
    { id: 't2', t: 'Compras', due: '', p: 'media', d: true, doneAt: '2026-10-21', effort: '', workspaceId: 'geral' },
  ],
  workspaces: [{ id: 'geral', name: 'Geral' }, { id: 'w1', name: 'Projeto' }],
  fin: [{ id: 'f1', t: 'out', k: 'rec', n: 'Renda', a: 450.5, date: '2026-10-01', end: '', c: 'casa' }],
  days: [{ id: 'd1', n: 'Aniversário', ty: 'aniv', s: '2000-05-04', e: '', h: '', he: '', o: '', y: true }, { id: 'd3', n: 'Congresso', ty: 'novo', s: '2026-11-10', e: '2026-11-12', h: '09:00', he: '18:00', o: '', y: false }],
  cats: [{ id: 'presencial', name: 'Estudo presencial', color: '#cf7f7f' }, { id: 'exercicio', name: 'Exercício', color: '#8bb08b' }],
  dayCats: [{ id: 'aniv', name: 'Aniversário', color: '#cf7f7f', icon: '🎂' }, { id: 'novo', name: 'Novo', color: '#d2bd62' }],
  sleep: { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' },
  name: 'Ana', reset: '2026-10-21', notifyTasks: true,
  notes: [{ id: 'n1', workspaceId: 'w1', text: '- [ ] rever' }, { id: 'n2', workspaceId: 'w1', text: 'Ideias' }],
  reminders: [
    { id: 'r1', title: 'Consulta', date: '2026-11-20', time: '15:00', repeat: 'none', lead: '1d', until: '', doneUntil: '', doneAt: '' },
    { id: 'r2', title: 'Medicação', date: '2026-11-01', time: '09:00', repeat: 'daily', lead: '', until: '2026-11-30', doneUntil: '2026-11-05T09:00', doneAt: '' },
  ],
})
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const results: string[] = []
const test = (name: string, fn: () => void) => { fn(); results.push(name) }

test('phone week cuts events to 08:00-20:00 and leaves out those outside', () => {
  const clip = (start: string, end: string) => clipToWeek([{ start, end }])
  assert.deepEqual(clip('09:00', '10:00'), [{ start: '09:00', end: '10:00' }])
  assert.deepEqual(clip('07:00', '09:00'), [{ start: '08:00', end: '09:00' }])
  assert.deepEqual(clip('19:30', '24:00'), [{ start: '19:30', end: '20:00' }])
  assert.deepEqual(clip('06:00', '08:00'), [])
  assert.deepEqual(clip('20:00', '21:00'), [])
})

test('phone week scale fits the screen within readable limits', () => {
  const weekHeight = (screen: number) => weekScale(screen) * (WEEK_RANGE.to - WEEK_RANGE.from)
  assert.ok(weekHeight(844) < 844, 'the week fits a usual phone screen')
  assert.ok(weekScale(700) < weekScale(900), 'taller screens get more room')
  assert.equal(weekScale(100), weekScale(200), 'tiny screens stop at a readable minimum')
  assert.equal(weekScale(3000), weekScale(4000), 'huge screens stop at a maximum')
})

test('round trip keeps every synced field', () => {
  const d = base()
  assert.deepEqual(toRows(fromRows(toRows(d), d)), toRows(d))
  const back = fromRows(toRows(d), { ...d, ev: [], tasks: [] })
  assert.deepEqual(back.ev, d.ev)
  assert.deepEqual(back.tasks, d.tasks)
  assert.deepEqual(back.notes, d.notes)
  assert.deepEqual(back.dayCats, d.dayCats)
  assert.deepEqual(back.reminders, d.reminders)
  assert.deepEqual(back.days, d.days)
})

test('no changes produce no operations', () => assert.deepEqual(diffRows(toRows(base()), toRows(base())), []))

test('editing one task touches only that row', () => {
  const next = base(); next.tasks[0].d = true
  const ops = diffRows(toRows(base()), toRows(next))
  assert.deepEqual(ops.map(o => [o.table, o.id, o.deleted]), [['tasks', 't1', false]])
  assert.equal(ops[0].row.done, true)
})

test('updates list the changed columns; new rows and deletes are sent whole', () => {
  const next = base(); next.tasks[0].d = true; next.tasks[0].n = 'Outra nota'; next.fin = []; next.days.push({ id: 'd2', n: 'Exame', ty: 'novo', s: '2026-11-04', e: '', h: '', o: '', y: false })
  const ops = diffRows(toRows(base()), toRows(next))
  assert.deepEqual(ops.map(o => [o.id, o.fields]), [['t1', ['done', 'notes']], ['f1', undefined], ['d2', undefined]])
})

test('queued operations for the same row keep every changed column', () => {
  const row = toRows(base()).tasks.t1
  const edit = (fields: string[]) => ({ table: 'tasks' as const, id: 't1', row, deleted: false, fields })
  assert.deepEqual(coalesce(edit(['done']), edit(['notes'])).fields, ['done', 'notes'])
  assert.equal(coalesce({ table: 'tasks', id: 't1', row, deleted: false }, edit(['notes'])).fields, undefined, 'a row not yet sent stays whole')
  assert.equal(coalesce({ table: 'tasks', id: 't1', row, deleted: true }, edit(['notes'])).fields, undefined, 'a restored row is sent whole')
  const del = coalesce(edit(['done']), { table: 'tasks', id: 't1', row, deleted: true })
  assert.equal(del.deleted, true)
  assert.equal(del.fields, undefined)
})

test('uploads keep columns changed on another device', () => {
  const local = toRows(base()).tasks.t1
  const server = { ...local, user_id: 'u', notes: 'Escrita no telemóvel', title: 'Relatório final', deleted: false, updated_at: 'x' }
  const row = mergeWithServer({ table: 'tasks', id: 't1', row: { ...local, priority: 'urgente' }, deleted: false, fields: ['priority'] }, server)
  assert.equal(row.priority, 'urgente')
  assert.equal(row.notes, 'Escrita no telemóvel')
  assert.equal(row.title, 'Relatório final')
  assert.equal('updated_at' in row || 'user_id' in row || 'deleted' in row, false)
  assert.equal(mergeWithServer({ table: 'tasks', id: 't1', row: local, deleted: false, fields: ['priority'] }, undefined), local, 'without a server row the local row is sent')
  assert.equal(mergeWithServer({ table: 'tasks', id: 't1', row: local, deleted: false }, server), local, 'whole-row operations ignore the server row')
})

test('object columns merge key by key with the server', () => {
  // PC ticks 26 Oct and unticks 19 Oct; meanwhile the phone ticked 2 Nov and edited an exception.
  const next = base(); next.ev[0].done = { '2026-10-26': true }; next.ev[0].ex = { '2026-10-26': { x: 1 }, '2026-11-09': { x: 1 } }
  const [op] = diffRows(toRows(base()), toRows(next))
  assert.deepEqual(op.maps, { done: { set: { '2026-10-26': true }, del: ['2026-10-19'] }, exceptions: { set: { '2026-11-09': { x: 1 } }, del: [] } })
  const server = { ...toRows(base()).events.e1, done: { '2026-10-19': true, '2026-11-02': true }, exceptions: { '2026-10-26': { start: '10:00' } } }
  const row = mergeWithServer(op, server)
  assert.deepEqual(row.done, { '2026-11-02': true, '2026-10-26': true })
  assert.deepEqual(row.exceptions, { '2026-10-26': { start: '10:00' }, '2026-11-09': { x: 1 } }, 'keys not edited locally keep the server value')
  assert.deepEqual(server.done, { '2026-10-19': true, '2026-11-02': true }, 'server row must not be mutated')
})

test('queued key-level changes accumulate', () => {
  const r = toRows(base()).events.e1
  const op = (maps: SyncOp['maps']) => ({ table: 'events' as const, id: 'e1', row: r, deleted: false, fields: ['done'], maps })
  const a = op({ done: { set: { d1: true }, del: ['d0'] } }), b = op({ done: { set: { d0: true }, del: ['d1'] } })
  assert.deepEqual(coalesce(a, b).maps, { done: { set: { d0: true }, del: ['d1'] } })
  assert.equal(coalesce(a, { ...b, maps: undefined }).maps, undefined, 'a whole-value change wins over key changes')
  assert.equal(coalesce({ ...a, maps: undefined }, b).maps, undefined, 'an earlier whole-value change still sends the whole value')
  assert.deepEqual(coalesce(a, { ...b, fields: ['title'], maps: undefined }).maps, { done: { set: { d1: true }, del: ['d0'] } }, 'untouched columns keep their key changes')
})

test('removing an item becomes a soft delete', () => {
  const next = base(); next.fin = []
  assert.deepEqual(diffRows(toRows(base()), toRows(next)).map(o => [o.table, o.id, o.deleted]), [['finances', 'f1', true]])
})

test('reordering tasks updates positions', () => {
  const next = base(); next.tasks.reverse()
  assert.deepEqual(diffRows(toRows(base()), toRows(next)).map(o => [o.id, o.row.position]), [['t2', 0], ['t1', 1]])
})

test('workspace notes and profile changes map to their rows', () => {
  const next = base(); next.notes[1].text = 'outra'; next.name = 'Bia'
  assert.deepEqual(diffRows(toRows(base()), toRows(next)).map(o => `${o.table}:${o.id}`).sort(), ['profiles:profile', 'workspace_notes:n2'])
})

test('adding and removing notes keeps their order', () => {
  const next = base(); next.notes = [next.notes[1], { id: 'n3', workspaceId: 'w1', text: 'Nova' }]
  const ops = diffRows(toRows(base()), toRows(next)).map(o => [o.id, o.deleted, o.row.position])
  assert.deepEqual(ops, [['n2', false, 0], ['n3', false, 1], ['n1', true, 0]])
  assert.deepEqual(fromRows(toRows(next), base()).notes.map(n => n.id), ['n2', 'n3'])
})

test('first upload sends every row', () => {
  const ops = diffRows(emptyRows(), toRows(base()))
  assert.equal(ops.length, 1 + 2 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2)
  assert.ok(ops.every(o => !o.deleted))
})

test('remote rows are applied and normalised', () => {
  const local = toRows(base())
  const remote = [
    { table: 'tasks' as const, row: { user_id: 'u', id: 't3', title: 'Nova', due: null, priority: 'baixa', done: false, effort: null, workspace_id: 'geral', notes: '', position: 2, deleted: false, updated_at: 'x' } },
    { table: 'finances' as const, row: { ...local.finances.f1, amount: '99.90', deleted: false } },
    { table: 'events' as const, row: { id: 'e2', deleted: true } },
  ]
  const merged: Rows = applyRemote(local, remote, new Set())
  const d = fromRows(merged, base())
  assert.equal(d.tasks[2].t, 'Nova')
  assert.equal(d.tasks[2].due, '')
  assert.equal(d.fin[0].a, 99.9)
  assert.deepEqual(d.ev.map(e => e.id), ['e1'])
  assert.deepEqual(local, toRows(base()), 'local rows must not be mutated')
})

test('rows with pending local changes are not overwritten', () => {
  const local = toRows(base())
  const merged = applyRemote(local, [{ table: 'tasks', row: { ...local.tasks.t1, title: 'Antigo' } }, { table: 'profiles', row: { name: 'Remoto', sleep: {}, reset: '', photo: null } }], new Set(['tasks:t1', 'profiles:profile']))
  assert.equal(merged.tasks.t1.title, 'Relatório')
  assert.equal(merged.profiles.profile.name, 'Ana')
})

test('optional fields stay absent after a round trip', () => {
  const d = base(), back = fromRows(toRows(d), d)
  assert.ok(!('days' in back.ev[0]) && !('color' in back.ev[1]) && !('n' in back.tasks[1]) && !('icon' in back.dayCats[1]))
  assert.equal(clone(back).photo, undefined)
})

test('completing a task records the day and reopening clears it', () => {
  const t = clone(base().tasks[0])
  markDone(t, true, '2026-10-29')
  assert.equal(t.doneAt, '2026-10-29')
  markDone(t, false)
  assert.equal(t.d, false)
  assert.equal('doneAt' in t, false)
})

test('completed tasks are removed two days after completion', () => {
  const d = base()
  d.tasks.push({ id: 't3', t: 'Ontem', due: '', p: 'baixa', d: true, doneAt: '2026-10-28' }, { id: 't4', t: 'Anteontem', due: '', p: 'baixa', d: true, doneAt: '2026-10-27' })
  assert.equal(purgeExpired(d, '2026-10-29'), true)
  assert.deepEqual(d.tasks.map(t => t.id), ['t1', 't3'])
})

test('completed tasks without a date start counting today', () => {
  const d = base()
  delete d.tasks[1].doneAt
  assert.equal(purgeExpired(d, '2026-10-29'), true)
  assert.equal(d.tasks[1].doneAt, '2026-10-29')
  assert.equal(d.tasks.length, 2)
})

test('one-off events older than two months are removed, recurring ones stay', () => {
  const d = base()
  const once = (id: string, date: string) => ({ id, title: id, start: '10:00', end: '11:00', date, rep: 'none' as const, cat: 'lazer', done: {} })
  d.ev.push(once('old', '2026-08-28'), once('edge', '2026-08-29'), once('soon', '2026-11-02'))
  d.ev[0].date = '2025-01-06'
  purgeExpired(d, '2026-10-29')
  assert.deepEqual(d.ev.map(e => e.id), ['e1', 'e2', 'edge', 'soon'])
})

test('nothing to remove reports no change', () => {
  const d = base()
  assert.equal(purgeExpired(d, '2026-10-22'), false)
  assert.deepEqual(d, base())
})

test('month totals count recurring records until their end month', () => {
  const fin = [
    { id: 'a', t: 'in' as const, k: 'rec' as const, n: 'Ordenado', a: 1500, date: '2026-09-01', end: '', c: '' },
    { id: 'b', t: 'out' as const, k: 'rec' as const, n: 'Ginásio', a: 30, date: '2026-08-15', end: '2026-09', c: 'saude' },
    { id: 'c', t: 'out' as const, k: 'one' as const, n: 'Jantar', a: 45.5, date: '2026-10-03', end: '', c: 'lazer' },
  ]
  assert.deepEqual(monthTotals(fin, '2026-09'), { i: 1500, o: 30, rec: 30, one: 0, cat: { saude: 30 } })
  assert.deepEqual(monthTotals(fin, '2026-10'), { i: 1500, o: 45.5, rec: 0, one: 45.5, cat: { lazer: 45.5 } })
  assert.equal(monthTotals(fin, '2026-08').i, 0)
  assert.equal(ymAdd('2026-10', 3), '2027-01')
  assert.equal(ymAdd('2026-01', -1), '2025-12')
})

test('upcoming special days cover yearly, ongoing and future items', () => {
  const day = (id: string, s: string, e = '', y = false) => ({ id, n: id, ty: 'evento', s, e, h: '', o: '', y })
  const list = upcomingSpecialDays([
    day('aniv', '2000-11-05', '', true), day('viagem', '2026-10-25', '2026-11-02'),
    day('exame', '2026-11-20'), day('longe', '2026-12-15'), day('passado', '2026-10-01'),
  ], '2026-10-29')
  assert.deepEqual(list.map(x => [x.item.id, x.date]), [['viagem', '2026-10-29'], ['aniv', '2026-11-05'], ['exame', '2026-11-20']])
  assert.equal(daysLeft('2026-11-05', '2026-10-29'), 7)
})

test('yearly special days roll over the new year and skip 29 February in common years', () => {
  const day = (id: string, s: string) => ({ id, n: id, ty: 'aniv', s, e: '', h: '', o: '', y: true })
  assert.deepEqual(upcomingSpecialDays([day('ano', '1990-01-10')], '2026-12-20').map(x => x.date), ['2027-01-10'])
  assert.deepEqual(upcomingSpecialDays([day('bissexto', '2000-02-29')], '2027-02-10'), [])
})

test('multi-day special days become one bar per week row with stable lanes', () => {
  const day = (id: string, s: string, e = '', y = false) => ({ id, n: id, ty: 'evento', s, e, h: '', o: '', y })
  const bars = weekBars([
    day('viagem', '2026-11-04', '2026-11-11'), day('congresso', '2026-11-10', '2026-11-12'),
    day('feira', '2026-11-13', '2026-11-14'), day('sozinho', '2026-11-10'), day('anual', '2000-11-10', '', true),
  ], '2026-11-09')
  assert.deepEqual(bars.map(b => [b.item.id, b.from, b.to, b.lane, b.head, b.tail]), [
    ['viagem', 0, 2, 0, false, true], ['congresso', 1, 3, 1, true, true], ['feira', 4, 5, 0, true, true],
  ])
  assert.deepEqual(weekBars([day('longo', '2026-11-01', '2026-12-01')], '2026-11-09').map(b => [b.from, b.to, b.head, b.tail]), [[0, 6, false, false]])
  assert.deepEqual(weekBars([day('fora', '2026-11-01', '2026-11-08')], '2026-11-09'), [])
})

test('special day end time defaults to one hour later and must follow the start on one day', () => {
  assert.equal(defaultEndTime('14:00'), '15:00')
  assert.equal(defaultEndTime('23:30'), '23:59')
  assert.equal(defaultEndTime(''), '')
  assert.equal(specialDayTime({ h: '14:00', he: '15:30' }), '14:00–15:30')
  assert.equal(specialDayTime({ h: '14:00' }), '14:00')
  assert.equal(specialDayTime({ h: '', he: '15:00' }), '')
  const x = { s: '2026-11-10', e: '', h: '14:00', he: '14:00', y: false }
  assert.equal(endTimeInvalid(x), true)
  assert.equal(endTimeInvalid({ ...x, he: '14:01' }), false)
  assert.equal(endTimeInvalid({ ...x, e: '2026-11-11', he: '09:00' }), false, 'ends on a later day')
  assert.equal(endTimeInvalid({ ...x, he: '' }), false)
})

test('timed special days become Agenda blocks', () => {
  const day = (id: string, s: string, e: string, h: string, he = '') => ({ id, n: id, ty: 'evento', s, e, h, he, o: '', y: false })
  const at = (ds: string, ...list: ReturnType<typeof day>[]) => specialBlocksOn(list, ds).map(b => [b.item.id, b.start, b.end, b.cont, b.next])
  assert.deepEqual(at('2026-11-10', day('reuniao', '2026-11-10', '', '14:00', '15:30')), [['reuniao', '14:00', '15:30', false, false]])
  assert.deepEqual(at('2026-11-10', day('sem-fim', '2026-11-10', '', '14:00')), [['sem-fim', '14:00', '15:00', false, false]], 'one hour by default')
  assert.deepEqual(at('2026-11-10', day('sem-hora', '2026-11-10', '', '')), [])
  const trip = day('viagem', '2026-11-10', '2026-11-12', '09:00', '18:00')
  assert.deepEqual(at('2026-11-10', trip), [['viagem', '09:00', '24:00', false, true]])
  assert.deepEqual(at('2026-11-11', trip), [], 'days between stay in the header')
  assert.deepEqual(at('2026-11-12', trip), [['viagem', '00:00', '18:00', true, false]])
  assert.deepEqual(at('2026-11-12', { ...trip, he: '' }), [], 'no end time, no block on the last day')
})

test('a task with a time limit is overdue only after that minute', () => {
  const t = { due: '2026-11-04', dueTime: '18:00' }
  assert.equal(isOverdue(t, '2026-11-04', '17:59'), false)
  assert.equal(isOverdue(t, '2026-11-04', '18:00'), false)
  assert.equal(isOverdue(t, '2026-11-04', '18:01'), true)
  assert.equal(isOverdue(t, '2026-11-05', '00:00'), true)
  assert.equal(isOverdue(t, '2026-11-03', '23:59'), false)
})

test('a task without a time limit is overdue only after its day', () => {
  assert.equal(isOverdue({ due: '2026-11-04' }, '2026-11-04', '23:59'), false)
  assert.equal(isOverdue({ due: '2026-11-04' }, '2026-11-05', '00:00'), true)
  assert.equal(isOverdue({ due: '', dueTime: '10:00' }, '2026-11-04', '23:59'), false)
})

test('choosing only a time sets the deadline to today', () => {
  assert.equal(dueForTime('', '18:00', '2026-11-04'), '2026-11-04')
  assert.equal(dueForTime('2026-12-01', '18:00', '2026-11-04'), '2026-12-01')
  assert.equal(dueForTime('2026-12-01', '', '2026-11-04'), '2026-12-01')
  assert.equal(dueForTime('', '', '2026-11-04'), '')
})

test('deadlines sort by day and time, with untimed tasks after timed ones and undated tasks last', () => {
  const tasks = [{ due: '' }, { due: '2026-11-05' }, { due: '2026-11-04' }, { due: '2026-11-04', dueTime: '18:00' }, { due: '2026-11-04', dueTime: '09:30' }]
  assert.deepEqual([...tasks].sort((a, b) => dueKey(a).localeCompare(dueKey(b))), [tasks[4], tasks[3], tasks[2], tasks[1], tasks[0]])
})

test('clearing a time limit produces an update of that column only', () => {
  const next = base(); delete next.tasks[0].dueTime
  const ops = diffRows(toRows(base()), toRows(next))
  assert.deepEqual(ops.map(o => [o.id, o.fields]), [['t1', ['due_time']]])
  assert.equal(ops[0].row.due_time, null)
})

const quick = (text: string) => parseQ(text, new Date(2026, 10, 4, 10, 0)) as { title: string; date: string; start: string; end: string; rep: string }

test('quick add reads a second time as the end of the event', () => {
  for (const text of ['Trabalho 17:30 3:00', 'Trabalho 17:30 às 3:00', 'Trabalho das 17:30 às 3:00', 'Trabalho 17:30-3:00', 'Trabalho 17h30 às 3h', 'Trabalho 17:30 até 3:00']) {
    const r = quick(text)
    assert.deepEqual([r.title, r.start, r.end], ['Trabalho', '17:30', '03:00'], text)
  }
  assert.deepEqual([quick('Aula 14:00 às 15:30').start, quick('Aula 14:00 às 15:30').end], ['14:00', '15:30'])
})

test('quick add still reads a time written as hours as a duration', () => {
  assert.equal(quick('Reunião amanhã 14:30 1h').end, '15:30')
  const r = quick('Treino sex 18h 1h30 semanal')
  assert.deepEqual([r.title, r.start, r.end, r.rep], ['Treino', '18:00', '19:30', 'weekly'])
  assert.equal(quick('Turno 22:00 5h').end, '03:00')
  assert.equal(quick('Ceia 23:30 30min').end, '00:00')
})

const nightShift = (over: Partial<AppData['ev'][number]> = {}): AppData['ev'][number] => ({ id: 'w', title: 'Trabalho', start: '17:30', end: '03:00', date: '2026-11-04', rep: 'none', cat: 'rotina', done: {}, ...over })
const parts = (ev: AppData['ev'], day: string) => eventsOn({ ...base(), ev }, day).map(e => [e.start, e.end, e.cont, e.day, e.realStart, e.realEnd])

test('an event past midnight is shown on both days', () => {
  assert.deepEqual(parts([nightShift()], '2026-11-04'), [['17:30', '24:00', false, '2026-11-04', '17:30', '03:00']])
  assert.deepEqual(parts([nightShift()], '2026-11-05'), [['00:00', '03:00', true, '2026-11-04', '17:30', '03:00']])
  assert.deepEqual(parts([nightShift()], '2026-11-03'), [])
  assert.deepEqual(parts([nightShift()], '2026-11-06'), [])
})

test('an event ending exactly at midnight has no continuation', () => {
  assert.deepEqual(parts([nightShift({ end: '00:00' })], '2026-11-05'), [])
  assert.equal(parts([nightShift({ end: '00:00' })], '2026-11-04')[0][1], '24:00')
})

test('a repeating night event shows both parts each day and exceptions follow the day it started', () => {
  const daily = nightShift({ rep: 'daily' })
  assert.deepEqual(parts([daily], '2026-11-05').map(p => [p[0], p[2]]), [['00:00', true], ['17:30', false]])
  const skipped = nightShift({ rep: 'daily', ex: { '2026-11-04': { x: 1 } } })
  assert.deepEqual(parts([skipped], '2026-11-05').map(p => p[2]), [false])
  const shorter = nightShift({ rep: 'daily', ex: { '2026-11-04': { end: '22:00' } } })
  assert.deepEqual(parts([shorter], '2026-11-05').map(p => p[2]), [false])
  assert.equal(parts([shorter], '2026-11-04')[0][1], '22:00')
})

test('events within one day are not split', () => {
  assert.deepEqual(parts([nightShift({ start: '09:00', end: '10:00' })], '2026-11-04'), [['09:00', '10:00', false, '2026-11-04', '09:00', '10:00']])
  assert.deepEqual(parts([nightShift({ start: '09:00', end: '10:00' })], '2026-11-05'), [])
})

const at = (hour: number, minute = 0, day = 4) => new Date(2026, 10, day, hour, minute)
const timed = (over: Partial<AppData['tasks'][number]> = {}): AppData['tasks'][number] => ({ id: 'r', t: 'Relatório', due: '2026-11-04', dueTime: '18:00', p: 'media', d: false, ...over })
const fired = (tasks: AppData['tasks'], since: Date, now: Date) => remindersBetween(tasks, since, now).map(r => r.kind)

test('a timed task reminds one hour before and at its limit, once each', () => {
  assert.deepEqual(fired([timed()], at(16, 59), at(17, 0)), ['soon'])
  assert.deepEqual(fired([timed()], at(17, 0), at(17, 1)), [])
  assert.deepEqual(fired([timed()], at(17, 59), at(18, 0)), ['due'])
  assert.deepEqual(fired([timed()], at(18, 0), at(18, 1)), [])
})

test('a task created less than an hour before its limit only reminds at the limit', () => {
  assert.deepEqual(fired([timed()], at(17, 30), at(17, 31)), [])
  assert.deepEqual(fired([timed()], at(17, 59), at(18, 0)), ['due'])
})

test('after a gap the reminder still fires only while it is useful', () => {
  assert.deepEqual(fired([timed()], at(16, 0), at(17, 40)), ['soon'])
  assert.deepEqual(fired([timed()], at(16, 0), at(18, 30)), ['due'])
  assert.deepEqual(fired([timed()], at(16, 0), at(19, 0)), ['due'])
  assert.deepEqual(fired([timed()], at(16, 0), at(19, 1)), [])
})

test('completed, undated and untimed tasks do not remind', () => {
  const window = [at(16, 0), at(18, 30)] as const
  assert.deepEqual(fired([timed({ d: true })], ...window), [])
  assert.deepEqual(fired([timed({ due: '' })], ...window), [])
  assert.deepEqual(fired([timed({ dueTime: '' })], ...window), [])
  assert.deepEqual(fired([timed({ dueTime: undefined })], ...window), [])
})

test('moving a task to a later time reminds again for the new limit', () => {
  assert.deepEqual(fired([timed({ dueTime: '20:00' })], at(18, 59), at(19, 0)), ['soon'])
  assert.deepEqual(fired([timed({ due: '2026-11-05', dueTime: '09:00' })], at(8, 59, 5), at(9, 0, 5)), ['due'])
})

test('reminders of one check become a single notification', () => {
  const one = remindersBetween([timed()], at(16, 59), at(17, 0))
  assert.deepEqual(reminderText(one), { title: 'Syncro', body: 'Falta 1 hora para Relatório' })
  assert.deepEqual(reminderText(remindersBetween([timed()], at(17, 59), at(18, 0))), { title: 'Syncro', body: 'Chegou a hora limite de Relatório' })
  const tasks = ['18:00', '18:00', '18:00', '18:00', '18:00'].map((dueTime, i) => timed({ id: `r${i}`, t: `T${i}`, dueTime }))
  const many = reminderText(remindersBetween(tasks, at(17, 59), at(18, 0)))
  assert.equal(many.title, 'Syncro')
  assert.equal(many.body, 'Chegou a hora limite de T0\nChegou a hora limite de T1\nChegou a hora limite de T2\ne mais 2')
})

const row = { id: 'r', title: 'Relatório', due: '2026-11-04', due_time: '18:00' }
const wall = (hour: number, minute = 0, day = 4) => Date.UTC(2026, 10, day, hour, minute) / 60000
const kinds = (now: number, tasks = [row]) => remindersAt(tasks, now).map(r => r.kind)

test('the server reminds one hour before and at the limit, within a short window', () => {
  assert.deepEqual(kinds(wall(16, 59)), [])
  assert.deepEqual(kinds(wall(17, 0)), ['soon'])
  assert.deepEqual(kinds(wall(17, 4)), ['soon'])
  assert.deepEqual(kinds(wall(17, 5)), [])
  assert.deepEqual(kinds(wall(18, 0)), ['due'])
  assert.deepEqual(kinds(wall(18, 4)), ['due'])
  assert.deepEqual(kinds(wall(18, 5)), [])
})

test('the server reads the time on the clock of the device', () => {
  const instant = new Date(Date.UTC(2026, 10, 4, 18, 0))
  assert.equal(localMinutes(instant, 'Europe/Lisbon'), wall(18, 0))
  assert.equal(localMinutes(instant, 'Asia/Tokyo'), wall(3, 0, 5))
  assert.equal(localMinutes(instant, 'America/New_York'), wall(13, 0))
  assert.equal(localMinutes(new Date(Date.UTC(2026, 6, 4, 17, 0)), 'Europe/Lisbon'), Date.UTC(2026, 6, 4, 18, 0) / 60000, 'summer time')
  assert.equal(localMinutes(new Date(Date.UTC(2026, 10, 4, 0, 30)), 'Europe/Lisbon'), wall(0, 30), 'midnight is hour 0')
  assert.throws(() => localMinutes(instant, 'Nowhere/Land'))
})

test('a sleeping phone gets "soon" only until the limit and "due" for one more hour', () => {
  const [soon] = remindersAt([row], wall(17, 0)), [due] = remindersAt([row], wall(18, 0))
  assert.ok(expirySeconds([soon]) < 3600, '"soon" expires before the limit')
  assert.ok(expirySeconds([due]) <= 3600, '"due" is at most an hour late')
  assert.equal(expirySeconds([soon, due]), expirySeconds([due]))
})

test('server and Windows app write the same notification text', () => {
  const kind = (k: 'soon' | 'due', i: number) => ({ taskId: `t${i}`, kind: k, title: `T${i}`, time: '18:00', due: '2026-11-04' })
  for (const list of [[kind('soon', 0)], [kind('due', 0)]]) assert.deepEqual(serverText(list), { title: reminderText(list).body, body: '' })
  for (const list of [[kind('soon', 0), kind('due', 1)], [0, 1, 2, 3, 4].map(i => kind('due', i))]) {
    assert.equal(serverText(list).body, reminderText(list).body)
    assert.equal(serverText(list).title, `${list.length} avisos do Syncro`)
  }
  for (const k of ['1w', '1d', '1h', '10m', 'at'] as const) {
    const list = [{ taskId: 'reminder:r', kind: k, title: 'Consulta', time: '15:00', due: '2026-11-20' }]
    assert.deepEqual(serverText(list), { title: reminderText(list).body, body: '' }, k)
  }
  assert.equal(reminderText([{ taskId: 'reminder:r', kind: '10m', title: 'Consulta', time: '15:00' }]).body, 'Faltam 10 minutos para Consulta')
  assert.equal(reminderText([{ taskId: 'reminder:r', kind: '1w', title: 'Consulta', time: '15:00' }]).body, 'Falta 1 semana para Consulta')
  assert.equal(reminderText([{ taskId: 'reminder:r', kind: 'at', title: 'Consulta', time: '15:00' }]).body, 'Chegou a hora de Consulta')
})

test('the server only calls known push services', () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/abc', 'https://web.push.apple.com/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://wns2-par02p.notify.windows.com/w/?token=abc']) assert.equal(isPushEndpoint(ok), true, ok)
  for (const bad of ['http://fcm.googleapis.com/fcm/send/abc', 'https://evil.example/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.example/x', 'https://notpush.apple.com/x', 'http://169.254.169.254/latest', 'não é url']) assert.equal(isPushEndpoint(bad), false, bad)
})

// Subtasks
const sub = (id: string, parentId: string, extra: Partial<AppData['tasks'][number]> = {}): AppData['tasks'][number] => ({ id, t: id, due: '', p: 'media', d: false, effort: '', workspaceId: 'w1', parentId, ...extra })
const withSubs = () => { const d = base(); d.tasks.push(sub('s1', 't1', { t: 'Primeira', due: '2026-11-10', dueTime: '09:00', p: 'urgente', effort: 'lig', n: 'Nota' }), sub('s2', 't1', { t: 'Segunda', d: true, doneAt: '2026-10-28' }), sub('s3', 't1', { t: 'Terceira' })); return d }

test('a subtask is a task row with every task field and its parent', () => {
  const d = withSubs(), rows = toRows(d)
  assert.equal(rows.tasks.s1.parent_id, 't1')
  assert.equal(rows.tasks.s1.due_time, '09:00')
  assert.equal(rows.tasks.t1.parent_id, null, 'main tasks have no parent')
  assert.deepEqual(fromRows(rows, { ...d, tasks: [] }).tasks, d.tasks, 'order, states and fields survive the rows')
  assert.equal('parentId' in fromRows(rows, d).tasks[0], false)
})

test('old rows without a parent load as main tasks', () => {
  const rows = toRows(base())
  delete rows.tasks.t1.parent_id
  const merged = applyRemote(emptyRows(), [{ table: 'tasks', row: { ...rows.tasks.t1, deleted: false } }], new Set())
  assert.equal(merged.tasks.t1.parent_id, null)
  assert.equal('parentId' in fromRows(merged, base()).tasks[0], false)
  assert.deepEqual(diffRows(toRows(base()), merged).filter(o => o.id === 't1'), [], 'and is not seen as a local change')
})

test('the list separates main tasks from subtasks in stored order', () => {
  const { main, children } = splitSubtasks(withSubs().tasks)
  assert.deepEqual(main.map(t => t.id), ['t1', 't2'])
  assert.deepEqual(children.get('t1')!.map(t => t.id), ['s1', 's2', 's3'])
  assert.equal(children.has('t2'), false)
})

test('nothing stays hidden: only one level, and a missing parent shows the task', () => {
  const d = base()
  d.tasks.push(sub('orfa', 'apagada'), sub('s1', 't1'), sub('neta', 's1'), sub('propria', 'propria'))
  const { main, children } = splitSubtasks(d.tasks)
  assert.deepEqual(main.map(t => t.id), ['t1', 't2', 'orfa', 'neta', 'propria'])
  assert.deepEqual(children.get('t1')!.map(t => t.id), ['s1'])
})

test('subtask titles are required', () => {
  assert.equal(addSubtaskDraft([], '', 's1'), null)
  assert.equal(addSubtaskDraft([], '   \t ', 's1'), null)
  assert.deepEqual(addSubtaskDraft([{ id: 'a', t: 'x', d: true }], '  Nova  ', 's1'), [{ id: 'a', t: 'x', d: true }, { id: 's1', t: 'Nova', d: false }])
  assert.equal(hasBlankSubtask([{ id: 'a', t: '  ', d: false }]), true)
  assert.equal(hasBlankSubtask([{ id: 'a', t: 'x', d: false }]), false)
})

test('edits to different subtasks on two devices are both kept', () => {
  const pc = withSubs(); pc.tasks[2].t = 'Primeira no PC'
  const ops = diffRows(toRows(withSubs()), toRows(pc))
  assert.deepEqual(ops.map(o => [o.id, o.fields]), [['s1', ['title']]], 'only that subtask and column are sent')
  const server = { ...toRows(withSubs()).tasks.s1, done: true, notes: 'Do telemóvel' }
  const row = mergeWithServer(ops[0], server)
  assert.deepEqual([row.title, row.done, row.notes], ['Primeira no PC', true, 'Do telemóvel'], 'even the same subtask merges column by column')
})

test('the main editor applies only what changed and keeps what a sync brought in', () => {
  const opened = [{ id: 's1', t: 'Primeira', d: false }, { id: 's2', t: 'Segunda', d: true }, { id: 's3', t: 'Terceira', d: false }]
  const d = withSubs()
  // From a sync while the editor was open: s1 got a priority and a new subtask appeared.
  d.tasks[2].p = 'baixa'
  d.tasks.push(sub('s5', 't1', { t: 'Remota' }))
  const parent = d.tasks[0]; parent.workspaceId = 'geral'
  applySubtaskEdits(d, parent, opened, [{ id: 's1', t: ' Editada ', d: true }, { id: 's3', t: 'Terceira', d: false }, { id: 'novo', t: 'Nova', d: false }], '2026-11-06')
  const list = splitSubtasks(d.tasks).children.get('t1')!
  assert.deepEqual(list.map(t => t.id), ['s1', 's3', 's5', 'novo'])
  assert.deepEqual([list[0].t, list[0].d, list[0].doneAt, list[0].p, list[0].n], ['Editada', true, '2026-11-06', 'baixa', 'Nota'])
  assert.deepEqual(list.map(t => t.workspaceId), ['geral', 'geral', 'geral', 'geral'], 'subtasks follow their main task')
  assert.equal(list[3].p, 'media', 'a new subtask starts like a new task')
  assert.equal(parent.d, false, 'ticking a subtask leaves the main task as it was')
})

test('deleting a task soft-deletes its subtasks too', () => {
  const next = withSubs(); next.tasks = withoutTask(next.tasks, 't1')
  assert.deepEqual(next.tasks.map(t => t.id), ['t2'])
  assert.deepEqual(diffRows(toRows(withSubs()), toRows(next)).filter(o => o.deleted).map(o => o.id).sort(), ['s1', 's2', 's3', 't1'])
  const one = withSubs(); one.tasks = withoutTask(one.tasks, 's2')
  assert.deepEqual(one.tasks.map(t => t.id), ['t1', 't2', 's1', 's3'], 'deleting a subtask keeps the rest')
})

test('clean-up removes subtasks with their main task only', () => {
  const kept = withSubs()
  purgeExpired(kept, '2026-11-06')
  assert.ok(kept.tasks.some(t => t.id === 's2'), 'a completed subtask stays while its main task is here')
  const waiting = withSubs(); waiting.tasks[0].d = true; waiting.tasks[0].doneAt = '2026-10-20'
  purgeExpired(waiting, '2026-11-06')
  assert.ok(waiting.tasks.some(t => t.id === 't1'), 'a main task with a pending subtask is not removed')
  const gone = withSubs(); gone.tasks[0].d = true; gone.tasks[0].doneAt = '2026-10-20'
  gone.tasks.filter(t => t.parentId).forEach(t => { t.d = true; t.doneAt ??= '2026-11-05' })
  purgeExpired(gone, '2026-11-06')
  assert.deepEqual(gone.tasks.map(t => t.id), [], 'all done: they leave together (t2 expired as well)')
})

test('a subtask with a time limit reminds like any task', () => {
  const d = withSubs(); d.tasks[2].dueTime = '10:00'; d.tasks[2].due = '2026-11-10'
  const due = remindersBetween(d.tasks, new Date(2026, 10, 10, 9, 59), new Date(2026, 10, 10, 10, 1))
  assert.ok(due.some(r => r.title === 'Primeira'))
})


test('loading keeps the parent and accepts old tasks', () => {
  const loaded = parseAppData(clone(withSubs()))!
  assert.equal(loaded.tasks[2].parentId, 't1')
  assert.equal('parentId' in loaded.tasks[0], false, 'old tasks load unchanged')
})

test('notes limit is shared with the database and never cuts the text', () => {
  assert.equal(taskNotesError('x'.repeat(TASK_NOTES_MAX)), null)
  assert.equal(taskNotesError(undefined), null)
  assert.match(taskNotesError('x'.repeat(TASK_NOTES_MAX + 3))!, /10\s?003 caracteres.*10\s?000.*Remove 3/)
  const sql = readFileSync(new URL('../supabase/migrations/20261106000000_task_subtasks.sql', import.meta.url), 'utf8')
  assert.ok(sql.includes(`char_length(notes) <= ${TASK_NOTES_MAX}`), 'the database check must use the same value')
  // Long notes with line breaks survive the rows and the loader unchanged, even over the limit.
  const notes = 'linha 1\n\n  linha 3\r\n' + 'y'.repeat(TASK_NOTES_MAX + 50)
  const d = base(); d.tasks[0].n = notes
  assert.equal(fromRows(toRows(d), d).tasks[0].n, notes)
  assert.equal(parseAppData(clone(d))!.tasks[0].n, notes)
})

test('workspace notes use the database limit', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261028000000_workspace_notes.sql', import.meta.url), 'utf8')
  assert.ok(sql.includes(`char_length(text) <= ${NOTE_TEXT_MAX}`), 'the database check must use the same value')
  const at = (text: string) => { const d = base(); d.notes[0].text = text; return parseAppData(clone(d)) }
  assert.ok(at('x'.repeat(NOTE_TEXT_MAX)))
  assert.equal(at('x'.repeat(NOTE_TEXT_MAX + 1)), null)
})

const reminder = (over: Partial<ReminderItem> = {}): ReminderItem => ({ id: 'r', title: 'Teste', date: '2026-11-02', time: '09:00', repeat: 'none', lead: '', until: '', doneUntil: '', doneAt: '', ...over })

test('old data and backups without reminders still load', () => {
  const { reminders: _gone, ...old } = base()
  assert.deepEqual(parseAppData(clone(old))!.reminders, [])
})

test('reminders survive the loader, and only edited columns are uploaded', () => {
  const d = base()
  assert.deepEqual(parseAppData(clone(d))!.reminders, d.reminders)
  const next = clone(d); next.reminders[1].doneUntil = '2026-11-06T09:00'
  const ops = diffRows(toRows(d), toRows(next))
  assert.equal(ops.length, 1)
  assert.equal(ops[0].table, 'reminders')
  assert.deepEqual(ops[0].fields, ['done_until'])
})

test('a one-off reminder has a single occurrence', () => {
  const r = reminder()
  assert.equal(occurrenceAfter(r, ''), '2026-11-02T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-02T08:59'), '2026-11-02T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-02T09:00'), null)
  assert.equal(lastOccurrence(r, '2026-11-02T08:59'), null)
  assert.equal(lastOccurrence(r, '2026-11-02T09:00'), '2026-11-02T09:00')
})

test('a daily reminder repeats at its time up to and including the final day', () => {
  const r = reminder({ repeat: 'daily', until: '2026-11-04' })
  assert.equal(occurrenceAfter(r, '2026-11-02T09:00'), '2026-11-03T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-03T08:00'), '2026-11-03T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-03T10:00'), '2026-11-04T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-04T09:00'), null)
  assert.equal(lastOccurrence(r, '2026-11-03T08:00'), '2026-11-02T09:00')
  assert.equal(lastOccurrence(r, '2026-11-03T09:00'), '2026-11-03T09:00')
  assert.equal(lastOccurrence(r, '2026-12-25T12:00'), '2026-11-04T09:00')
})

test('a weekly reminder keeps its weekday and stops at the final day, across a month end', () => {
  const r = reminder({ date: '2026-11-23', repeat: 'weekly', until: '2026-12-10' })
  assert.equal(occurrenceAfter(r, '2026-11-24T00:00'), '2026-11-30T09:00')
  assert.equal(occurrenceAfter(r, '2026-11-30T09:00'), '2026-12-07T09:00')
  assert.equal(occurrenceAfter(r, '2026-12-07T09:00'), null, 'the 14th is after the final day')
  assert.equal(lastOccurrence(r, '2026-12-06T23:59'), '2026-11-30T09:00')
  assert.equal(lastOccurrence(r, '2027-01-01T00:00'), '2026-12-07T09:00')
})

test('a one-off reminder stays late until concluded, then leaves', () => {
  const r = reminder()
  assert.deepEqual(reminderStatus(r, '2026-11-01T12:00'), { at: '2026-11-02T09:00', late: false, done: false })
  assert.deepEqual(reminderStatus(r, '2026-12-25T12:00'), { at: '2026-11-02T09:00', late: true, done: false })
  concludeReminder(r, '2026-12-25T12:00', '2026-12-25')
  assert.deepEqual(reminderStatus(r, '2026-12-25T12:00'), { at: '2026-11-02T09:00', late: false, done: true })
  assert.equal(r.doneAt, '2026-12-25')
  reopenReminder(r)
  assert.equal(reminderStatus(r, '2026-12-25T12:00').late, true)
  assert.equal(r.doneAt, '')
})

test('a one-off reminder can be concluded before its time', () => {
  const r = reminder()
  concludeReminder(r, '2026-11-01T12:00', '2026-11-01')
  assert.equal(reminderStatus(r, '2026-11-01T12:00').done, true)
  assert.equal(reminderStatus(r, '2026-11-05T12:00').done, true, 'it does not come back as late')
})

test('concluding a late repeating reminder clears every missed occurrence at once', () => {
  const r = reminder({ repeat: 'daily', until: '2026-11-10' })
  const now = '2026-11-06T12:00'
  assert.deepEqual(reminderStatus(r, now), { at: '2026-11-06T09:00', late: true, done: false })
  concludeReminder(r, now, '2026-11-06')
  assert.deepEqual(reminderStatus(r, now), { at: '2026-11-07T09:00', late: false, done: false })
  assert.equal(r.doneAt, '', 'occurrences remain')
  assert.equal(reminderStatus(r, '2026-11-07T09:00').late, true, 'the next one goes late if ignored')
})

test('concluding the next occurrence ahead of time moves to the one after', () => {
  const r = reminder({ repeat: 'daily', until: '2026-11-10' })
  concludeReminder(r, '2026-11-01T12:00', '2026-11-01')
  assert.equal(r.doneUntil, '2026-11-02T09:00')
  assert.deepEqual(reminderStatus(r, '2026-11-01T12:00'), { at: '2026-11-03T09:00', late: false, done: false })
  assert.equal(reminderStatus(r, '2026-11-02T12:00').late, false, 'the concluded one is not late')
})

test('a repeating reminder ends only when its last occurrence is concluded', () => {
  const r = reminder({ repeat: 'daily', until: '2026-11-03' })
  assert.deepEqual(reminderStatus(r, '2026-12-01T00:00'), { at: '2026-11-03T09:00', late: true, done: false })
  concludeReminder(r, '2026-12-01T00:00', '2026-12-01')
  assert.equal(reminderStatus(r, '2026-12-01T00:00').done, true)
  assert.equal(r.doneAt, '2026-12-01')
})

test('concluded reminders are deleted after two days, with the tasks', () => {
  const d = base()
  d.reminders = [reminder({ id: 'old', doneUntil: '2026-11-02T09:00', doneAt: '2026-11-04' }), reminder({ id: 'recent', doneUntil: '2026-11-02T09:00', doneAt: '2026-11-05' }), reminder({ id: 'open' })]
  assert.equal(purgeExpired(d, '2026-11-06'), true)
  assert.deepEqual(d.reminders.map(r => r.id), ['recent', 'open'])
})

test('early warnings whose moment has passed are unavailable', () => {
  const r = { date: '2026-11-08', time: '00:05' }
  assert.equal(leadAvailable(r, '', '2026-12-01T00:00'), true, 'no early warning is always possible')
  assert.equal(leadAvailable(r, '1w', '2026-11-01T00:04'), true)
  assert.equal(leadAvailable(r, '1w', '2026-11-01T00:05'), false)
  assert.equal(leadAvailable(r, '1d', '2026-11-07T00:04'), true)
  assert.equal(leadAvailable(r, '1h', '2026-11-07T23:04'), true, 'crosses midnight')
  assert.equal(leadAvailable(r, '1h', '2026-11-07T23:05'), false)
  assert.equal(leadAvailable(r, '10m', '2026-11-07T23:54'), true)
  assert.equal(leadAvailable(r, '10m', '2026-11-07T23:55'), false)
  assert.equal(leadAvailable({ date: '2026-11-08', time: '' }, '1w', '2026-12-01T00:00'), true, 'waits for the time to be chosen')
})

test('the form requires a time, and a final day when repeating', () => {
  const now = '2026-11-01T12:00', ok = { title: 'Teste', date: '2026-11-02', time: '09:00', repeat: 'none' as const, until: '' }
  assert.equal(reminderError(ok, now), '')
  assert.match(reminderError({ ...ok, title: '  ' }, now), /nome/)
  assert.match(reminderError({ ...ok, time: '' }, now), /hora/)
  assert.match(reminderError({ ...ok, repeat: 'daily' }, now), /dia final/)
  assert.match(reminderError({ ...ok, repeat: 'weekly', until: '2026-11-01' }, now), /antes/)
  assert.equal(reminderError({ ...ok, repeat: 'daily', until: '2026-11-02' }, now), '', 'the final day can be the first day')
})

test('a reminder cannot be created in the past, normal or repeating', () => {
  const now = '2026-11-06T12:00', form = { title: 'Teste', date: '2026-11-06', time: '12:01', repeat: 'none' as const, until: '' }
  assert.equal(reminderError(form, now), '')
  assert.match(reminderError({ ...form, time: '12:00' }, now), /futuro/, 'this very minute has already arrived')
  assert.match(reminderError({ ...form, time: '11:59' }, now), /futuro/, 'earlier today')
  assert.match(reminderError({ ...form, date: '2026-11-05', time: '23:00' }, now), /futuro/, 'an earlier day')
  assert.match(reminderError({ ...form, date: '2026-11-05', time: '23:00', repeat: 'daily', until: '2026-11-30' }, now), /futuro/, 'a repeating one too')
})

test('a late reminder can still be edited, but not moved to another past moment', () => {
  const now = '2026-11-06T12:00', saved = { date: '2026-11-02', time: '09:00' }, form = { title: 'Novo nome', ...saved, repeat: 'none' as const, until: '' }
  assert.equal(reminderError(form, now, saved), '', 'keeping its date and time')
  assert.match(reminderError({ ...form, time: '10:00' }, now, saved), /futuro/)
  assert.equal(reminderError({ ...form, date: '2026-11-07' }, now, saved), '', 'moving it to the future')
})

test('editing clears what does not apply and keeps a repeating reminder\'s progress', () => {
  const r = reminder({ doneUntil: '2026-11-02T09:00', doneAt: '2026-11-02' })
  applyReminderEdit(r, { title: ' Novo ', date: '2026-11-10', time: '09:00', repeat: 'none', lead: '1h', until: '2026-12-01' }, '2026-11-03')
  assert.equal(r.title, 'Novo')
  assert.equal(r.until, '', 'a one-off reminder has no final day')
  assert.equal(r.doneUntil, '', 'moving it makes it pending again')
  assert.equal(r.doneAt, '')

  const daily = reminder({ repeat: 'daily', until: '2026-11-10', doneUntil: '2026-11-05T09:00' })
  applyReminderEdit(daily, { title: 'Teste', date: '2026-11-02', time: '08:00', repeat: 'daily', lead: '1d', until: '2026-11-10' }, '2026-11-05')
  assert.equal(daily.lead, '', 'repeating reminders have no early warning')
  assert.equal(daily.doneUntil, '2026-11-05T09:00', 'past occurrences do not return as late')

  const shortened = reminder({ repeat: 'daily', until: '2026-11-10', doneUntil: '2026-11-05T09:00' })
  applyReminderEdit(shortened, { title: 'Teste', date: '2026-11-02', time: '09:00', repeat: 'daily', lead: '', until: '2026-11-05' }, '2026-11-06')
  assert.equal(shortened.doneAt, '2026-11-06', 'nothing left after the new final day')
})

const alertsAt = (r: ReminderItem, since: string, now: string) => reminderAlertsBetween([r], since, now).map(a => a.kind)

test('a one-off reminder without early warning notifies only at its time', () => {
  const r = reminder()
  assert.deepEqual(alertsAt(r, '2026-11-02T08:59', '2026-11-02T09:00'), ['at'])
  assert.deepEqual(alertsAt(r, '2026-11-02T08:58', '2026-11-02T08:59'), [])
  assert.deepEqual(alertsAt(r, '2026-11-02T09:00', '2026-11-02T09:01'), [], 'it does not repeat')
})

test('each early warning fires at its moment, and the time still notifies', () => {
  const moments = { '1w': '2026-11-13T15:00', '1d': '2026-11-19T15:00', '1h': '2026-11-20T14:00', '10m': '2026-11-20T14:50' } as const
  for (const [lead, moment] of Object.entries(moments) as [keyof typeof moments, string][]) {
    const r = reminder({ date: '2026-11-20', time: '15:00', lead })
    const before = new Date(Date.parse(moment + 'Z') - 60000).toISOString().slice(0, 16)
    assert.deepEqual(alertsAt(r, before, moment), [lead], lead)
    assert.deepEqual(alertsAt(r, moment, moment), [], lead)
    assert.deepEqual(alertsAt(r, '2026-11-20T14:59', '2026-11-20T15:00'), ['at'], lead)
  }
})

test('a daily reminder notifies once per day up to its final day, a weekly one only on its weekday', () => {
  const daily = reminder({ repeat: 'daily', until: '2026-11-04' })
  for (const day of ['02', '03', '04']) assert.deepEqual(alertsAt(daily, `2026-11-${day}T08:59`, `2026-11-${day}T09:00`), ['at'], day)
  assert.deepEqual(alertsAt(daily, '2026-11-05T08:59', '2026-11-05T09:00'), [], 'after the final day')
  const weekly = reminder({ repeat: 'weekly', until: '2026-12-01' })
  assert.deepEqual(alertsAt(weekly, '2026-11-09T08:59', '2026-11-09T09:00'), ['at'], 'the same weekday')
  assert.deepEqual(alertsAt(weekly, '2026-11-10T08:59', '2026-11-10T09:00'), [])
})

test('what was concluded no longer notifies, and a late occurrence does not repeat', () => {
  const early = reminder({ date: '2026-11-20', time: '15:00', lead: '1d', doneUntil: '2026-11-20T15:00', doneAt: '2026-11-18' })
  assert.deepEqual(alertsAt(early, '2026-11-19T14:59', '2026-11-19T15:00'), [], 'its early warning')
  assert.deepEqual(alertsAt(early, '2026-11-20T14:59', '2026-11-20T15:00'), [], 'its time')
  const daily = reminder({ repeat: 'daily', until: '2026-11-10', doneUntil: '2026-11-03T09:00' })
  assert.deepEqual(alertsAt(daily, '2026-11-03T08:59', '2026-11-03T09:00'), [], 'concluded ahead of time')
  assert.deepEqual(alertsAt(daily, '2026-11-04T08:59', '2026-11-04T09:00'), ['at'], 'the next one still notifies')
  assert.deepEqual(alertsAt(reminder(), '2026-11-02T09:01', '2026-11-02T12:00'), [], 'late and already notified')
})

test('after a gap only the latest notification comes, up to an hour late', () => {
  const daily = reminder({ repeat: 'daily', until: '2026-11-30' })
  assert.deepEqual(alertsAt(daily, '2026-11-02T08:00', '2026-11-06T09:30'), ['at'], 'one, not five')
  assert.deepEqual(alertsAt(daily, '2026-11-02T08:00', '2026-11-06T10:01'), [], 'too late')
  const lead = reminder({ date: '2026-11-20', time: '15:00', lead: '1w' })
  assert.deepEqual(alertsAt(lead, '2026-11-13T14:00', '2026-11-13T15:40'), ['1w'])
  assert.deepEqual(alertsAt(lead, '2026-11-13T14:00', '2026-11-16T15:00'), [], 'it would no longer be true')
  const both = reminder({ date: '2026-11-20', time: '15:00', lead: '10m' })
  assert.deepEqual(alertsAt(both, '2026-11-20T14:00', '2026-11-20T15:05'), ['at'], 'the time, not an early warning already past')
})

const toRow = (r: ReminderItem): ReminderRow => ({ id: r.id, title: r.title, date: r.date, time: r.time, frequency: r.repeat, lead_time: r.lead, end_date: r.until || null, done_until: r.doneUntil })
const wallMinutes = (stamp: string) => Date.parse(stamp + 'Z') / 60000
const wallStamp = (m: number) => new Date(m * 60000).toISOString().slice(0, 16)

test('Windows and the server send the same reminders, minute by minute', () => {
  const items = [
    reminder({ id: 'plain', date: '2026-11-03', time: '00:02' }),
    reminder({ id: 'week', date: '2026-11-10', time: '23:58', lead: '1w' }),
    reminder({ id: 'day', date: '2026-11-04', time: '00:03', lead: '1d' }),
    reminder({ id: 'hour', date: '2026-11-04', time: '00:30', lead: '1h' }),
    reminder({ id: 'ten', date: '2026-11-04', time: '00:05', lead: '10m' }),
    reminder({ id: 'daily', date: '2026-11-02', time: '00:01', repeat: 'daily', until: '2026-11-08' }),
    reminder({ id: 'late', date: '2026-11-02', time: '23:59', repeat: 'daily', until: '2026-11-08', doneUntil: '2026-11-05T23:59' }),
    reminder({ id: 'weekly', date: '2026-11-02', time: '12:00', repeat: 'weekly', until: '2026-11-16' }),
    reminder({ id: 'done', date: '2026-11-05', time: '10:00', lead: '1h', doneUntil: '2026-11-05T10:00', doneAt: '2026-11-01' }),
  ]
  const from = wallMinutes('2026-11-01T00:00'), to = wallMinutes('2026-11-18T00:00')
  const seen = { windows: new Set<string>(), server: new Set<string>() }
  let sent = 0
  for (let m = from; m <= to; m++) {
    for (const a of reminderAlertsBetween(items, wallStamp(m - 1), wallStamp(m))) { seen.windows.add(`${a.taskId} ${a.kind} ${wallStamp(m)}`); sent++ }
    // Only the first minute of the server's window: reminders_sent stops the rest.
    for (const a of reminderAlertsAt(items.map(toRow), m)) {
      const first = reminderAlertsAt(items.map(toRow), m - 1).some(b => b.taskId === a.taskId && b.kind === a.kind && b.due === a.due)
      if (!first) seen.server.add(`${a.taskId} ${a.kind} ${wallStamp(m)}`)
    }
  }
  assert.deepEqual([...seen.server].sort(), [...seen.windows].sort())
  assert.equal(seen.windows.size, sent, 'nothing fires twice')
  const count = (id: string) => [...seen.windows].filter(k => k.startsWith(`reminder:${id} `)).length
  assert.deepEqual([count('plain'), count('week'), count('day'), count('hour'), count('ten'), count('daily'), count('late'), count('weekly'), count('done')], [1, 2, 2, 2, 2, 7, 3, 3, 0])
})

test('the server keeps retrying within its window and marks the occurrence for reminders_sent', () => {
  const r = toRow(reminder({ id: 'x', repeat: 'daily', date: '2026-11-02', time: '23:58', until: '2026-11-04' }))
  for (const stamp of ['2026-11-03T23:58', '2026-11-04T00:02']) {
    const [alert] = reminderAlertsAt([r], wallMinutes(stamp))
    assert.deepEqual({ ...alert }, { taskId: 'reminder:x', kind: 'at', title: 'Teste', time: '23:58', due: '2026-11-03' }, stamp)
  }
  assert.deepEqual(reminderAlertsAt([r], wallMinutes('2026-11-04T00:03')), [])
})

test('a sleeping phone never gets a warning after the moment it announces', () => {
  const list = (kind: '1w' | '1d' | '1h' | '10m' | 'at') => [{ taskId: 'reminder:r', kind, title: 'T', time: '15:00', due: '2026-11-20' }]
  assert.ok(expirySeconds(list('10m')) < 10 * 60)
  assert.ok(expirySeconds(list('1h')) < 60 * 60)
  for (const kind of ['1d', '1w', 'at'] as const) assert.ok(expirySeconds(list(kind)) <= 3600, kind)
  assert.equal(expirySeconds([...list('10m'), ...list('at')]), expirySeconds(list('at')))
})

test('a notification opens Lembretes only when it announces nothing else', () => {
  for (const target of [noticeTarget, serverTarget]) {
    assert.equal(target([{ taskId: 'reminder:r' }]), 'lembretes')
    assert.equal(target([{ taskId: 'reminder:r' }, { taskId: 't1' }]), 'tarefas')
    assert.equal(target([{ taskId: 't1' }]), 'tarefas')
  }
})

test('the choice of notifications syncs and defaults to tasks as well', () => {
  const { notifyTasks: _gone, ...old } = base()
  assert.equal(parseAppData(clone(old))!.notifyTasks, true, 'old data and backups')
  const d = base(); d.notifyTasks = false
  assert.equal(parseAppData(clone(d))!.notifyTasks, false)
  assert.equal(fromRows(toRows(d), base()).notifyTasks, false)
  const ops = diffRows(toRows(base()), toRows(d))
  assert.equal(ops.length, 1)
  assert.deepEqual(ops[0].fields, ['notify_tasks'])
  const rows = toRows(base()); delete rows.profiles.profile.notify_tasks
  assert.equal(fromRows(rows, base()).notifyTasks, true, 'a profile row from before the column')
  for (const kind of ['soon', 'due', '1w', '1d', '1h', '10m', 'at']) assert.ok(readFileSync(new URL('../supabase/migrations/20261106000002_reminder_notifications.sql', import.meta.url), 'utf8').includes(`'${kind}'`), kind)
})

test('the sleep window applies a schedule only to the days chosen', () => {
  const none = { all: false, week: false, weekend: false }
  assert.deepEqual(sleepTargetDays(1, none), [1], 'only the day clicked')
  assert.deepEqual(sleepTargetDays(1, { ...none, week: true }), [0, 1, 2, 3, 4])
  assert.deepEqual(sleepTargetDays(1, { ...none, weekend: true }), [1], 'a weekday has no weekend box')
  assert.deepEqual(sleepTargetDays(1, { all: false, week: true, weekend: true }), [0, 1, 2, 3, 4])
  assert.deepEqual(sleepTargetDays(5, none), [5], 'Saturday alone')
  assert.deepEqual(sleepTargetDays(6, { ...none, weekend: true }), [5, 6])
  assert.deepEqual(sleepTargetDays(6, { ...none, week: true }), [6], 'the weekend has no remaining weekdays')
  assert.deepEqual(sleepTargetDays(3, { ...none, all: true }), [0, 1, 2, 3, 4, 5, 6])
})

test('saving sleep keeps the other days, including schedules from the old format', () => {
  const legacy = { bed: '23:30', wake: '07:30', wk: true, bed2: '00:30', wake2: '09:30' }
  const daily = sleepWeek(legacy, [1], { bed: '22:00', wake: '06:00' })
  assert.equal(daily.length, 7)
  assert.deepEqual(daily[1], { bed: '22:00', wake: '06:00' })
  assert.deepEqual(daily[0], { bed: '23:30', wake: '07:30' })
  assert.deepEqual(daily[5], { bed: '00:30', wake: '09:30' })
  assert.notEqual(daily[0], daily[2], 'each day is its own object')
  const next = { ...legacy, daily }
  assert.deepEqual(sleepSchedule(next, 1), { bed: '22:00', wake: '06:00' })
  assert.deepEqual(sleepIv(next, '2026-11-03'), [[0, 360], [1320, 1440]], 'a Tuesday in the Agenda')
  assert.deepEqual(sleepWeek(next, [0, 1, 2, 3, 4, 5, 6], { bed: '01:00', wake: '08:00' }).map(s => s.bed), Array(7).fill('01:00'))
})

test('each workspace keeps its own task sort', () => {
  assert.equal(parseSort('due'), 'due', 'the sort saved before workspaces had their own')
  assert.equal(parseSort(null), 'priority')
  assert.equal(parseSort('outro'), 'priority')
  assert.deepEqual(parseSortMap(null), {})
  assert.deepEqual(parseSortMap('nao e json'), {})
  assert.deepEqual(parseSortMap('[1]'), {})
  assert.deepEqual(parseSortMap('{"w1":"due","w2":"outro","w3":5}'), { w1: 'due' }, 'invalid values are dropped')
  const map = { w1: 'due' as const }
  const changed = withSort(map, 'w2', 'custom')
  assert.deepEqual(changed, { w1: 'due', w2: 'custom' })
  assert.deepEqual(map, { w1: 'due' }, 'the old map is untouched')
  assert.deepEqual(withoutSort(changed, 'w1'), { w2: 'custom' })
  assert.deepEqual(withoutSort(changed, 'nenhum'), changed)
})

test('the custom order of Geral follows its own list', () => {
  const tasks = ['a', 'b', 'c', 'd'].map(id => ({ id }))
  const ids = (list: { id: string }[]) => list.map(t => t.id)
  assert.deepEqual(ids(orderByIds(tasks, ['c', 'a', 'b', 'd'])), ['c', 'a', 'b', 'd'])
  assert.deepEqual(ids(orderByIds(tasks, ['c', 'a'])), ['c', 'a', 'b', 'd'], 'tasks not in the list go last, in their order')
  assert.deepEqual(ids(orderByIds(tasks, ['apagada', 'd', 'b'])), ['d', 'b', 'a', 'c'], 'deleted ids are ignored')
  assert.deepEqual(ids(orderByIds(tasks, [])), ['a', 'b', 'c', 'd'])
  assert.deepEqual(parseOrder(null), null)
  assert.deepEqual(parseOrder('nao e json'), null)
  assert.deepEqual(parseOrder('{}'), null)
  assert.deepEqual(parseOrder('["a",1,"b"]'), ['a', 'b'])
})

test('dragging in Geral leaves hidden tasks in their places', () => {
  assert.deepEqual(movedOrder(['a', 'x', 'b', 'y', 'c'], ['c', 'a', 'b']), ['c', 'x', 'a', 'y', 'b'])
  assert.deepEqual(movedOrder(['a', 'b'], ['b', 'a']), ['b', 'a'])
  assert.deepEqual(movedOrder(['a', 'b', 'c'], ['a', 'b']), ['a', 'b', 'c'])
})

test('clean-up treats a task the list shows as main like a main task', () => {
  const d = base()
  d.tasks = [sub('a', 'b', { d: true, doneAt: '2026-10-01' }), sub('b', 'c', { d: true, doneAt: '2026-10-01' }), sub('c', '', { d: false }), sub('self', 'self', { d: true, doneAt: '2026-10-01' })]
  d.tasks[2].parentId = undefined
  purgeExpired(d, '2026-11-01')
  assert.deepEqual(d.tasks.map(t => t.id), ['b', 'c'], 'the grandchild and the self-parented task leave; the subtask waits for its main task')
})

test('months move by whole months and the calendar shows whole weeks', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28')
  assert.equal(ymAdd('2026-12', 1), '2027-01')
  const grid = monthGrid('2026-11')
  assert.equal(grid[0], '2026-10-26', 'starts on the Monday of the first week')
  assert.equal(grid.length % 7, 0)
  assert.ok(grid.includes('2026-11-30') && !grid.includes('2026-12-07'))
})

test('the overall balance adds every month up to the one asked', () => {
  const rec = (id: string, t: 'in' | 'out', a: number, date: string, end = '') => ({ id, t, k: 'rec' as const, n: id, a, date, end, c: '' })
  const one = (id: string, t: 'in' | 'out', a: number, date: string) => ({ id, t, k: 'one' as const, n: id, a, date, end: '', c: '' })
  assert.equal(overallBalance([], '2026-03'), 0)
  assert.equal(overallBalance([one('a', 'in', 100, '2026-01-10'), one('b', 'out', 30, '2026-02-05'), one('c', 'in', 5, '2026-03-31')], '2026-03'), 75)
  assert.equal(overallBalance([rec('s', 'in', 1000, '2026-01-01')], '2026-03'), 3000, 'a recurring record with no end counts every month')
  assert.equal(overallBalance([rec('r', 'out', 100, '2026-01-01', '2026-02')], '2026-06'), -200, 'a recurring record stops at its end')
  const future = [one('a', 'in', 100, '2026-01-10'), one('b', 'in', 50, '2026-04-01'), rec('s', 'in', 10, '2026-05-01')]
  assert.equal(overallBalance(future, '2026-03'), 100, 'records that start later do not count')
  assert.equal(overallBalance([one('a', 'in', 0.1, '2026-01-01'), one('b', 'in', 0.2, '2026-01-02')], '2026-01'), 0.3)
  const months = [rec('s', 'in', 1000, '2026-01-01'), one('o', 'out', 250, '2026-02-03')]
  const { i, o } = monthTotals(months, '2026-03')
  assert.equal(overallBalance(months, '2026-03'), overallBalance(months, '2026-02') + i - o, 'last month plus this month')
})

for (const name of results) console.log(`PASS ${name}`)
console.log(`${results.length} sync checks passed.`)
