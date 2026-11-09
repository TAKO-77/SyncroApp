// Which reminders a device should receive. Self-contained: the function is deployed on its own.
// The wording matches codigo-fonte/src/lib/reminders.ts, which the Windows app uses; a test keeps them equal.

export const LANGUAGES = ['pt-PT', 'en', 'de', 'fr'] as const
export type Language = typeof LANGUAGES[number]
/** profiles.language, with pt-PT for a value this function does not know. */
export const languageOf = (value: unknown): Language => LANGUAGES.includes(value as Language) ? value as Language : 'pt-PT'

export type ReminderKind = 'soon' | 'due' | '1w' | '1d' | '1h' | '10m' | 'at'
export interface TaskRow { id: string; title: string; due: string; due_time: string }
export interface ReminderRow { id: string; title: string; date: string; time: string; frequency: 'none' | 'daily' | 'weekly'; lead_time: '' | '1w' | '1d' | '1h' | '10m'; end_date: string | null; done_until: string }
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

const LEAD_MINUTES = { '1w': 7 * 1440, '1d': 1440, '1h': 60, '10m': 10 } as const
const dayMinutes = (day: string) => { const [year, month, date] = day.split('-').map(Number); return minutes(year, month, date, 0, 0) }
const timeMinutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute }
const stampMinutes = (stamp: string) => stamp ? dayMinutes(stamp.slice(0, 10)) + timeMinutes(stamp.slice(11)) : -Infinity

/** The user's reminders due now: the same rule as `reminderAlertsBetween` in codigo-fonte/src/lib/reminderItems.ts, which a test compares. */
export function reminderAlertsAt(rows: ReminderRow[], now: number): Reminder[] {
  const out: Reminder[] = []
  const arrived = (at: number) => now >= at && now < at + WINDOW_MINUTES
  for (const r of rows) {
    const start = dayMinutes(r.date), time = timeMinutes(r.time), done = stampMinutes(r.done_until)
    if (Number.isNaN(start + time)) continue
    const alert = (kind: ReminderKind, day: string) => out.push({ taskId: `reminder:${r.id}`, kind, title: r.title, time: r.time, due: day })
    if (r.frequency === 'none') {
      if (start + time <= done) continue
      if (arrived(start + time)) alert('at', r.date)
      if (r.lead_time && arrived(start + time - LEAD_MINUTES[r.lead_time])) alert(r.lead_time, r.date)
      continue
    }
    const step = (r.frequency === 'daily' ? 1 : 7) * 1440, last = r.end_date ? dayMinutes(r.end_date) : -Infinity
    // The window can reach back across midnight.
    for (const day of [now - WINDOW_MINUTES, now].map(m => m - ((m % 1440) + 1440) % 1440).filter((d, i, all) => all.indexOf(d) === i)) {
      if (day < start || day > last || (day - start) % step || day + time <= done) continue
      if (arrived(day + time)) alert('at', new Date(day * 60000).toISOString().slice(0, 10))
    }
  }
  return out
}

/** How long the push service keeps trying a sleeping phone: never past the moment announced, nor over an hour late. */
const EXPIRY_SECONDS: Record<ReminderKind, number> = { soon: 55 * 60, due: 3600, '1w': 3600, '1d': 3600, '1h': 55 * 60, '10m': 9 * 60, at: 3600 }
export const expirySeconds = (list: Reminder[]) => Math.max(...list.map(r => EXPIRY_SECONDS[r.kind]))

/** `{title}` is the task or reminder; `{n}` the count. The Windows app has the same text; a test compares them. */
const WORDING: Record<Language, Record<ReminderKind, string>> = {
  'pt-PT': { soon: 'Falta 1 hora para {title}', due: 'Chegou a hora limite de {title}', '1w': 'Falta 1 semana para {title}', '1d': 'Falta 1 dia para {title}', '1h': 'Falta 1 hora para {title}', '10m': 'Faltam 10 minutos para {title}', at: 'Chegou a hora de {title}' },
  en: { soon: 'In 1 hour: {title}', due: 'Deadline reached: {title}', '1w': 'In 1 week: {title}', '1d': 'In 1 day: {title}', '1h': 'In 1 hour: {title}', '10m': 'In 10 minutes: {title}', at: 'Now: {title}' },
  de: { soon: 'In 1 Stunde: {title}', due: 'Frist erreicht: {title}', '1w': 'In 1 Woche: {title}', '1d': 'In 1 Tag: {title}', '1h': 'In 1 Stunde: {title}', '10m': 'In 10 Minuten: {title}', at: 'Jetzt: {title}' },
  fr: { soon: 'Dans 1 heure : {title}', due: 'Échéance atteinte : {title}', '1w': 'Dans 1 semaine : {title}', '1d': 'Dans 1 jour : {title}', '1h': 'Dans 1 heure : {title}', '10m': 'Dans 10 minutes : {title}', at: 'Maintenant : {title}' },
}
const MORE: Record<Language, string> = { 'pt-PT': 'e mais {n}', en: 'and {n} more', de: 'und {n} weitere', fr: 'et {n} de plus' }
const COUNT: Record<Language, string> = { 'pt-PT': '{n} avisos do Syncro', en: '{n} Syncro alerts', de: '{n} Syncro-Hinweise', fr: '{n} alertes Syncro' }
const line = (r: Pick<Reminder, 'kind' | 'title'>, lang: Language) => WORDING[lang][r.kind].replace('{title}', () => r.title)

/** The tab a notification opens: Lembretes only when all it announces are reminders. */
export const noticeTarget = (list: Pick<Reminder, 'taskId'>[]) => list.every(r => r.taskId.startsWith('reminder:')) ? 'lembretes' : 'tarefas'

export function reminderText(list: Pick<Reminder, 'kind' | 'title'>[], lang: Language = 'pt-PT'): { title: string; body: string } {
  // iPhones always add "from Syncro" under the title, so the app's name would only repeat there.
  if (list.length === 1) return { title: line(list[0], lang), body: '' }
  const extra = list.length - 3
  return { title: COUNT[lang].replace('{n}', String(list.length)), body: list.slice(0, 3).map(r => line(r, lang)).join('\n') + (extra > 0 ? '\n' + MORE[lang].replace('{n}', String(extra)) : '') }
}

const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/]

/** Endpoints come from the client, so the server only ever calls the known browser push services. */
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && PUSH_HOSTS.some(host => host.test(url.hostname))
  } catch { return false }
}
