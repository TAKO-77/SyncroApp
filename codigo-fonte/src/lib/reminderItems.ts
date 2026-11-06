import type { ReminderItem, ReminderLead } from '../types'
import type { Reminder } from './reminders'

// The user's reminders: their occurrences and whether they are late or concluded. An occurrence is a local
// 'YYYY-MM-DDTHH:MM' string, so they compare as text. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

export const LEAD_MINUTES: Record<Exclude<ReminderLead, ''>, number> = { '1w': 7 * 24 * 60, '1d': 24 * 60, '1h': 60, '10m': 10 }
export const LEAD_LABELS: Record<ReminderLead, string> = { '': 'Sem aviso prévio', '1w': '1 semana antes', '1d': '1 dia antes', '1h': '1 hora antes', '10m': '10 minutos antes' }
export const LEADS = Object.keys(LEAD_LABELS) as ReminderLead[]

type Schedule = Pick<ReminderItem, 'date' | 'time' | 'repeat' | 'until'>

const pad = (n: number) => String(n).padStart(2, '0')
const dayNumber = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5 }
const addDays = (day: string, n: number) => new Date((dayNumber(day) + n) * 864e5).toISOString().slice(0, 10)
const at = (day: string, time: string) => `${day}T${time}`
const stepOf = (r: Schedule) => r.repeat === 'daily' ? 1 : 7

export const toStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/** The first occurrence after `after`, or null when none is left. An empty `after` gives the first occurrence. */
export function occurrenceAfter(r: Schedule, after: string): string | null {
  const first = at(r.date, r.time)
  if (!after || first > after) return first
  if (r.repeat === 'none') return null
  const step = stepOf(r)
  let day = addDays(r.date, Math.ceil((dayNumber(after.slice(0, 10)) - dayNumber(r.date)) / step) * step)
  if (at(day, r.time) <= after) day = addDays(day, step)
  return r.until && day <= r.until ? at(day, r.time) : null
}

/** The latest occurrence that has already arrived, or null before the first. */
export function lastOccurrence(r: Schedule, now: string): string | null {
  const first = at(r.date, r.time)
  if (first > now) return null
  if (r.repeat === 'none') return first
  const step = stepOf(r), limit = r.until && r.until < now.slice(0, 10) ? r.until : now.slice(0, 10)
  const day = addDays(r.date, Math.floor((dayNumber(limit) - dayNumber(r.date)) / step) * step)
  return at(day, r.time) <= now ? at(day, r.time) : at(addDays(day, -step), r.time)
}

export interface ReminderStatus {
  /** The occurrence the list shows: the one that is late, or else the next one. Null only if nothing was ever concluded and none exists. */
  at: string | null
  late: boolean
  done: boolean
}

/** One line per reminder: a late occurrence stands for every earlier one, so ignored warnings don't pile up. */
export function reminderStatus(r: ReminderItem, now: string): ReminderStatus {
  const passed = lastOccurrence(r, now)
  if (passed && passed > r.doneUntil) return { at: passed, late: true, done: false }
  const next = occurrenceAfter(r, r.doneUntil > now ? r.doneUntil : now)
  return next ? { at: next, late: false, done: false } : { at: r.doneUntil || null, late: false, done: true }
}

/** Concludes what the list shows, with every earlier occurrence, and moves on to the next one. */
export function concludeReminder(r: ReminderItem, now: string, today: string) {
  const { at: current, done } = reminderStatus(r, now)
  if (done || !current) return
  r.doneUntil = current
  r.doneAt = occurrenceAfter(r, current) ? '' : today
}

export function reopenReminder(r: ReminderItem) {
  r.doneUntil = ''
  r.doneAt = ''
}

/** Whether an early warning is still ahead; one whose moment has passed could never fire. */
export function leadAvailable(r: Pick<ReminderItem, 'date' | 'time'>, lead: ReminderLead, now: string): boolean {
  if (!lead || !r.date || !r.time) return true
  return leadMoment(r, lead) > now
}

const leadMoment = (r: Pick<ReminderItem, 'date' | 'time'>, lead: Exclude<ReminderLead, ''>) => {
  const [hour, minute] = r.time.split(':').map(Number), total = hour * 60 + minute - LEAD_MINUTES[lead]
  const days = Math.floor(total / 1440), rest = total - days * 1440
  return at(addDays(r.date, days), `${pad(Math.floor(rest / 60))}:${pad(rest % 60)}`)
}

const LATE_LIMIT_MINUTES = 60
const stampMinutes = (s: string) => dayNumber(s.slice(0, 10)) * 1440 + Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16))

/**
 * Notifications whose moment fell after `since` and up to `now`, both as stamps. Each one fires once, and after a gap
 * (computer asleep or off) a reminder gives only its latest, up to an hour late, instead of a series of old ones.
 * send-reminders/rules.ts has the same rule for phones, and a test keeps them equal.
 */
export function reminderAlertsBetween(items: ReminderItem[], since: string, now: string): Reminder[] {
  const nowMinutes = stampMinutes(now)
  const fresh = (moment: string) => moment > since && moment <= now && nowMinutes - stampMinutes(moment) <= LATE_LIMIT_MINUTES
  const out: Reminder[] = []
  for (const r of items) {
    const alert = (kind: Reminder['kind'], occurrence: string) => out.push({ taskId: `reminder:${r.id}`, kind, title: r.title, time: occurrence.slice(11) })
    const last = lastOccurrence(r, now)
    if (last && last > r.doneUntil && fresh(last)) alert('at', last)
    if (r.repeat === 'none' && r.lead) {
      const first = at(r.date, r.time)
      if (first > now && first > r.doneUntil && fresh(leadMoment(r, r.lead))) alert(r.lead, first)
    }
  }
  return out
}

/**
 * Message for the first problem in the form, or an empty string. A new reminder or a new date and time must be
 * in the future; `saved` lets a reminder that is already late keep its schedule while other things are edited.
 */
export function reminderError(r: Pick<ReminderItem, 'title' | 'date' | 'time' | 'repeat' | 'until'>, now: string, saved?: Pick<ReminderItem, 'date' | 'time'>): string {
  if (!r.title.trim()) return 'Escreve o nome do lembrete.'
  if (!r.date) return r.repeat === 'none' ? 'Escolhe a data.' : 'Escolhe a data de início.'
  if (!r.time) return 'Escolhe a hora.'
  const unchanged = saved && saved.date === r.date && saved.time === r.time
  if (!unchanged && at(r.date, r.time) <= now) return 'Escolhe uma data e hora no futuro.'
  if (r.repeat !== 'none' && !r.until) return 'Escolhe o dia final.'
  if (r.repeat !== 'none' && r.until < r.date) return 'O dia final não pode ser antes da data de início.'
  return ''
}

/**
 * Applies the form to a reminder. Moving a one-off reminder makes it pending again; a repeating one keeps
 * what was concluded, otherwise every past occurrence would come back as late.
 */
export function applyReminderEdit(r: ReminderItem, form: Pick<ReminderItem, 'title' | 'date' | 'time' | 'repeat' | 'lead' | 'until'>, today: string) {
  const moved = r.date !== form.date || r.time !== form.time || r.repeat !== form.repeat
  Object.assign(r, form, { title: form.title.trim(), lead: form.repeat === 'none' ? form.lead : '', until: form.repeat === 'none' ? '' : form.until })
  if (moved && r.repeat === 'none') r.doneUntil = ''
  r.doneAt = r.doneUntil && !occurrenceAfter(r, r.doneUntil) ? r.doneAt || today : ''
}
