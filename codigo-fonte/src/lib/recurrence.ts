import type { AppData, PEvent } from '../types'
import { dow, iso, mins, parse } from './dates.ts'

/**
 * The part of an event on one day. `start` and `end` are clipped to that day (`end` may be 24:00),
 * `realStart` and `realEnd` are the event's own times and `day` is the day it started.
 */
export interface DayEvent extends PEvent { day: string; cont: boolean; realStart: string; realEnd: string }

/** An end before the start means the event finishes the next day. */
export const crossesMidnight = (e: { start: string; end: string }) => e.end < e.start

export function occurs(e: PEvent, ds: string): boolean {
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

/** Eventos de um dia, já com as exceções aplicadas e ordenados, incluindo a continuação dos que passaram a meia-noite. */
export function eventsOn(data: AppData, ds: string): DayEvent[] {
  const y = parse(ds); y.setDate(y.getDate() - 1)
  const prev = iso(y)
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
