// Which reminders a device should receive. Free of runtime imports so scripts/test-sync.ts can run it with Node.
// The text matches codigo-fonte/src/lib/reminders.ts, which the Windows app uses; a test keeps them equal.

export type ReminderKind = 'soon' | 'due'
export interface TaskRow { id: string; title: string; due: string; due_time: string }
export interface Reminder { taskId: string; kind: ReminderKind; title: string; time: string; due: string }

/** The job runs every minute; a wider window covers a run that failed. `reminders_sent` stops repeats. */
const WINDOW_MINUTES = 5

const minutes = (year: number, month: number, day: number, hour: number, minute: number) => Date.UTC(year, month - 1, day, hour, minute) / 60000

/** The time on the device's clock, as a number comparable with a task's date and time. Throws on an unknown zone. */
export function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(now)
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return minutes(part('year'), part('month'), part('day'), part('hour'), part('minute'))
}

export function remindersAt(tasks: TaskRow[], now: number): Reminder[] {
  const out: (Reminder & { at: number })[] = []
  for (const t of tasks) {
    const [year, month, day] = t.due.split('-').map(Number), [hour, minute] = t.due_time.split(':').map(Number)
    const at = minutes(year, month, day, hour, minute)
    if (Number.isNaN(at)) continue
    const base = { taskId: t.id, title: t.title, time: t.due_time, due: t.due, at }
    if (now >= at - 60 && now < at - 60 + WINDOW_MINUTES) out.push({ ...base, kind: 'soon' })
    if (now >= at && now < at + WINDOW_MINUTES) out.push({ ...base, kind: 'due' })
  }
  return out.sort((a, b) => a.at - b.at).map(({ at: _at, ...r }) => r)
}

/** How long the push service keeps trying a sleeping phone: "soon" only until the limit, "due" for one more hour. */
export const expirySeconds = (list: Reminder[]) => (list.some(r => r.kind === 'due') ? 3600 : 55 * 60)

const line = (r: Pick<Reminder, 'kind' | 'title' | 'time'>) => `${r.title} · ${r.kind === 'soon' ? 'até às' : 'terminou às'} ${r.time}`

export function reminderText(list: Pick<Reminder, 'kind' | 'title' | 'time'>[]): { title: string; body: string } {
  if (list.length === 1) return { title: list[0].kind === 'soon' ? 'Falta 1 hora' : 'Chegou a hora limite', body: line(list[0]) }
  const extra = list.length - 3
  return { title: `${list.length} avisos de tarefas`, body: list.slice(0, 3).map(line).join('\n') + (extra > 0 ? `\ne mais ${extra}` : '') }
}

const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/]

/** Endpoints come from the client, so the server only ever calls the known browser push services. */
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && PUSH_HOSTS.some(host => host.test(url.hostname))
  } catch { return false }
}
