import assert from 'node:assert/strict'
import { applyRemote, coalesce, diffRows, emptyRows, fromRows, mergeWithServer, toRows, type Rows, type SyncOp } from '../codigo-fonte/src/lib/sync/rows.ts'
import type { AppData } from '../codigo-fonte/src/types.ts'
import { markDone, purgeExpired } from '../codigo-fonte/src/lib/cleanup.ts'
import { monthTotals, ymAdd } from '../codigo-fonte/src/lib/finance.ts'
import { daysLeft, upcomingSpecialDays } from '../codigo-fonte/src/lib/specialDays.ts'

// Checks the mapping between the local document and the Supabase rows used by the sync engine.
const base = (): AppData => ({
  ev: [
    { id: 'e1', title: 'Aulas', start: '08:10', end: '09:30', date: '2026-10-19', rep: 'weekly', cat: 'presencial', color: '#cf7f7f', done: { '2026-10-19': true }, ex: { '2026-10-26': { x: 1 } } },
    { id: 'e2', title: 'Ginásio', start: '18:00', end: '19:00', date: '2026-10-20', rep: 'custom', days: [1, 3], cat: 'exercicio', done: {} },
  ],
  tasks: [
    { id: 't1', t: 'Relatório', due: '2026-10-30', p: 'alta', d: false, effort: 'cui', workspaceId: 'w1', n: 'Ver anexos' },
    { id: 't2', t: 'Compras', due: '', p: 'media', d: true, doneAt: '2026-10-21', effort: '', workspaceId: 'geral' },
  ],
  workspaces: [{ id: 'geral', name: 'Geral' }, { id: 'w1', name: 'Projeto' }],
  fin: [{ id: 'f1', t: 'out', k: 'rec', n: 'Renda', a: 450.5, date: '2026-10-01', end: '', c: 'casa' }],
  days: [{ id: 'd1', n: 'Aniversário', ty: 'aniv', s: '2000-05-04', e: '', h: '', o: '', y: true }],
  cats: [{ id: 'presencial', name: 'Estudo presencial', color: '#cf7f7f' }, { id: 'exercicio', name: 'Exercício', color: '#8bb08b' }],
  dayCats: [{ id: 'aniv', name: 'Aniversário', color: '#cf7f7f', icon: '🎂' }, { id: 'novo', name: 'Novo', color: '#d2bd62' }],
  sleep: { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' },
  name: 'Ana', reset: '2026-10-21',
  notes: [{ id: 'n1', workspaceId: 'w1', text: '- [ ] rever' }, { id: 'n2', workspaceId: 'w1', text: 'Ideias' }],
})
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const results: string[] = []
const test = (name: string, fn: () => void) => { fn(); results.push(name) }

test('round trip keeps every synced field', () => {
  const d = base()
  assert.deepEqual(toRows(fromRows(toRows(d), d)), toRows(d))
  const back = fromRows(toRows(d), { ...d, ev: [], tasks: [] })
  assert.deepEqual(back.ev, d.ev)
  assert.deepEqual(back.tasks, d.tasks)
  assert.deepEqual(back.notes, d.notes)
  assert.deepEqual(back.dayCats, d.dayCats)
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
  assert.equal(ops.length, 1 + 2 + 2 + 2 + 2 + 2 + 1 + 1 + 2)
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

for (const name of results) console.log(`PASS ${name}`)
console.log(`${results.length} sync checks passed.`)
