import type { Sleep, SleepSchedule } from '../types'
import { dow, mins, parse } from './dates'
export function sleepSchedule(s: Sleep, day: number): SleepSchedule {
  const saved = s.daily?.[day]
  if (saved) return saved
  const weekend = day >= 5 && s.wk
  return { bed: weekend ? s.bed2 : s.bed, wake: weekend ? s.wake2 : s.wake }
}

export function sleepIv(s: Sleep, ds: string): [number, number][] {
  const schedule = sleepSchedule(s, dow(parse(ds)))
  const b = mins(schedule.bed), w = mins(schedule.wake)
  if (b === w) return []
  if (b < w) return [[b, w]]
  const r: [number, number][] = []
  if (w > 0) r.push([0, w])
  if (b < 1440) r.push([b, 1440])
  return r
}
