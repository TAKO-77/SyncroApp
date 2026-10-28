import type { SpecialDay, SpecialDayDraft } from '../types/specialDays'
import { addDays, isIsoDate, isTime, parseIso, toIso } from './dates.ts'
import { str, type Validation } from './records.ts'

// Special days (birthdays, exams, trips…): mapping to `public.special_days` and date logic. Pure.

export const SPECIAL_DAY_NAME_MAX = 60
export const SPECIAL_DAY_NOTES_MAX = 200
export const UPCOMING_DAYS = 31

export function specialDayFromRow(row: Record<string, unknown>): SpecialDay {
  return {
    id: str(row.id),
    name: str(row.name),
    categoryId: str(row.category_id),
    start: str(row.start_date),
    end: str(row.end_date),
    time: str(row.time),
    notes: str(row.notes),
    yearly: Boolean(row.yearly),
    position: Number(row.position ?? 0),
  }
}

export const specialDayToRow = (x: SpecialDay) => ({
  id: x.id, name: x.name, category_id: x.categoryId, start_date: x.start, end_date: x.end || null, time: x.time, notes: x.notes, yearly: x.yearly, position: x.position,
})

/** Whether `x` falls on `day`: yearly ones on the same month and day from their first year, others between start and end. */
export const isOn = (x: SpecialDay, day: string) =>
  x.yearly ? day >= x.start && day.slice(5) === x.start.slice(5) : day >= x.start && day <= (x.end || x.start)

const byTime = (a: SpecialDay, b: SpecialDay) => (a.time || '99').localeCompare(b.time || '99')

export const specialDaysOn = (list: readonly SpecialDay[], day: string) => list.filter(x => isOn(x, day)).sort(byTime)

/** Special days from `today` up to `days` ahead, each with the date it next happens (today for ones already under way). */
export function upcomingSpecialDays(list: readonly SpecialDay[], today: string, days = UPCOMING_DAYS): { item: SpecialDay; date: string }[] {
  const horizon = addDays(today, days)
  return list.flatMap(item => {
    if (item.yearly) {
      let year = Math.max(+today.slice(0, 4), +item.start.slice(0, 4))
      let date = `${year}${item.start.slice(4)}`
      if (date < today) date = `${++year}${item.start.slice(4)}`
      // 29 February only exists in leap years.
      return date >= item.start && date <= horizon && toIso(parseIso(date)) === date ? [{ item, date }] : []
    }
    const end = item.end || item.start
    if (end < today || item.start > horizon) return []
    return [{ item, date: item.start < today ? today : item.start }]
  }).sort((a, b) => a.date.localeCompare(b.date) || byTime(a.item, b.item))
}

export function validateSpecialDay(d: SpecialDayDraft): Validation<SpecialDayDraft> {
  const name = d.name.trim()
  if (!name) return { ok: false, error: 'Indica o título.' }
  if (name.length > SPECIAL_DAY_NAME_MAX) return { ok: false, error: `O título pode ter até ${SPECIAL_DAY_NAME_MAX} caracteres.` }
  if (!isIsoDate(d.start)) return { ok: false, error: 'Escolhe o dia de início.' }
  const end = d.yearly ? '' : d.end
  if (end && (!isIsoDate(end) || end < d.start)) return { ok: false, error: 'O fim não pode ser antes do início.' }
  if (d.time && !isTime(d.time)) return { ok: false, error: 'A hora não é válida.' }
  const notes = d.notes.trim()
  if (notes.length > SPECIAL_DAY_NOTES_MAX) return { ok: false, error: `As notas podem ter até ${SPECIAL_DAY_NOTES_MAX} caracteres.` }
  return { ok: true, value: { ...d, name, end, notes } }
}
