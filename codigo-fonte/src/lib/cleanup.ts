import type { AppData } from '../types'
import { addDays, addMonths } from './dates.ts'
import { mainTaskFinder } from './subtasks.ts'

const TASK_DAYS = 2
const EVENT_MONTHS = 2

/**
 * Deletes tasks and reminders completed TASK_DAYS or more days ago and one-off events more than EVENT_MONTHS in the past.
 * Completed tasks without a date (from before dates were recorded) start counting today.
 * Subtasks leave with their main task, which waits while it has a pending subtask.
 * Mutates `d` and returns whether anything changed.
 */
export function purgeExpired(d: AppData, today: string): boolean {
  let changed = false
  for (const t of d.tasks) if (t.d && !t.doneAt) { t.doneAt = today; changed = true }
  const taskCutoff = addDays(today, -TASK_DAYS), eventCutoff = addMonths(today, -EVENT_MONTHS)
  const mainOf = mainTaskFinder(d.tasks)
  const waiting = new Set(d.tasks.filter(t => !t.d).map(t => mainOf(t)?.id))
  const expired = new Set(d.tasks.filter(t => t.d && t.doneAt && t.doneAt <= taskCutoff && !mainOf(t) && !waiting.has(t.id)).map(t => t.id))
  const tasks = d.tasks.filter(t => !expired.has(t.id) && !expired.has(mainOf(t)?.id ?? ''))
  const ev = d.ev.filter(e => e.rep !== 'none' || e.date >= eventCutoff)
  if (tasks.length !== d.tasks.length) { d.tasks = tasks; changed = true }
  if (ev.length !== d.ev.length) { d.ev = ev; changed = true }
  const reminders = d.reminders.filter(r => !r.doneAt || r.doneAt > taskCutoff)
  if (reminders.length !== d.reminders.length) { d.reminders = reminders; changed = true }
  return changed
}
