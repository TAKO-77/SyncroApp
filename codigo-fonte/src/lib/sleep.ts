import type { Sleep, SleepSchedule } from '../types'
import { dow, mins, parse } from './dates.ts'
export function sleepSchedule(s: Sleep, day: number): SleepSchedule {
  const saved = s.daily?.[day]
  if (saved) return saved
  const weekend = day >= 5 && s.wk
  return { bed: weekend ? s.bed2 : s.bed, wake: weekend ? s.wake2 : s.wake }
}

export interface SleepScope { all: boolean; week: boolean; weekend: boolean }

/** The days (0 = Monday) a schedule chosen for `day` applies to. Monday to Friday offer `week`; Saturday and Sunday offer `weekend`. */
export function sleepTargetDays(day: number, scope: SleepScope): number[] {
  if (scope.all) return [0, 1, 2, 3, 4, 5, 6]
  const days = new Set([day])
  if (scope.week && day < 5) [0, 1, 2, 3, 4].forEach(d => days.add(d))
  if (scope.weekend && day >= 5) [5, 6].forEach(d => days.add(d))
  return [...days].sort((a, b) => a - b)
}

/** All seven schedules, with `schedule` on `days` and the others as they were. */
export function sleepWeek(s: Sleep, days: number[], schedule: SleepSchedule): SleepSchedule[] {
  return [0, 1, 2, 3, 4, 5, 6].map(d => ({ ...(days.includes(d) ? schedule : sleepSchedule(s, d)) }))
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
