import type { Finance } from '../types'

// Monthly finance totals shared by Finanças and Início. Kept free of runtime imports so scripts/test-sync.ts can run it with Node.

export const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Adds `k` months to a `YYYY-MM` string. */
export const ymAdd = (ym: string, k: number) => { const [a, b] = ym.split('-').map(Number), d = new Date(a, b - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

/** Whether a record counts in month `ym`: recurring ones from their start month until `end`, one-off ones only in their own month. */
export const activeIn = (e: Finance, ym: string) => e.k === 'rec' ? ym >= e.date.slice(0, 7) && (!e.end || ym <= e.end) : e.date.slice(0, 7) === ym

export function monthTotals(fin: Finance[], ym: string) {
  const r = { i: 0, o: 0, rec: 0, one: 0, cat: {} as Record<string, number> }
  fin.forEach(e => { if (!activeIn(e, ym)) return; if (e.t === 'in') r.i += e.a; else { r.o += e.a; r[e.k] += e.a; r.cat[e.c] = (r.cat[e.c] ?? 0) + e.a } })
  return r
}

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
