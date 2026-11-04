import type { Task } from '../types'

// Task deadline rules. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

type Due = Pick<Task, 'due' | 'dueTime'>

/** A task with a time is overdue once that minute has passed; without one, only after its day ends. */
export const isOverdue = (t: Due, today: string, time: string) =>
  !!t.due && (t.due < today || (t.due === today && !!t.dueTime && t.dueTime < time))

/** Sort key: earliest deadline first, a day's timed tasks before its untimed ones, undated tasks last. */
export const dueKey = (t: Due) => `${t.due || '9999-99-99'} ${t.dueTime || '99:99'}`

/** Day to keep when a time is picked: choosing only a time means today. */
export const dueForTime = (due: string, time: string, today: string) => due || (time ? today : '')
