import type { AppData, PEvent } from '../types'
import { dow, mins, parse } from './dates'

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

/** Eventos de um dia, já com as exceções aplicadas e ordenados. */
export function eventsOn(data: AppData, ds: string): PEvent[] {
  return data.ev
    .filter(e => occurs(e, ds))
    .map(e => { const x = e.ex?.[ds]; return x && !x.x ? { ...e, ...x } : e })
    .sort((a, b) => mins(a.start) - mins(b.start) || mins(b.end) - mins(a.end))
}
