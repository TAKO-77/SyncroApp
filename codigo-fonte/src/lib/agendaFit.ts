import { hm, mins } from './dates.ts'

/** Hours of the phone's week view, in minutes. */
export const WEEK_RANGE = { from: 8 * 60, to: 20 * 60 }

const MIN_SCALE = 0.6, MAX_SCALE = 1.2
/** Height taken by what surrounds the timetable on a phone: logo, switch, toolbar, day headers and bottom bar. */
const SURROUNDINGS = 380

/** Pixels per minute that fit the week on screen, kept within what stays readable. */
export function weekScale(viewportHeight: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, (viewportHeight - SURROUNDINGS) / (WEEK_RANGE.to - WEEK_RANGE.from)))
}

/** Events cut to the week's hours; those entirely outside are left out. */
export function clipToWeek<T extends { start: string; end: string }>(events: T[]): T[] {
  return events
    .filter(e => mins(e.end) > WEEK_RANGE.from && mins(e.start) < WEEK_RANGE.to)
    .map(e => ({ ...e, start: hm(Math.max(mins(e.start), WEEK_RANGE.from)), end: hm(Math.min(mins(e.end), WEEK_RANGE.to)) }))
}
