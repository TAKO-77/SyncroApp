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
 * Deletes tasks and reminders completed TASK_DAYS or more days ago and one-off events more than EVENT_MONTHS in the past.
 * Completed tasks without a date (from before dates were recorded) start counting today.
 * Subtasks leave with their main task, which waits while it has a pending subtask.
 * Mutates `d` and returns whether anything changed.
 */
export function purgeExpired(d: AppData, today: string): boolean {
  let changed = false
  for (const t of d.tasks) if (t.d && !t.doneAt) { t.doneAt = today; changed = true }
  const taskCutoff = shift(today, 0, -TASK_DAYS), eventCutoff = shift(today, -EVENT_MONTHS, 0)
  const ids = new Set(d.tasks.map(t => t.id))
  const isSubtask = (t: Task) => !!t.parentId && ids.has(t.parentId)
  const waiting = new Set(d.tasks.filter(t => isSubtask(t) && !t.d).map(t => t.parentId))
  const expired = new Set(d.tasks.filter(t => t.d && t.doneAt && t.doneAt <= taskCutoff && !isSubtask(t) && !waiting.has(t.id)).map(t => t.id))
  const tasks = d.tasks.filter(t => !expired.has(t.id) && !(t.parentId && expired.has(t.parentId)))
  const ev = d.ev.filter(e => e.rep !== 'none' || e.date >= eventCutoff)
  if (tasks.length !== d.tasks.length) { d.tasks = tasks; changed = true }
  if (ev.length !== d.ev.length) { d.ev = ev; changed = true }
  const reminders = d.reminders.filter(r => !r.doneAt || r.doneAt > taskCutoff)
  if (reminders.length !== d.reminders.length) { d.reminders = reminders; changed = true }
  return changed
}
