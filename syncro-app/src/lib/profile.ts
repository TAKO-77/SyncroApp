import type { Category } from '../types/categories'
import type { AgendaEvent } from '../types/events'
import type { Profile, Sleep, SleepSchedule, TimeSlice } from '../types/profile'
import { addDays, isTime, minutes, weekday } from './dates.ts'
import { eventsOn } from './events.ts'
import { str, type Validation } from './records.ts'
import { tagColors } from './theme.ts'

// Profile (name, photo, sleep) stored in `public.profiles`, and the time-usage summary. Pure.

export const NAME_MAX = 24
export const PHOTO_MAX = 200_000
export const DEFAULT_SLEEP: Sleep = { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' }
export const EMPTY_PROFILE: Profile = { name: '', photo: '', sleep: DEFAULT_SLEEP, reset: '' }

export function profileFromRow(row: Record<string, unknown> | null): Profile {
  if (!row) return EMPTY_PROFILE
  const sleep = row.sleep && typeof row.sleep === 'object' ? row.sleep as Partial<Sleep> : {}
  return { name: str(row.name), photo: str(row.photo), sleep: { ...DEFAULT_SLEEP, ...sleep }, reset: str(row.reset) }
}

export const profileToRow = (p: Profile) => ({ name: p.name, photo: p.photo || null, sleep: p.sleep, reset: p.reset })

/** Schedule of a weekday (Monday = 0): the saved one, or the older weekday/weekend pair. */
export function sleepSchedule(s: Sleep, day: number): SleepSchedule {
  const saved = s.daily?.[day]
  if (saved) return saved
  const weekend = day >= 5 && s.wk
  return { bed: weekend ? s.bed2 : s.bed, wake: weekend ? s.wake2 : s.wake }
}

const weekSchedules = (s: Sleep) => Array.from({ length: 7 }, (_, i) => ({ ...sleepSchedule(s, i) }))

/** Copy of `s` with one weekday's bedtime or wake-up time changed. */
export function withSleepTime(s: Sleep, day: number, field: keyof SleepSchedule, value: string): Sleep {
  if (!isTime(value)) return s
  const daily = weekSchedules(s)
  daily[day] = { ...daily[day], [field]: value }
  return { ...s, daily }
}

/** Copy of `s` where every weekday uses the schedule of `fromDay`. */
export const withSleepForAllDays = (s: Sleep, fromDay: number): Sleep =>
  ({ ...s, daily: Array.from({ length: 7 }, () => ({ ...sleepSchedule(s, fromDay) })) })

export const sleepMinutes = (x: SleepSchedule) => (minutes(x.wake) - minutes(x.bed) + 1440) % 1440

/** Minutes of `day` spent asleep, as [from, to) ranges. */
export function sleepIntervals(s: Sleep, day: string): [number, number][] {
  const x = sleepSchedule(s, weekday(day))
  const bed = minutes(x.bed), wake = minutes(x.wake)
  if (bed === wake) return []
  if (bed < wake) return [[bed, wake]]
  const out: [number, number][] = []
  if (wake > 0) out.push([0, wake])
  if (bed < 1440) out.push([bed, 1440])
  return out
}

export function validateName(name: string): Validation<string> {
  const value = name.trim()
  if (!value) return { ok: false, error: 'Indica o teu nome.' }
  if (value.length > NAME_MAX) return { ok: false, error: `O nome pode ter até ${NAME_MAX} caracteres.` }
  return { ok: true, value }
}

export const isValidPhoto = (photo: string) =>
  photo.length <= PHOTO_MAX && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)

/**
 * Where the time goes between `from` and `to` (inclusive): planned minutes per category,
 * then sleep that doesn't overlap events, then the free time left.
 */
export function timeUsage(events: readonly AgendaEvent[], categories: readonly Category[], sleep: Sleep, from: string, to: string): { slices: TimeSlice[]; planned: number; total: number } {
  const perCategory: Record<string, number> = {}
  let days = 0, slept = 0
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days++
    const busy = new Uint8Array(1440)
    for (const e of eventsOn(events, day)) {
      const a = minutes(e.start), b = minutes(e.end), key = e.categoryId || 'none'
      perCategory[key] = (perCategory[key] ?? 0) + Math.max(0, b - a)
      busy.fill(1, a, b)
    }
    for (const [a, b] of sleepIntervals(sleep, day)) for (let m = a; m < b; m++) if (!busy[m]) slept++
  }
  const planned: TimeSlice[] = [...categories, { id: 'none', name: 'Sem categoria', color: tagColors.neutral }]
    .map(c => ({ id: c.id, name: c.name, color: c.color, value: perCategory[c.id] ?? 0 }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
  const plannedTotal = planned.reduce((sum, s) => sum + s.value, 0)
  const total = Math.max(days * 1440, plannedTotal)
  const slices = [
    ...planned,
    ...(slept ? [{ id: 'sono', name: 'Sono', color: tagColors.slate, value: slept }] : []),
    { id: 'free', name: 'Tempo livre', color: tagColors.muted, value: Math.max(0, total - plannedTotal - slept) },
  ]
  return { slices, planned: plannedTotal, total }
}
