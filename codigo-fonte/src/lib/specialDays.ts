import type { SpecialDay } from '../types'
import { addDays, dayIndex } from './dates.ts'

// Special days shared by Agenda, Calendário and Início.

/** Whole days from `today` until `date` (both `YYYY-MM-DD`). */
export const daysLeft = (date: string, today: string) => dayIndex(date) - dayIndex(today)

const byTime = (a: SpecialDay, b: SpecialDay) => (a.h || '99').localeCompare(b.h || '99')

/** The special days that fall on `day`, earliest time first. */
export const specialDaysOn = (days: SpecialDay[], day: string) => days
  .filter(x => x.y ? day >= x.s && day.slice(5) === x.s.slice(5) : day >= x.s && day <= (x.e || x.s))
  .sort(byTime)

/** Special days in the next `horizon` days with the date each one next falls on, soonest first. */
export function upcomingSpecialDays(days: SpecialDay[], today: string, horizon = 31): { item: SpecialDay; date: string }[] {
  const end = addDays(today, horizon)
  return days.flatMap(item => {
    if (item.y) {
      let year = Math.max(+today.slice(0, 4), +item.s.slice(0, 4))
      let date = `${year}${item.s.slice(4)}`
      if (date < today) date = `${++year}${item.s.slice(4)}`
      // `addDays(date, 0)` normalises 29 February in non-leap years, which is then skipped.
      return date >= item.s && date <= end && addDays(date, 0) === date ? [{ item, date }] : []
    }
    const last = item.e || item.s
    if (last < today || item.s > end) return []
    return [{ item, date: item.s < today ? today : item.s }]
  }).sort((a, b) => a.date.localeCompare(b.date) || byTime(a.item, b.item))
}
