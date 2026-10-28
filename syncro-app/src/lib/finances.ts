import type { Finance, FinanceDraft, MonthTotals } from '../types/finances'
import { addMonths, isIsoDate, isMonth } from './dates.ts'
import { str, type Validation } from './records.ts'
import { tagColors } from './theme.ts'

// Income and expenses: mapping to `public.finances` and monthly totals. Pure; same rules as the web app.

export const FINANCE_NAME_MAX = 60
const AMOUNT_MAX = 9_999_999_999.99

// Same ids, names and colours as the web app.
export const FINANCE_CATEGORIES: readonly { id: string; name: string; color: string }[] = [
  { id: 'alim', name: 'Alimentação', color: tagColors.gold },
  { id: 'transp', name: 'Transportes', color: tagColors.slate },
  { id: 'casa', name: 'Casa', color: tagColors.gold },
  { id: 'saude', name: 'Saúde', color: tagColors.sage },
  { id: 'lazer', name: 'Lazer', color: tagColors.clay },
  { id: 'compras', name: 'Compras', color: tagColors.sage },
  { id: 'educ', name: 'Educação', color: tagColors.clay },
  { id: 'subs', name: 'Subscrições', color: tagColors.sage },
  { id: 'viag', name: 'Viagens', color: tagColors.slate },
  { id: 'outros', name: 'Outros', color: tagColors.neutral },
]
export const financeCategory = (id: string) => FINANCE_CATEGORIES.find(c => c.id === id) ?? FINANCE_CATEGORIES[FINANCE_CATEGORIES.length - 1]

export function financeFromRow(row: Record<string, unknown>): Finance {
  return {
    id: str(row.id),
    type: row.type === 'in' ? 'in' : 'out',
    kind: row.kind === 'rec' ? 'rec' : 'one',
    name: str(row.name),
    amount: Number(row.amount ?? 0),
    date: str(row.date),
    endMonth: str(row.end_month),
    categoryId: str(row.category_id),
    position: Number(row.position ?? 0),
  }
}

export const financeToRow = (f: Finance) => ({
  id: f.id, type: f.type, kind: f.kind, name: f.name, amount: f.amount, date: f.date, end_month: f.endMonth, category_id: f.categoryId, position: f.position,
})

/** Whether `f` counts in month `ym` (`YYYY-MM`). */
export const isActiveIn = (f: Finance, ym: string) =>
  f.kind === 'rec' ? ym >= f.date.slice(0, 7) && (!f.endMonth || ym <= f.endMonth) : f.date.slice(0, 7) === ym

export function monthTotals(list: readonly Finance[], ym: string): MonthTotals {
  const t: MonthTotals = { income: 0, expenses: 0, recurring: 0, oneOff: 0, byCategory: {} }
  for (const f of list) {
    if (!isActiveIn(f, ym)) continue
    if (f.type === 'in') { t.income += f.amount; continue }
    t.expenses += f.amount
    if (f.kind === 'rec') t.recurring += f.amount; else t.oneOff += f.amount
    t.byCategory[f.categoryId] = (t.byCategory[f.categoryId] ?? 0) + f.amount
  }
  return t
}

/** Totals for the `count` months ending at `ym`, oldest first. */
export const lastMonths = (list: readonly Finance[], ym: string, count = 6) =>
  Array.from({ length: count }, (_, k) => addMonths(ym, k - count + 1)).map(month => ({ month, ...monthTotals(list, month) }))

/** Records active in `ym` of one kind: income first, then by amount. */
export const recordsOf = (list: readonly Finance[], ym: string, kind: Finance['kind']) =>
  list.filter(f => isActiveIn(f, ym) && f.kind === kind).sort((a, b) => (a.type === b.type ? 0 : a.type === 'in' ? -1 : 1) || b.amount - a.amount)

/** `1 234,5 €` style, without cents when they are zero. */
export function formatEuro(n: number): string {
  const sign = n < 0 ? '-' : ''
  const [int, dec] = Math.abs(Math.round(n * 100) / 100).toFixed(2).split('.')
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : int
  const cents = dec === '00' ? '' : `,${dec.replace(/0$/, '')}`
  return `${sign}${grouped}${cents} €`
}

/** Accepts `12`, `12.5`, `12,50`; returns NaN otherwise. */
export function parseAmount(text: string): number {
  const v = text.trim().replace(/\s/g, '').replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(parseFloat(v) * 100) / 100 : NaN
}

export function validateFinance(d: FinanceDraft): Validation<Omit<Finance, 'id' | 'position'>> {
  const name = d.name.trim()
  if (!name) return { ok: false, error: 'Indica a descrição.' }
  if (name.length > FINANCE_NAME_MAX) return { ok: false, error: `A descrição pode ter até ${FINANCE_NAME_MAX} caracteres.` }
  const amount = parseAmount(d.amount)
  if (!(amount > 0) || amount > AMOUNT_MAX) return { ok: false, error: 'Indica um valor maior que zero (ex.: 12,50).' }
  if (!isIsoDate(d.date)) return { ok: false, error: 'Escolhe a data.' }
  const endMonth = d.kind === 'rec' ? d.endMonth : ''
  if (endMonth && (!isMonth(endMonth) || endMonth < d.date.slice(0, 7))) return { ok: false, error: 'O mês de fim não pode ser antes do início.' }
  const categoryId = d.type === 'out' ? financeCategory(d.categoryId).id : ''
  return { ok: true, value: { type: d.type, kind: d.kind, name, amount, date: d.date, endMonth, categoryId } }
}
