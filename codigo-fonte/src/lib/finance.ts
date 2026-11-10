import type { Finance } from '../types'
import { ymAdd } from './dates.ts'
import { FIN_CATS } from './palette.ts'
import { LOCALES, type Language } from './i18n/languages.ts'

// Monthly finance totals shared by Finanças and Início.

export const eur = (n: number, lang: Language = 'pt-PT') => n.toLocaleString(LOCALES[lang], { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Whether a record counts in month `ym`: recurring ones from their start month until `end`, one-off ones only in their own month. */
export const activeIn = (e: Finance, ym: string) => e.k === 'rec' ? ym >= e.date.slice(0, 7) && (!e.end || ym <= e.end) : e.date.slice(0, 7) === ym

export type MonthTotals = ReturnType<typeof monthTotals>

export function monthTotals(fin: Finance[], ym: string) {
  const r = { i: 0, o: 0, rec: 0, one: 0, cat: {} as Record<string, number> }
  fin.forEach(e => { if (!activeIn(e, ym)) return; if (e.t === 'in') r.i += e.a; else { r.o += e.a; r[e.k] += e.a; r.cat[e.c] = (r.cat[e.c] ?? 0) + e.a } })
  return r
}

/** The `n` months ending with `ym`, oldest first, and the largest income or expense among them (at least 1, for bar heights). */
export function recentMonths(fin: Finance[], ym: string, n = 6) {
  const months = Array.from({ length: n }, (_, k) => ymAdd(ym, k - n + 1)).map(q => ({ q, ...monthTotals(fin, q) }))
  return { months, max: Math.max(1, ...months.flatMap(x => [x.i, x.o])) }
}

/** Expense categories with spending in the month, largest first. */
export const spendByCategory = (totals: MonthTotals) =>
  FIN_CATS.map(c => ({ ...c, v: totals.cat[c.id] ?? 0 })).filter(c => c.v > 0).sort((a, b) => b.v - a.v)

/** All money recorded up to month `ym`: each month's balance added to the total of the months before it. */
export function overallBalance(fin: Finance[], ym: string) {
  if (!fin.length) return 0
  let total = 0
  for (let month = fin.reduce((first, e) => e.date.slice(0, 7) < first ? e.date.slice(0, 7) : first, ym); month <= ym; month = ymAdd(month, 1)) {
    const { i, o } = monthTotals(fin, month)
    total += i - o
  }
  return Math.round(total * 100) / 100
}
