import type { Task } from '../types'

// When a task's time limit should notify. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

export type ReminderKind = 'soon' | 'due'
export interface Reminder { taskId: string; kind: ReminderKind; title: string; time: string }

const HOUR_MS = 60 * 60 * 1000

/**
 * Reminders whose moment fell after `since` and up to `now`. Comparing against the last check means each one
 * fires once, and a task created less than an hour before its limit skips "soon", whose moment had already passed.
 * After a gap (computer asleep) "soon" still fires before the limit, and "due" up to an hour after it.
 */
export function remindersBetween(tasks: Task[], since: Date, now: Date): Reminder[] {
  const out: (Reminder & { at: number })[] = []
  for (const t of tasks) {
    if (t.d || !t.due || !t.dueTime) continue
    const at = new Date(`${t.due}T${t.dueTime}:00`).getTime()
    if (Number.isNaN(at)) continue
    const base = { taskId: t.id, title: t.t, time: t.dueTime, at }
    if (at - HOUR_MS > since.getTime() && at - HOUR_MS <= now.getTime() && now.getTime() < at) out.push({ ...base, kind: 'soon' })
    if (at > since.getTime() && at <= now.getTime() && now.getTime() - at <= HOUR_MS) out.push({ ...base, kind: 'due' })
  }
  return out.sort((a, b) => a.at - b.at).map(({ at: _at, ...r }) => r)
}

const line = (r: Reminder) => `${r.title} · ${r.kind === 'soon' ? 'até às' : 'terminou às'} ${r.time}`

/** Text of one notification; reminders from the same check are grouped because the system may show only the last one sent. */
export function reminderText(list: Reminder[]): { title: string; body: string } {
  if (list.length === 1) return { title: list[0].kind === 'soon' ? 'Falta 1 hora' : 'Chegou a hora limite', body: line(list[0]) }
  const extra = list.length - 3
  return { title: `${list.length} avisos de tarefas`, body: list.slice(0, 3).map(line).join('\n') + (extra > 0 ? `\ne mais ${extra}` : '') }
}
