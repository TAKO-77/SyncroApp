import { dayMonth } from './i18n/calendar.ts'
import type { Language } from './i18n/languages.ts'

/** Portuguese names; translated screens use `days`/`months` from `useT()`. */
export const DN = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const MN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const p2 = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const parse = (s: string) => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c) }
export const todayIso = () => iso(new Date())
export const dow = (d: Date) => (d.getDay() + 6) % 7
export const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const hm = (m: number) => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`
export const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? p2(r) : ''}` : `${r}min` }
/** Minutes since midnight on the local clock. */
export const minuteOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
/** Local 'YYYY-MM-DDTHH:MM', which compares as text. */
export const toStamp = (d: Date) => `${iso(d)}T${hm(minuteOfDay(d))}`

/** Shifts a day by whole days; impossible dates (29 February in a common year) roll over. */
export const addDays = (day: string, n: number) => { const d = parse(day); d.setDate(d.getDate() + n); return iso(d) }
/** Shifts a day by whole months, keeping the day of the month when it exists and the month's last day otherwise. */
export const addMonths = (day: string, n: number) => {
  const d = parse(day), date = d.getDate()
  d.setDate(1); d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(date, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return iso(d)
}
/** The days shown for a month, whole Monday-first weeks from the week of its first day to the week of its last. */
export function monthGrid(ym: string): string[] {
  const first = parse(`${ym}-01`), length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const start = addDays(iso(first), -dow(first))
  return Array.from({ length: Math.ceil((dow(first) + length) / 7) * 7 }, (_, i) => addDays(start, i))
}
/** Minutes from `a` to `b`, past midnight when `b` is earlier. */
export const spanMinutes = (a: string, b: string) => (mins(b) - mins(a) + 1440) % 1440
/** "4 nov" ("4 Nov", "4. Nov.", "4 nov."). */
export const shortDate = (day: string, lang: Language = 'pt-PT') => { const d = parse(day); return dayMonth(lang, d.getDate(), d.getMonth()) }
/** Adds `k` months to a `YYYY-MM` string. */
export const ymAdd = (ym: string, k: number) => addMonths(`${ym}-01`, k).slice(0, 7)
/** A day as a count of days, so that differences between days are exact. */
export const dayIndex = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5 }
