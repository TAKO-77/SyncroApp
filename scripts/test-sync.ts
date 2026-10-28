import assert from 'node:assert/strict'
import { applyRemote, diffRows, emptyRows, fromRows, toRows, type Rows } from '../codigo-fonte/src/lib/sync/rows.ts'
import type { AppData } from '../codigo-fonte/src/types.ts'

// Checks the mapping between the local document and the Supabase rows used by the sync engine.
const base = (): AppData => ({
  ev: [
    { id: 'e1', title: 'Aulas', start: '08:10', end: '09:30', date: '2026-10-19', rep: 'weekly', cat: 'presencial', color: '#cf7f7f', done: { '2026-10-19': true }, ex: { '2026-10-26': { x: 1 } } },
    { id: 'e2', title: 'Ginásio', start: '18:00', end: '19:00', date: '2026-10-20', rep: 'custom', days: [1, 3], cat: 'exercicio', done: {} },
  ],
  tasks: [
    { id: 't1', t: 'Relatório', due: '2026-10-30', p: 'alta', d: false, effort: 'cui', workspaceId: 'w1', n: 'Ver anexos' },
    { id: 't2', t: 'Compras', due: '', p: 'media', d: true, effort: '', workspaceId: 'geral' },
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

for (const name of results) console.log(`PASS ${name}`)
console.log(`${results.length} sync checks passed.`)
