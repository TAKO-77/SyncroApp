export type Repeat = 'none' | 'daily' | 'weekdays' | 'custom' | 'weekly'

/** Change to a single occurrence, stored as-is in `events.exceptions` (same keys as the web app). */
export interface EventOverride { x?: 1; title?: string; start?: string; end?: string; cat?: string; color?: string }

export interface AgendaEvent {
  readonly id: string
  readonly title: string
  /** First day (ISO). */
  readonly date: string
  readonly start: string
  readonly end: string
  readonly repeat: Repeat
  /** Weekdays (Monday = 0) for `custom`; empty otherwise. */
  readonly days: readonly number[]
  readonly categoryId: string
  /** Colour copied from the category when saved; '' when unknown. */
  readonly color: string
  readonly done: Readonly<Record<string, boolean>>
  /** Per-date changes; `{ x: 1 }` removes that occurrence. */
  readonly exceptions: Readonly<Record<string, EventOverride>>
  readonly position: number
}

/** One event on one day, with that day's changes applied. */
export interface Occurrence extends AgendaEvent { readonly day: string }

export type EventDraft = Pick<AgendaEvent, 'title' | 'date' | 'start' | 'end' | 'repeat' | 'days' | 'categoryId'>
