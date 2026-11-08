import { MN } from '../lib/dates'
import { eur } from '../lib/finance'
import { PALETTE } from '../lib/palette'

/** Income and expense colours of the month charts in Finanças and Início. */
export const IN_COLOR = PALETTE.sage, OUT_COLOR = PALETTE.clay
export const monthShort = (ym: string) => MN[+ym.slice(5) - 1]

/** Tooltip of one month's bars; `balance` adds the month's balance line. */
export function MonthTip({ month, balance }: { month: { q: string; i: number; o: number }; balance?: boolean }) {
  return <span className="ctip"><b>{monthShort(month.q)}</b><span><i style={{ background: IN_COLOR }} />Ganhos {eur(month.i)}</span><span><i style={{ background: OUT_COLOR }} />Despesas {eur(month.o)}</span>
    {balance && <span className={month.i - month.o < 0 ? 'neg' : ''}>Saldo {eur(month.i - month.o)}</span>}</span>
}
