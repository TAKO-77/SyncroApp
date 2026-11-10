import type { ReminderItem, ReminderLead } from '../types'
import { reminderNoticeId, type Reminder } from './reminders.ts'
import { addDays, dayIndex, hm, mins } from './dates.ts'
import { translator } from './i18n/translate.ts'
import type { Language } from './i18n/languages.ts'

// The user's reminders: their occurrences and whether they are late or concluded. An occurrence is a local
// 'YYYY-MM-DDTHH:MM' string, so they compare as text.

export const LEAD_MINUTES: Record<Exclude<ReminderLead, ''>, number> = { '1w': 7 * 24 * 60, '1d': 24 * 60, '1h': 60, '10m': 10 }
export const LEADS: ReminderLead[] = ['', '1w', '1d', '1h', '10m']
/** Name of an early warning in a language. */
export const leadLabel = (lead: ReminderLead, lang: Language = 'pt-PT') => translator(lang).t(`lembretes.lead.${lead || 'none'}` as 'lembretes.lead.none')

type Schedule = Pick<ReminderItem, 'date' | 'time' | 'repeat' | 'until'>

const at = (day: string, time: string) => `${day}T${time}`
const stepOf = (r: Schedule) => r.repeat === 'daily' ? 1 : 7

/** The first occurrence after `after`, or null when none is left. An empty `after` gives the first occurrence. */
export function occurrenceAfter(r: Schedule, after: string): string | null {
  const first = at(r.date, r.time)
  if (!after || first > after) return first
  if (r.repeat === 'none') return null
  const step = stepOf(r)
  let day = addDays(r.date, Math.ceil((dayIndex(after.slice(0, 10)) - dayIndex(r.date)) / step) * step)
  if (at(day, r.time) <= after) day = addDays(day, step)
  return r.until && day <= r.until ? at(day, r.time) : null
}

/** The latest occurrence that has already arrived, or null before the first. */
export function lastOccurrence(r: Schedule, now: string): string | null {
  const first = at(r.date, r.time)
  if (first > now) return null
  if (r.repeat === 'none') return first
  const step = stepOf(r), limit = r.until && r.until < now.slice(0, 10) ? r.until : now.slice(0, 10)
  const day = addDays(r.date, Math.floor((dayIndex(limit) - dayIndex(r.date)) / step) * step)
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

/** An empty one-off reminder, to be filled by `applyReminderEdit`. */
export const newReminder = (id: string): ReminderItem => ({ id, title: '', date: '', time: '', repeat: 'none', lead: '', until: '', doneUntil: '', doneAt: '' })

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
  const total = mins(r.time) - LEAD_MINUTES[lead]
  const days = Math.floor(total / 1440)
  return at(addDays(r.date, days), hm(total - days * 1440))
}

const LATE_LIMIT_MINUTES = 60
const stampMinutes = (s: string) => dayIndex(s.slice(0, 10)) * 1440 + mins(s.slice(11, 16))

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
    const alert = (kind: Reminder['kind'], occurrence: string) => out.push({ taskId: reminderNoticeId(r.id), kind, title: r.title, time: occurrence.slice(11) })
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
export function reminderError(r: Pick<ReminderItem, 'title' | 'date' | 'time' | 'repeat' | 'until'>, now: string, saved?: Pick<ReminderItem, 'date' | 'time'>, lang: Language = 'pt-PT'): string {
  const { t } = translator(lang)
  if (!r.title.trim()) return t('lembretes.error.title')
  if (!r.date) return r.repeat === 'none' ? t('lembretes.error.date') : t('lembretes.error.startDate')
  if (!r.time) return t('lembretes.error.time')
  const unchanged = saved && saved.date === r.date && saved.time === r.time
  if (!unchanged && at(r.date, r.time) <= now) return t('lembretes.error.future')
  if (r.repeat !== 'none' && !r.until) return t('lembretes.error.until')
  if (r.repeat !== 'none' && r.until < r.date) return t('lembretes.error.untilBefore')
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
