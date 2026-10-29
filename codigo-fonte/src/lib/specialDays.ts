import type { SpecialDay } from '../types'

// Upcoming special days shared by Calendário and Início. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

const DAY = 86400000
const utc = (ds: string) => Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10))
const addDays = (ds: string, n: number) => new Date(utc(ds) + n * DAY).toISOString().slice(0, 10)

/** Whole days from `today` until `date` (both `YYYY-MM-DD`). */
export const daysLeft = (date: string, today: string) => Math.round((utc(date) - utc(today)) / DAY)

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
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.item.h || '99').localeCompare(b.item.h || '99'))
}
