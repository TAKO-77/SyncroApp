import type { AppData, Category, PEvent } from '../types'
import { addDays, dow, mins, parse } from './dates.ts'
import { PALETTE } from './palette.ts'

/** The colour an event copies from its category when saved. */
export const categoryColor = (cats: Category[], id: string) => cats.find(c => c.id === id)?.color
/** The colour an event is drawn in: its category's now, else the one it copied, else neutral. */
export const eventColor = (cats: Category[], e: Pick<PEvent, 'cat' | 'color'>) => categoryColor(cats, e.cat) ?? e.color ?? PALETTE.neutral

/**
 * The part of an event on one day. `start` and `end` are clipped to that day (`end` may be 24:00),
 * `realStart` and `realEnd` are the event's own times and `day` is the day it started.
 */
export interface DayEvent extends PEvent { day: string; cont: boolean; realStart: string; realEnd: string }

/** Minutes an event part takes on its day. */
export const eventMinutes = (e: { start: string; end: string }) => Math.max(0, mins(e.end) - mins(e.start))

/** An end before the start means the event finishes the next day. */
export const crossesMidnight = (e: { start: string; end: string }) => e.end < e.start

function occurs(e: PEvent, ds: string): boolean {
  if (ds < e.date) return false
  if (e.ex?.[ds]?.x) return false
  const d = parse(ds)
  switch (e.rep) {
    case 'none': return ds === e.date
    case 'daily': return true
    case 'weekdays': return dow(d) < 5
    case 'custom': return (e.days ?? []).includes(dow(d))
    default: return dow(d) === dow(parse(e.date))
  }
}

const withOverride = (e: PEvent, ds: string): PEvent => { const x = e.ex?.[ds]; return x && !x.x ? { ...e, ...x } : e }

/** Events of one day with their exceptions applied, sorted, including the part of those that crossed midnight. */
export function eventsOn(data: AppData, ds: string): DayEvent[] {
  const prev = addDays(ds, -1)
  return data.ev.flatMap(e => {
    const parts: DayEvent[] = []
    if (occurs(e, ds)) {
      const o = withOverride(e, ds)
      parts.push({ ...o, day: ds, cont: false, realStart: o.start, realEnd: o.end, end: crossesMidnight(o) ? '24:00' : o.end })
    }
    if (occurs(e, prev)) {
      const o = withOverride(e, prev)
      if (crossesMidnight(o) && mins(o.end) > 0) parts.push({ ...o, day: prev, cont: true, realStart: o.start, realEnd: o.end, start: '00:00' })
    }
    return parts
  }).sort((a, b) => mins(a.start) - mins(b.start) || mins(b.end) - mins(a.end))
}
