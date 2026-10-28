import type { Category } from '../types/categories'
import type { AgendaEvent, EventDraft, EventOverride, Occurrence, Repeat } from '../types/events'
import { isIsoDate, isTime, minutes, weekday } from './dates.ts'
import { newId, str, type Validation } from './records.ts'
import { tagColors } from './theme.ts'

// Agenda events: mapping to `public.events`, recurrence and layout. Pure; same rules as the web app.

export const EVENT_TITLE_MAX = 80
export const REPEAT_OPTIONS: readonly { value: Repeat; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'custom', label: 'Dias à escolha' },
  { value: 'weekly', label: 'Todas as semanas' },
]
const REPEATS = REPEAT_OPTIONS.map(o => o.value)
const isRepeat = (v: unknown): v is Repeat => REPEATS.includes(v as Repeat)
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function eventFromRow(row: Record<string, unknown>): AgendaEvent {
  return {
    id: str(row.id),
    title: str(row.title),
    date: str(row.date),
    start: str(row.start_time),
    end: str(row.end_time),
    repeat: isRepeat(row.rep) ? row.rep : 'none',
    days: Array.isArray(row.days) ? row.days.map(Number) : [],
    categoryId: str(row.category_id),
    color: str(row.color),
    done: isRecord(row.done) ? row.done as Record<string, boolean> : {},
    exceptions: isRecord(row.exceptions) ? row.exceptions as Record<string, EventOverride> : {},
    position: Number(row.position ?? 0),
  }
}

export function eventToRow(e: AgendaEvent) {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    start_time: e.start,
    end_time: e.end,
    rep: e.repeat,
    days: e.days.length ? [...e.days] : null,
    category_id: e.categoryId,
    color: e.color || null,
    done: e.done,
    exceptions: Object.keys(e.exceptions).length ? e.exceptions : null,
    position: e.position,
  }
}

export function occursOn(e: AgendaEvent, day: string): boolean {
  if (day < e.date || e.exceptions[day]?.x) return false
  switch (e.repeat) {
    case 'none': return day === e.date
    case 'daily': return true
    case 'weekdays': return weekday(day) < 5
    case 'custom': return e.days.includes(weekday(day))
    default: return weekday(day) === weekday(e.date)
  }
}

/** Events of a day with that day's changes applied, sorted by start (longer first on ties). */
export function eventsOn(events: readonly AgendaEvent[], day: string): Occurrence[] {
  return events
    .filter(e => occursOn(e, day))
    .map(e => {
      const x = e.exceptions[day]
      if (!x) return { ...e, day }
      return { ...e, day, title: x.title ?? e.title, start: x.start ?? e.start, end: x.end ?? e.end, categoryId: x.cat ?? e.categoryId, color: x.color ?? e.color }
    })
    .sort((a, b) => minutes(a.start) - minutes(b.start) || minutes(b.end) - minutes(a.end))
}

export const durationOf = (e: Pick<AgendaEvent, 'start' | 'end'>) => Math.max(0, minutes(e.end) - minutes(e.start))

export const eventColor = (e: Pick<AgendaEvent, 'categoryId' | 'color'>, categories: readonly Category[]) =>
  categories.find(c => c.id === e.categoryId)?.color ?? (e.color || tagColors.neutral)

/** Side-by-side columns for overlapping events: `lane` is the column, `lanes` how many share the group. */
export function layoutLanes<T extends Pick<AgendaEvent, 'start' | 'end'>>(sorted: readonly T[]): { item: T; lane: number; lanes: number }[] {
  const out: { item: T; lane: number; lanes: number }[] = []
  let group: { item: T; lane: number; lanes: number }[] = [], groupEnd = 0
  const flush = () => {
    const laneEnds: number[] = []
    for (const g of group) {
      let lane = laneEnds.findIndex(end => end <= minutes(g.item.start))
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(0) }
      laneEnds[lane] = minutes(g.item.end)
      g.lane = lane
    }
    out.push(...group.map(g => ({ ...g, lanes: laneEnds.length })))
    group = []
  }
  for (const item of sorted) {
    if (group.length && minutes(item.start) >= groupEnd) { flush(); groupEnd = 0 }
    group.push({ item, lane: 0, lanes: 1 })
    groupEnd = Math.max(groupEnd, minutes(item.end))
  }
  flush()
  return out
}

export function validateEventDraft(d: EventDraft): Validation<EventDraft> {
  const title = d.title.trim()
  if (!title) return { ok: false, error: 'Indica o título do evento.' }
  if (title.length > EVENT_TITLE_MAX) return { ok: false, error: `O título pode ter até ${EVENT_TITLE_MAX} caracteres.` }
  if (!isIsoDate(d.date)) return { ok: false, error: 'Escolhe o dia do evento.' }
  if (!isTime(d.start) || !isTime(d.end)) return { ok: false, error: 'Indica a hora de início e de fim.' }
  if (minutes(d.end) <= minutes(d.start)) return { ok: false, error: 'O fim tem de ser depois do início.' }
  if (!isRepeat(d.repeat)) return { ok: false, error: 'Escolhe como se repete.' }
  // Custom repeats without days fall back to the weekday of the first date, like the web app.
  const days = d.repeat === 'custom' ? (d.days.length ? [...new Set(d.days)].sort() : [weekday(d.date)]) : []
  return { ok: true, value: { ...d, title, days } }
}

/** New event, or `base` with the draft applied (keeping its completions and per-day changes). */
export function applyEventDraft(base: AgendaEvent | undefined, d: EventDraft, color: string, position: number): AgendaEvent {
  return base ? { ...base, ...d, color } : { ...d, id: newId('e'), color, done: {}, exceptions: {}, position }
}

/** Removes one occurrence of a repeating event. */
export const withoutOccurrence = (e: AgendaEvent, day: string): AgendaEvent => ({ ...e, exceptions: { ...e.exceptions, [day]: { x: 1 } } })

/** Moves events of a deleted category to `next` (or to none), including per-day changes. */
export function reassignEvents(events: readonly AgendaEvent[], fromId: string, next: Category | undefined): AgendaEvent[] {
  return events.flatMap(e => {
    const touchesExceptions = Object.values(e.exceptions).some(x => x.cat === fromId)
    if (e.categoryId !== fromId && !touchesExceptions) return []
    const exceptions = Object.fromEntries(Object.entries(e.exceptions).map(([day, x]) => [day, x.cat === fromId ? { ...x, cat: next?.id, color: next?.color } : x]))
    return [{ ...e, exceptions, ...(e.categoryId === fromId ? { categoryId: next?.id ?? '', color: next?.color ?? '' } : {}) }]
  })
}
