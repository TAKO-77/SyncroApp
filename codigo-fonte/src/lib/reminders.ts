import type { Task } from '../types'
import { DEFAULT_LANGUAGE, type Language } from './i18n/languages.ts'

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

/** `{title}` is the task or reminder; `{n}` the count. The server has the same text; a test compares them. */
const WORDING: Record<Language, Record<ReminderKind, string>> = {
  'pt-PT': { soon: 'Falta 1 hora para {title}', due: 'Chegou a hora limite de {title}', '1w': 'Falta 1 semana para {title}', '1d': 'Falta 1 dia para {title}', '1h': 'Falta 1 hora para {title}', '10m': 'Faltam 10 minutos para {title}', at: 'Chegou a hora de {title}' },
  en: { soon: 'In 1 hour: {title}', due: 'Deadline reached: {title}', '1w': 'In 1 week: {title}', '1d': 'In 1 day: {title}', '1h': 'In 1 hour: {title}', '10m': 'In 10 minutes: {title}', at: 'Now: {title}' },
  de: { soon: 'In 1 Stunde: {title}', due: 'Frist erreicht: {title}', '1w': 'In 1 Woche: {title}', '1d': 'In 1 Tag: {title}', '1h': 'In 1 Stunde: {title}', '10m': 'In 10 Minuten: {title}', at: 'Jetzt: {title}' },
  fr: { soon: 'Dans 1 heure : {title}', due: 'Échéance atteinte : {title}', '1w': 'Dans 1 semaine : {title}', '1d': 'Dans 1 jour : {title}', '1h': 'Dans 1 heure : {title}', '10m': 'Dans 10 minutes : {title}', at: 'Maintenant : {title}' },
}
const MORE: Record<Language, string> = { 'pt-PT': 'e mais {n}', en: 'and {n} more', de: 'und {n} weitere', fr: 'et {n} de plus' }
const line = (r: Reminder, lang: Language) => WORDING[lang][r.kind].replace('{title}', () => r.title)

/** The tab a notification opens: Lembretes only when all it announces are reminders. */
export const noticeTarget = (list: Pick<Reminder, 'taskId'>[]) => list.every(r => r.taskId.startsWith(REMINDER_PREFIX)) ? 'lembretes' : 'tarefas'

/** Text of one notification; reminders from the same check are grouped because the system may show only the last one sent. */
export function reminderText(list: Reminder[], lang: Language = DEFAULT_LANGUAGE): { title: string; body: string } {
  const extra = list.length - 3
  return { title: 'Syncro', body: list.slice(0, 3).map(r => line(r, lang)).join('\n') + (extra > 0 ? '\n' + MORE[lang].replace('{n}', String(extra)) : '') }
}
