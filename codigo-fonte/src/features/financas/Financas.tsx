import { FIN_CATS, finCat } from '../../lib/palette'
import { eur, monthTotals, activeIn, overallBalance, recentMonths, spendByCategory } from '../../lib/finance'
import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { useT } from '../../lib/i18n/useT'
import type { MessageKey } from '../../lib/i18n/translate'
import { todayIso, ymAdd } from '../../lib/dates'
import { Modal, uid, useArrowKeys } from '../../components/common'
import { IN_COLOR, MonthTip, OUT_COLOR, monthShort } from '../../components/MonthTip'
import { Donut } from '../../components/Donut'
import type { Finance } from '../../types'
import { DatePicker, MonthPicker } from '../../components/DatePicker'
import { CountUp } from '../../components/CountUp'
import { Sparkline } from '../../components/Sparkline'
import { EmptyState } from '../../components/EmptyState'
import { Wallet } from 'lucide-react'
import { Glider } from '../../components/Glider'

interface F { id?: string; t: 'in' | 'out'; k: 'rec' | 'one'; n: string; a: string; date: string; end: string; c: string }

export function Financas() {
  const { data, update, undo, history } = useStore()
  const { t, lang, months: monthNames, shortDate } = useT()
  const money = (n: number) => eur(n, lang)
  const catName = (id: string) => t(`financas.cat.${finCat(id).id}` as MessageKey)
  const [ym, setYm] = useState(todayIso().slice(0, 7))
  const [hide, setHide] = useState(true)
  const [f, setF] = useState<F | null>(null)
  useArrowKeys(step => setYm(ymAdd(ym, step)))
  const T = monthTotals(data.fin, ym), bal = T.i - T.o
  const overall = overallBalance(data.fin, todayIso().slice(0, 7))
  const { months, max: mx } = recentMonths(data.fin, ym)
  const cats = spendByCategory(T)
  const rows = data.fin.filter(e => activeIn(e, ym))
  const row = (e: Finance) => <div key={e.id} className="fr" onClick={() => setF({ id: e.id, t: e.t, k: e.k, n: e.n, a: String(e.a), date: e.date, end: e.end, c: e.c || 'alim' })}>
    <i className="pd" style={{ ['--c' as string]: e.t === 'in' ? IN_COLOR : finCat(e.c).color }} /><span className="fn">{e.n}</span>
    <small className="mu">{e.t === 'in' ? t('financas.gain') : catName(e.c)}{e.k === 'one' ? ` · ${shortDate(e.date)}` : ''}</small>
    <b className={e.t}>{e.t === 'in' ? '+' : '−'}{money(e.a)}</b></div>
  const sorted = (k: 'rec' | 'one') => rows.filter(e => e.k === k).sort((a, b) => (a.t === b.t ? 0 : a.t === 'in' ? -1 : 1) || b.a - a.a)
  const open = (e?: F) => setF(e ?? { t: 'out', k: 'one', n: '', a: '', date: ym === todayIso().slice(0, 7) ? todayIso() : ym + '-01', end: '', c: 'alim' })
  const save = (ev: FormEvent) => {
    ev.preventDefault(); if (!f) return
    const a = Math.round(parseFloat(f.a) * 100) / 100; if (!(a > 0) || !f.n.trim()) return
    const o = { t: f.t, k: f.k, n: f.n.trim(), a, date: f.date, end: f.k === 'rec' ? f.end : '', c: f.t === 'out' ? f.c : '' }
    update(d => { if (f.id) { const b = d.fin.find(x => x.id === f.id); if (b) Object.assign(b, o) } else d.fin.push({ id: uid('f'), ...o }) })
    if (o.k === 'one' || ym < o.date.slice(0, 7)) setYm(o.date.slice(0, 7)); setF(null)
  }
  const mask = hide ? ' blur' : ''

  return <section className="page">
    <div className="head2"><h2>{t('financas.title')}</h2><div className="row">
      <button className="btn" disabled={!history.length} onClick={undo}>{t('financas.undo')}</button>
      <button className="btn" onClick={() => setHide(!hide)}>{hide ? t('financas.showValues') : t('financas.hideValues')}</button>
      <button className="btn pri" onClick={() => open()}>{t('financas.newRecord')}</button></div></div>
    <div className="bar"><button className="btn sq" onClick={() => setYm(ymAdd(ym, -1))} aria-label={t('common.prevMonth')}>‹</button>
      <MonthPicker required aria-label={t('financas.pickMonth')} value={ym} onChange={setYm} />
      <button className="btn sq" onClick={() => setYm(ymAdd(ym, 1))} aria-label={t('common.nextMonth')}>›</button>
      <button className="btn ghost" onClick={() => setYm(todayIso().slice(0, 7))}>{t('common.today')}</button></div>
    <div className={'fwrap' + mask}>
      {!data.fin.length ? <div className="fc"><EmptyState icon={<Wallet size={22} strokeWidth={1.5} />} title={t('financas.emptyTitle')} text={t('financas.emptyText')} action={<button className="btn pri" onClick={() => open()}>{t('financas.newRecord')}</button>} /></div> : <>
        <div className="fk">
          <div className="fc"><span className="fl">{t('financas.monthBalance')}</span><span className="kpi-row"><b className={'fv big ' + (bal < 0 ? 'neg' : 'pos')}>{bal > 0 ? '+' : ''}<CountUp value={bal} format={money} /></b><Sparkline values={months.map(x => x.i - x.o)} color={bal >= 0 ? 'var(--success)' : 'var(--error)'} label={t('financas.last6Balance')} /></span><small>{T.i ? (bal >= 0 ? t('financas.savingsRate', { n: Math.round(bal / T.i * 100) }) : t('financas.overspent')) : t('financas.noIncome')}</small></div>
          <div className="fc"><span className="fl">{t('financas.overallBalance')}</span><b className={'fv big ' + (overall < 0 ? 'neg' : 'pos')}>{overall > 0 ? '+' : ''}<CountUp value={overall} format={money} /></b><small>{t('financas.overallHint')}</small></div>
          <div className="fc"><span className="fl">{t('common.income')}</span><b className="fv"><CountUp value={T.i} format={money} /></b></div>
          <div className="fc"><span className="fl">{t('common.expenses')}</span><b className="fv"><CountUp value={T.o} format={money} /></b></div></div>
        <div className="fc"><span className="fl">{t('financas.evolution')}</span>
          <div className="evo">{months.map((x, k) => <button key={x.q} className="evc" aria-pressed={x.q === ym} onClick={() => setYm(x.q)} aria-label={t('financas.monthAria', { month: monthShort(x.q, monthNames), income: money(x.i), expenses: money(x.o) })} style={{ ['--i' as string]: k }}>
            <MonthTip month={x} balance />
            <span className="bars"><i style={{ height: `${x.i / mx * 100}%`, background: IN_COLOR }} /><i style={{ height: `${x.o / mx * 100}%`, background: OUT_COLOR }} /></span><small>{monthShort(x.q, monthNames)}</small></button>)}</div></div>
        <div className="fg2">
          <div className="fc"><span className="fl">{t('financas.byCategory')}</span>{cats.length ? <Donut rows={cats.map(c => ({ id: c.id, name: catName(c.id), color: c.color, v: c.v }))} P={T.o} fv={money} center={money(T.o)} label={t('financas.total')} /> : <p className="mu">{t('financas.noExpenses')}</p>}</div>
          <div className="fc"><span className="fl">{t('financas.whereMoney')}</span>
            <div className="st"><span>{t('financas.fixed')}</span><b>{money(T.rec)}</b></div><div className="st"><span>{t('financas.sporadic')}</span><b>{money(T.one)}</b></div>
            <div className="st"><span>{bal >= 0 ? t('financas.left') : t('financas.exceeded')}</span><b className={bal < 0 ? 'neg' : ''}>{money(Math.abs(bal))}</b></div></div></div>
        <div className="fc"><span className="fl">{t('financas.recurring')}</span>{sorted('rec').length ? sorted('rec').map(row) : <p className="mu">{t('financas.noRecurring')}</p>}
          <span className="fl top">{t('financas.oneOffs')}</span>{sorted('one').length ? sorted('one').map(row) : <p className="mu">{t('financas.noOneOffs')}</p>}</div></>}
    </div>
    {f && <Modal title={f.id ? t('financas.editRecord') : t('financas.newRecord')} onClose={() => setF(null)}>
      <form className="fgrid" onSubmit={save}>
        <div className="w seg">{(['in', 'out'] as const).map(v => <button key={v} type="button" aria-pressed={f.t === v} onClick={() => setF({ ...f, t: v })}>{v === 'in' ? t('financas.gain') : t('financas.expense')}</button>)}<Glider /></div>
        <div className="w seg">{(['rec', 'one'] as const).map(v => <button key={v} type="button" aria-pressed={f.k === v} onClick={() => setF({ ...f, k: v })}>{v === 'rec' ? t('financas.monthlyRecurring') : t('financas.oneOff')}</button>)}<Glider /></div>
        <label className="w">{t('financas.description')}<input value={f.n} required maxLength={60} autoFocus onChange={e => setF({ ...f, n: e.target.value })} /></label>
        <label>{t('financas.amount')}<input type="number" min="0.01" step="0.01" required inputMode="decimal" value={f.a} onChange={e => setF({ ...f, a: e.target.value })} /></label>
        <label>{f.k === 'rec' ? t('financas.startsOn') : t('financas.date')}<DatePicker required value={f.date} onChange={date => setF({ ...f, date })} /></label>
        {f.k === 'rec' && <label className="w">{t('financas.endsOn')}<MonthPicker value={f.end} min={f.date.slice(0, 7)} onChange={end => setF({ ...f, end })} /></label>}
        {f.t === 'out' && <div className="w cats">{FIN_CATS.map(c => <label key={c.id} className="cp"><input type="radio" name="fc" checked={f.c === c.id} onChange={() => setF({ ...f, c: c.id })} /><span style={{ ['--c' as string]: c.color }}>{t(`financas.cat.${c.id}` as MessageKey)}</span></label>)}</div>}
        <div className="acts w">{f.id && <button type="button" className="btn dng" onClick={() => { const id = f.id; update(d => { d.fin = d.fin.filter(x => x.id !== id) }); setF(null) }}>{t('financas.delete')}</button>}<span className="sp" /><button type="button" className="btn" onClick={() => setF(null)}>{t('common.cancel')}</button><button className="btn pri" type="submit">{t('financas.save')}</button></div>
      </form></Modal>}
  </section>
}
