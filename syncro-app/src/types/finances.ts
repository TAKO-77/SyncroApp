export type FinanceType = 'in' | 'out'
/** `rec`: every month from `date` until `endMonth`; `one`: only on `date`. */
export type FinanceKind = 'rec' | 'one'

export interface Finance {
  readonly id: string
  readonly type: FinanceType
  readonly kind: FinanceKind
  readonly name: string
  readonly amount: number
  readonly date: string
  /** `YYYY-MM`, or '' for no end. */
  readonly endMonth: string
  /** Expense category; '' for income. */
  readonly categoryId: string
  readonly position: number
}

/** Form values; the amount is the text the user typed. */
export interface FinanceDraft {
  type: FinanceType
  kind: FinanceKind
  name: string
  amount: string
  date: string
  endMonth: string
  categoryId: string
}

export interface MonthTotals {
  income: number
  expenses: number
  recurring: number
  oneOff: number
  byCategory: Record<string, number>
}
