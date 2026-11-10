import { MN } from '../lib/dates'
import { useT } from '../lib/i18n/useT'
import { eur } from '../lib/finance'
import { PALETTE } from '../lib/palette'

/** Income and expense colours of the month charts in Finanças and Início. */
export const IN_COLOR = PALETTE.sage, OUT_COLOR = PALETTE.clay
export const monthShort = (ym: string, months: readonly string[] = MN) => months[+ym.slice(5) - 1]

/** Tooltip of one month's bars; `balance` adds the month's balance line. */
export function MonthTip({ month, balance }: { month: { q: string; i: number; o: number }; balance?: boolean }) {
  const { t, lang, months } = useT()
  return <span className="ctip"><b>{monthShort(month.q, months)}</b><span><i style={{ background: IN_COLOR }} />{t('common.income')} {eur(month.i, lang)}</span><span><i style={{ background: OUT_COLOR }} />{t('common.expenses')} {eur(month.o, lang)}</span>
    {balance && <span className={month.i - month.o < 0 ? 'neg' : ''}>{t('common.balance')} {eur(month.i - month.o, lang)}</span>}</span>
}
