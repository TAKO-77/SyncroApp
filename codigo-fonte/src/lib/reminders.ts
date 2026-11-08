import type { Task } from '../types'

// When a task's time limit should notify.

export type ReminderKind = 'soon' | 'due' | '1w' | '1d' | '1h' | '10m' | 'at'
/** A notification to send. Those of the user's reminders have a `taskId` made by `reminderNoticeId`; it is also the key in `reminders_sent`. */
export interface Reminder { taskId: string; kind: ReminderKind; title: string; time: string }

const HOUR_MS = 60 * 60 * 1000
const REMINDER_PREFIX = 'reminder:'
export const reminderNoticeId = (id: string) => REMINDER_PREFIX + id

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

const WORDING: Record<ReminderKind, string> = { soon: 'Falta 1 hora para', due: 'Chegou a hora limite de', '1w': 'Falta 1 semana para', '1d': 'Falta 1 dia para', '1h': 'Falta 1 hora para', '10m': 'Faltam 10 minutos para', at: 'Chegou a hora de' }
const line = (r: Reminder) => `${WORDING[r.kind]} ${r.title}`

/** The tab a notification opens: Lembretes only when all it announces are reminders. */
export const noticeTarget = (list: Pick<Reminder, 'taskId'>[]) => list.every(r => r.taskId.startsWith(REMINDER_PREFIX)) ? 'lembretes' : 'tarefas'

/** Text of one notification; reminders from the same check are grouped because the system may show only the last one sent. */
export function reminderText(list: Reminder[]): { title: string; body: string } {
  const extra = list.length - 3
  return { title: 'Syncro', body: list.slice(0, 3).map(line).join('\n') + (extra > 0 ? `\ne mais ${extra}` : '') }
}
