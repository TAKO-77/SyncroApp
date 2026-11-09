import type { SpecialDay } from '../types'
import { addDays, dayIndex, hm, mins } from './dates.ts'

// Special days shared by Agenda, Calendário and Início.

/** Whole days from `today` until `date` (both `YYYY-MM-DD`). */
export const daysLeft = (date: string, today: string) => dayIndex(date) - dayIndex(today)

const byTime = (a: SpecialDay, b: SpecialDay) => (a.h || '99').localeCompare(b.h || '99')

/** The special days that fall on `day`, earliest time first. */
export const specialDaysOn = (days: SpecialDay[], day: string) => days
  .filter(x => x.y ? day >= x.s && day.slice(5) === x.s.slice(5) : day >= x.s && day <= (x.e || x.s))
  .sort(byTime)

/** A non-yearly special day that lasts more than one day; the month grid draws it as one bar. */
export const isMultiDay = (x: SpecialDay) => !x.y && !!x.e && x.e > x.s

/** The time shown for a special day: `h`, or `h–he` when it has an end time. */
export const specialDayTime = (x: Pick<SpecialDay, 'h' | 'he'>) => x.h ? (x.he ? `${x.h}–${x.he}` : x.h) : ''

/** The end time suggested for start time `h`: one hour later, but not past 23:59. */
export const defaultEndTime = (h: string) => h ? hm(Math.min(mins(h) + 60, 1439)) : ''

/** An end time that is not after the start time on a special day that starts and ends on the same day. */
export const endTimeInvalid = (x: Pick<SpecialDay, 's' | 'e' | 'h' | 'he' | 'y'>) =>
  !!x.h && !!x.he && (x.y || !x.e || x.e === x.s) && x.he <= x.h

/** A timed special day as a block in the Agenda timetable on one day. `start`/`end` are clipped to that day
 *  (`end` can be `24:00`); `realStart`/`realEnd` are its own times; `cont` marks the part on the last day
 *  and `next` a part that continues on a later day. */
export interface SpecialBlock { item: SpecialDay; start: string; end: string; realStart: string; realEnd: string; cont: boolean; next: boolean }

/** Timed special days on `day` as Agenda blocks. A one-day special day lasts `h`–`he`, one hour without `he`.
 *  A multi-day one runs from `h` on its first day and, when it has `he`, from 00:00 to `he` on its last day;
 *  the days between, and a last day without `he`, stay in the day header. */
export function specialBlocksOn(days: SpecialDay[], day: string): SpecialBlock[] {
  return specialDaysOn(days, day).flatMap((item): SpecialBlock[] => {
    if (!item.h) return []
    if (!isMultiDay(item)) {
      const realEnd = item.he && item.he > item.h ? item.he : defaultEndTime(item.h)
      return [{ item, start: item.h, end: realEnd, realStart: item.h, realEnd, cont: false, next: false }]
    }
    const realEnd = item.he || ''
    if (day === item.s) return [{ item, start: item.h, end: '24:00', realStart: item.h, realEnd, cont: false, next: true }]
    if (day === item.e && realEnd) return [{ item, start: '00:00', end: realEnd, realStart: item.h, realEnd, cont: true, next: false }]
    return []
  })
}

/** One row of the month grid's bar for a multi-day special day: columns `from`–`to` (0–6) in lane `lane`.
 *  `head`/`tail` say whether the special day really starts/ends inside this week. */
export interface WeekBar { item: SpecialDay; from: number; to: number; lane: number; head: boolean; tail: boolean }

/** The multi-day special days crossing the 7 days from `start`, each in the lowest lane free from its first column. */
export function weekBars(days: SpecialDay[], start: string): WeekBar[] {
  const end = addDays(start, 6), lanes: number[] = []
  return days.filter(x => isMultiDay(x) && x.s <= end && x.e >= start)
    .sort((a, b) => a.s.localeCompare(b.s) || b.e.localeCompare(a.e) || byTime(a, b))
    .map(item => {
      const from = item.s < start ? 0 : dayIndex(item.s) - dayIndex(start)
      const to = item.e > end ? 6 : dayIndex(item.e) - dayIndex(start)
      let lane = lanes.findIndex(last => last < from)
      if (lane < 0) lane = lanes.length
      lanes[lane] = to
      return { item, from, to, lane, head: item.s >= start, tail: item.e <= end }
    })
}

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
