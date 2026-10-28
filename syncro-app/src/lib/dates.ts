// Date and time helpers. Dates are ISO `YYYY-MM-DD`, months `YYYY-MM` and times `HH:MM`, like the web app.
// Pure and free of runtime imports so the Node test scripts can load it.

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const WEEKDAY_NAMES = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const p2 = (n: number) => String(n).padStart(2, '0')

export const toIso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayIso = () => toIso(new Date())
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return toIso(d) }
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(parseIso(s)) === s
/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86400000)

/** Day of the week with Monday = 0. */
export const weekday = (s: string) => (parseIso(s).getDay() + 6) % 7
export const weekStart = (s: string) => addDays(s, -weekday(s))

export const shortDate = (s: string) => { const d = parseIso(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }
export const longDate = (s: string) => { const d = parseIso(s); return `${WEEKDAY_NAMES[weekday(s)]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}` }

export const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
export const addMonths = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}` }
export const monthLabel = (ym: string) => `${MONTH_NAMES[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`
/** ISO dates of a month grid (Monday first), including the days of the neighbouring months that complete the weeks. */
export function monthCells(ym: string): string[] {
  const first = `${ym}-01`, start = weekStart(first)
  const days = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate()
  const rows = Math.ceil((weekday(first) + days) / 7)
  return Array.from({ length: rows * 7 }, (_, i) => addDays(start, i))
}

export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
export const minutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const hm = (m: number) => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`
/** `1h30`, `2h`, `45min`. */
export const formatDuration = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? p2(r) : ''}` : `${r}min` }
