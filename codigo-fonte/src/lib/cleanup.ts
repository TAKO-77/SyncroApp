import type { AppData, Task } from '../types'

// Removes old items automatically. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

export const TASK_DAYS = 2
export const EVENT_MONTHS = 2

/** Completes or reopens a task, recording the day it was completed. */
export function markDone(task: Task, done: boolean, today = localIso(new Date())) {
  task.d = done
  if (done) task.doneAt = today
  else delete task.doneAt
}

const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (day: string, months: number, days: number) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + months, d + days)).toISOString().slice(0, 10)
}

/**
 * Deletes tasks completed TASK_DAYS or more days ago and one-off events more than EVENT_MONTHS in the past.
 * Completed tasks without a date (from before dates were recorded) start counting today.
 * Mutates `d` and returns whether anything changed.
 */
export function purgeExpired(d: AppData, today: string): boolean {
  let changed = false
  for (const t of d.tasks) if (t.d && !t.doneAt) { t.doneAt = today; changed = true }
  const taskCutoff = shift(today, 0, -TASK_DAYS), eventCutoff = shift(today, -EVENT_MONTHS, 0)
  const tasks = d.tasks.filter(t => !(t.d && t.doneAt && t.doneAt <= taskCutoff))
  const ev = d.ev.filter(e => e.rep !== 'none' || e.date >= eventCutoff)
  if (tasks.length !== d.tasks.length) { d.tasks = tasks; changed = true }
  if (ev.length !== d.ev.length) { d.ev = ev; changed = true }
  return changed
}
