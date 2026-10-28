import assert from 'node:assert/strict'
import { toRows } from '../codigo-fonte/src/lib/sync/rows.ts'
import type { AppData } from '../codigo-fonte/src/types.ts'
import { categoryFromRow, dayCategoryToRow, eventCategoryToRow, firstSymbol, validateCategory } from '../syncro-app/src/lib/categories.ts'
import { addMonths, formatDuration, monthCells, weekday } from '../syncro-app/src/lib/dates.ts'
import { eventFromRow, eventToRow, eventsOn, layoutLanes, occursOn, reassignEvents, validateEventDraft, withoutOccurrence } from '../syncro-app/src/lib/events.ts'
import { financeFromRow, financeToRow, formatEuro, isActiveIn, lastMonths, monthTotals, parseAmount, recordsOf, validateFinance } from '../syncro-app/src/lib/finances.ts'
import { isValidPhoto, profileFromRow, profileToRow, sleepIntervals, sleepSchedule, timeUsage, validateName, withSleepForAllDays, withSleepTime } from '../syncro-app/src/lib/profile.ts'
import { guessCategory, parseQuickAdd } from '../syncro-app/src/lib/quickAdd.ts'
import { isOn, specialDayFromRow, specialDayToRow, upcomingSpecialDays, validateSpecialDay } from '../syncro-app/src/lib/specialDays.ts'
import type { AgendaEvent, EventDraft } from '../syncro-app/src/types/events.ts'
import type { Finance, FinanceDraft } from '../syncro-app/src/types/finances.ts'
import type { SpecialDay } from '../syncro-app/src/types/specialDays.ts'

// Checks the Expo app's Agenda, Calendário, Finanças and Perfil logic, and that its rows match
// the ones the desktop app syncs (codigo-fonte/src/lib/sync/rows.ts).
const desktop: AppData = {
  ev: [
    { id: 'e1', title: 'Aulas', start: '08:10', end: '09:30', date: '2026-10-19', rep: 'weekly', cat: 'presencial', color: '#cf7f7f', done: { '2026-10-19': true }, ex: { '2026-10-26': { x: 1 } } },
    { id: 'e2', title: 'Ginásio', start: '18:00', end: '19:00', date: '2026-10-20', rep: 'custom', days: [1, 3], cat: 'exercicio', done: {} },
  ],
  tasks: [], workspaces: [], notes: [],
  fin: [{ id: 'f1', t: 'out', k: 'rec', n: 'Renda', a: 450.5, date: '2026-10-01', end: '', c: 'casa' }],
  days: [{ id: 'd1', n: 'Aniversário', ty: 'aniv', s: '2000-05-04', e: '', h: '', o: '', y: true }, { id: 'd2', n: 'Viagem', ty: 'viagem', s: '2026-11-02', e: '2026-11-05', h: '09:00', o: 'Porto', y: false }],
  cats: [{ id: 'presencial', name: 'Estudo presencial', color: '#cf7f7f' }, { id: 'exercicio', name: 'Exercício', color: '#8bb08b' }],
  dayCats: [{ id: 'aniv', name: 'Aniversário', color: '#cf7f7f', icon: '🎂' }, { id: 'novo', name: 'Novo', color: '#d2bd62' }],
  sleep: { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' },
  name: 'Ana', photo: 'data:image/jpeg;base64,AAAA', reset: '2026-10-21',
}
const rows = toRows(desktop)
const results: string[] = []
const test = (name: string, fn: () => void) => { fn(); results.push(name) }

const event = (over: Partial<AgendaEvent> = {}): AgendaEvent => ({
  id: 'e', title: 'Evento', date: '2026-10-26', start: '09:00', end: '10:00', repeat: 'none', days: [], categoryId: 'c1', color: '', done: {}, exceptions: {}, position: 0, ...over,
})
const special = (over: Partial<SpecialDay> = {}): SpecialDay => ({ id: 's', name: 'X', categoryId: '', start: '2026-10-28', end: '', time: '', notes: '', yearly: false, position: 0, ...over })
const finance = (over: Partial<Finance> = {}): Finance => ({ id: 'f', type: 'out', kind: 'one', name: 'X', amount: 10, date: '2026-10-05', endMonth: '', categoryId: 'alim', position: 0, ...over })

// ── Rows shared with the desktop app ──

test('events read and write the same rows as the desktop sync', () => {
  for (const row of Object.values(rows.events)) assert.deepEqual(eventToRow(eventFromRow(row)), row)
})
test('categories read and write the same rows as the desktop sync', () => {
  for (const row of Object.values(rows.event_categories)) assert.deepEqual(eventCategoryToRow(categoryFromRow(row)), row)
  for (const row of Object.values(rows.day_categories)) assert.deepEqual(dayCategoryToRow(categoryFromRow(row)), row)
})
test('finances read and write the same rows as the desktop sync', () => {
  for (const row of Object.values(rows.finances)) assert.deepEqual(financeToRow(financeFromRow(row)), row)
})
test('special days read and write the same rows as the desktop sync', () => {
  for (const row of Object.values(rows.special_days)) assert.deepEqual(specialDayToRow(specialDayFromRow(row)), row)
})
test('the profile reads and writes the same row as the desktop sync', () => {
  assert.deepEqual(profileToRow(profileFromRow(rows.profiles.profile)), rows.profiles.profile)
  const empty = profileFromRow(null)
  assert.equal(empty.photo, '')
  assert.equal(profileToRow(empty).photo, null)
})

// ── Agenda ──

test('repeating events occur on the right days', () => {
  const weekly = eventFromRow(rows.events.e1), custom = eventFromRow(rows.events.e2)
  assert.equal(occursOn(weekly, '2026-10-19'), true)
  assert.equal(occursOn(weekly, '2026-10-26'), false, 'removed occurrence')
  assert.equal(occursOn(weekly, '2026-11-02'), true)
  assert.equal(occursOn(weekly, '2026-10-12'), false, 'before the first date')
  assert.deepEqual(['2026-10-20', '2026-10-21', '2026-10-22'].map(d => occursOn(custom, d)), [true, false, true])
  assert.equal(occursOn(event({ repeat: 'weekdays' }), '2026-10-31'), false)
  assert.equal(occursOn(event({ repeat: 'daily' }), '2026-10-31'), true)
})

test('per-day changes apply only to their day, and events are sorted', () => {
  const e = event({ repeat: 'daily', exceptions: { '2026-10-27': { start: '07:00', end: '08:00', title: 'Cedo' } } })
  const other = event({ id: 'o', start: '08:00', end: '12:00' })
  assert.deepEqual(eventsOn([e, other], '2026-10-27').map(x => [x.title, x.start]), [['Cedo', '07:00']])
  assert.deepEqual(eventsOn([e, other], '2026-10-26').map(x => x.id), ['o', 'e'])
})

test('overlapping events are laid out side by side', () => {
  const list = [event({ id: 'a', start: '09:00', end: '11:00' }), event({ id: 'b', start: '09:30', end: '10:00' }), event({ id: 'c', start: '10:00', end: '10:30' }), event({ id: 'd', start: '12:00', end: '13:00' })]
  assert.deepEqual(layoutLanes(list).map(l => [l.item.id, l.lane, l.lanes]), [['a', 0, 2], ['b', 1, 2], ['c', 1, 2], ['d', 0, 1]])
})

test('event validation', () => {
  const draft: EventDraft = { title: ' Ginásio ', date: '2026-10-28', start: '18:00', end: '19:00', repeat: 'custom', days: [], categoryId: 'c' }
  const ok = validateEventDraft(draft)
  assert.ok(ok.ok)
  assert.equal(ok.value.title, 'Ginásio')
  assert.deepEqual(ok.value.days, [weekday('2026-10-28')], 'custom without days uses the first weekday')
  assert.deepEqual((validateEventDraft({ ...draft, days: [3, 1, 3] }) as { value: EventDraft }).value.days, [1, 3])
  assert.deepEqual((validateEventDraft({ ...draft, repeat: 'daily', days: [1] }) as { value: EventDraft }).value.days, [])
  assert.equal(validateEventDraft({ ...draft, end: '18:00' }).ok, false)
  assert.equal(validateEventDraft({ ...draft, title: ' ' }).ok, false)
  assert.equal(validateEventDraft({ ...draft, start: '25:00' }).ok, false)
})

test('removing one occurrence and deleting a category', () => {
  assert.deepEqual(withoutOccurrence(event(), '2026-10-27').exceptions, { '2026-10-27': { x: 1 } })
  const list = [event({ id: 'a', categoryId: 'old' }), event({ id: 'b', categoryId: 'keep', exceptions: { '2026-10-27': { cat: 'old' } } }), event({ id: 'c', categoryId: 'keep' })]
  const moved = reassignEvents(list, 'old', { id: 'new', name: 'N', color: '#8bb08b', icon: '', position: 0 })
  assert.deepEqual(moved.map(e => [e.id, e.categoryId, e.color]), [['a', 'new', '#8bb08b'], ['b', 'keep', '']])
  assert.deepEqual(moved[1].exceptions['2026-10-27'], { cat: 'new', color: '#8bb08b' })
})

test('quick add understands days, times, durations and repeats', () => {
  const now = new Date(2026, 9, 28, 10, 0)
  assert.deepEqual(parseQuickAdd('Treino sex 18h 1h30 semanal', now), { title: 'Treino', date: '2026-10-30', start: '18:00', end: '19:30', repeat: 'weekly' })
  assert.deepEqual(parseQuickAdd('reunião amanhã 14:30', now), { title: 'Reunião', date: '2026-10-29', start: '14:30', end: '15:30', repeat: 'none' })
  assert.deepEqual(parseQuickAdd('Ler 45min', now), { title: 'Ler', date: '2026-10-28', start: '10:01', end: '10:46', repeat: 'none' })
  assert.deepEqual(parseQuickAdd('t: Comprar café', now), { task: 'Comprar café' })
  assert.equal(parseQuickAdd('amanhã 10h', now), null)
  assert.equal(guessCategory('Ginásio', [{ id: 'exercicio' }, { id: 'rotina' }]), 'exercicio')
  assert.equal(guessCategory('Ginásio', [{ id: 'x' }]), 'x')
})

// ── Calendário ──

test('special days: ranges and yearly repeats', () => {
  const trip = specialDayFromRow(rows.special_days.d2), birthday = specialDayFromRow(rows.special_days.d1)
  assert.deepEqual(['2026-11-01', '2026-11-02', '2026-11-05', '2026-11-06'].map(d => isOn(trip, d)), [false, true, true, false])
  assert.equal(isOn(birthday, '2026-05-04'), true)
  assert.equal(isOn(birthday, '1999-05-04'), false)
})

test('upcoming special days within 31 days', () => {
  const list = [
    special({ id: 'later', start: '2026-12-20' }),
    special({ id: 'ongoing', start: '2026-10-20', end: '2026-10-30' }),
    special({ id: 'bday', start: '1990-11-10', yearly: true }),
    special({ id: 'nye', start: '2000-01-05', yearly: true }),
  ]
  assert.deepEqual(upcomingSpecialDays(list, '2026-10-28').map(u => [u.item.id, u.date]), [['ongoing', '2026-10-28'], ['bday', '2026-11-10']])
  assert.deepEqual(upcomingSpecialDays(list, '2026-12-20').map(u => [u.item.id, u.date]), [['later', '2026-12-20'], ['nye', '2027-01-05']])
  assert.deepEqual(upcomingSpecialDays([special({ start: '2024-02-29', yearly: true })], '2027-02-10'), [], '29 February skipped in common years')
})

test('special day validation', () => {
  const d = { name: ' Exame ', categoryId: 'exame', start: '2026-11-02', end: '2026-11-01', time: '', notes: '', yearly: false }
  assert.equal(validateSpecialDay(d).ok, false)
  const yearly = validateSpecialDay({ ...d, yearly: true })
  assert.ok(yearly.ok)
  assert.equal(yearly.value.end, '', 'yearly days have no end')
  assert.equal(yearly.value.name, 'Exame')
  assert.equal(validateSpecialDay({ ...d, end: '', time: '9h' }).ok, false)
})

// ── Finanças ──

test('recurring records count from their first month until the end month', () => {
  const rent = finance({ kind: 'rec', date: '2026-08-15', endMonth: '2026-10' })
  assert.deepEqual(['2026-07', '2026-08', '2026-10', '2026-11'].map(m => isActiveIn(rent, m)), [false, true, true, false])
  assert.equal(isActiveIn(finance(), '2026-10'), true)
  assert.equal(isActiveIn(finance(), '2026-11'), false)
})

test('monthly totals', () => {
  const list = [finance({ id: 'a', type: 'in', kind: 'rec', amount: 1000, date: '2026-01-01', categoryId: '' }), finance({ id: 'b', kind: 'rec', amount: 450.5, date: '2026-01-01', categoryId: 'casa' }), finance({ id: 'c', amount: 20, categoryId: 'alim' }), finance({ id: 'd', amount: 5, categoryId: 'alim' })]
  assert.deepEqual(monthTotals(list, '2026-10'), { income: 1000, expenses: 475.5, recurring: 450.5, oneOff: 25, byCategory: { casa: 450.5, alim: 25 } })
  assert.deepEqual(lastMonths(list, '2026-10', 3).map(m => [m.month, m.expenses]), [['2026-08', 450.5], ['2026-09', 450.5], ['2026-10', 475.5]])
  assert.deepEqual(recordsOf(list, '2026-10', 'one').map(f => f.id), ['c', 'd'])
  assert.deepEqual(recordsOf(list, '2026-10', 'rec').map(f => f.id), ['a', 'b'])
})

test('amounts are parsed and formatted the Portuguese way', () => {
  assert.deepEqual(['12', '12,5', '12.50', ' 1 200,99 ', '0', '-3', '1,234', 'abc'].map(parseAmount), [12, 12.5, 12.5, 1200.99, 0, NaN, NaN, NaN])
  assert.deepEqual([450.5, 1000, 12345.67, -20, 0].map(formatEuro), ['450,5 €', '1000 €', '12 345,67 €', '-20 €', '0 €'])
})

test('finance validation', () => {
  const d: FinanceDraft = { type: 'in', kind: 'rec', name: ' Ordenado ', amount: '1200', date: '2026-10-01', endMonth: '2026-09', categoryId: 'alim' }
  assert.equal(validateFinance(d).ok, false, 'end before start')
  const ok = validateFinance({ ...d, endMonth: '' })
  assert.ok(ok.ok)
  assert.equal(ok.value.categoryId, '', 'income has no category')
  assert.equal(ok.value.name, 'Ordenado')
  assert.equal(validateFinance({ ...d, amount: '0' }).ok, false)
  assert.equal((validateFinance({ ...d, type: 'out', kind: 'one', endMonth: '2026-12', categoryId: '??' }) as { value: Finance }).value.categoryId, 'outros')
  assert.equal((validateFinance({ ...d, kind: 'one', endMonth: '2026-12' }) as { value: Finance }).value.endMonth, '')
})

// ── Perfil ──

test('sleep schedule per weekday', () => {
  const old = { bed: '23:30', wake: '07:30', wk: true, bed2: '01:00', wake2: '10:00' }
  assert.deepEqual(sleepSchedule(old, 0), { bed: '23:30', wake: '07:30' })
  assert.deepEqual(sleepSchedule(old, 6), { bed: '01:00', wake: '10:00' })
  const edited = withSleepTime(old, 2, 'bed', '22:00')
  assert.equal(edited.daily?.length, 7)
  assert.deepEqual(edited.daily?.[2], { bed: '22:00', wake: '07:30' })
  assert.deepEqual(edited.daily?.[6], { bed: '01:00', wake: '10:00' })
  assert.equal(withSleepTime(old, 2, 'bed', '22h'), old, 'invalid times are ignored')
  assert.deepEqual(withSleepForAllDays(edited, 2).daily?.[6], { bed: '22:00', wake: '07:30' })
  assert.deepEqual(sleepIntervals(old, '2026-10-26'), [[0, 450], [1410, 1440]])
  assert.deepEqual(sleepIntervals(withSleepTime(old, 0, 'bed', '01:00'), '2026-10-26'), [[60, 450]])
})

test('time usage adds up to the whole period', () => {
  const sleep = { bed: '23:00', wake: '07:00', wk: false, bed2: '', wake2: '' }
  const events = [event({ start: '06:00', end: '08:00', categoryId: 'c1' }), event({ id: 'n', start: '12:00', end: '12:30', categoryId: '' })]
  const { slices, planned, total } = timeUsage(events, [{ id: 'c1', name: 'Um', color: '#8bb08b', icon: '', position: 0 }], sleep, '2026-10-26', '2026-10-26')
  assert.equal(planned, 150)
  assert.equal(total, 1440)
  assert.deepEqual(slices.map(s => [s.id, s.value]), [['c1', 120], ['none', 30], ['sono', 420], ['free', 870]])
  assert.equal(slices.reduce((a, s) => a + s.value, 0), total)
})

test('profile validation', () => {
  assert.deepEqual(validateName('  Ana '), { ok: true, value: 'Ana' })
  assert.equal(validateName('x'.repeat(25)).ok, false)
  assert.equal(isValidPhoto('data:image/jpeg;base64,AAAA'), true)
  assert.equal(isValidPhoto('data:image/gif;base64,AAAA'), false)
  assert.equal(isValidPhoto(`data:image/jpeg;base64,${'A'.repeat(200_000)}`), false)
})

// ── Shared ──

test('categories and dates', () => {
  assert.equal(firstSymbol(' 👩‍💻 dev'), '👩‍💻')
  assert.deepEqual(validateCategory({ name: ' Casa ', color: '#AABBCC', icon: '🏠 casa' }), { ok: true, value: { name: 'Casa', color: '#aabbcc', icon: '🏠' } })
  assert.equal(validateCategory({ name: 'Casa', color: 'red', icon: '' }).ok, false)
  const cells = monthCells('2026-10')
  assert.equal(cells.length % 7, 0)
  assert.equal(weekday(cells[0]), 0)
  assert.equal(cells[0], '2026-09-28')
  assert.ok(cells.includes('2026-10-31'))
  assert.equal(addMonths('2026-11', 3), '2027-02')
  assert.deepEqual([45, 60, 90, 125].map(formatDuration), ['45min', '1h', '1h30', '2h05'])
})

console.log(`test-sections: ${results.length} passed\n  ${results.join('\n  ')}`)
