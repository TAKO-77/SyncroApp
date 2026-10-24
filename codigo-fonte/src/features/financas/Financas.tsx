import { PALETTE } from '../../lib/palette'
import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { MN, parse } from '../../lib/dates'
import { Modal, todayIso, uid } from '../../components/common'
import { Donut } from '../../components/Donut'
import type { Finance } from '../../types'

const FC = [{ id: 'alim', name: 'Alimentação', color: PALETTE.gold }, { id: 'transp', name: 'Transportes', color: PALETTE.slate }, { id: 'casa', name: 'Casa', color: PALETTE.gold }, { id: 'saude', name: 'Saúde', color: PALETTE.sage }, { id: 'lazer', name: 'Lazer', color: PALETTE.clay }, { id: 'compras', name: 'Compras', color: PALETTE.sage }, { id: 'educ', name: 'Educação', color: PALETTE.clay }, { id: 'subs', name: 'Subscrições', color: PALETTE.sage }, { id: 'viag', name: 'Viagens', color: PALETTE.slate }, { id: 'outros', name: 'Outros', color: PALETTE.neutral }]
const fcT = (id: string) => FC.find(c => c.id === id) ?? FC[9]
const eur = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const ymAdd = (ym: string, k: number) => { const [a, b] = ym.split('-').map(Number), d = new Date(a, b - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const act = (e: Finance, ym: string) => e.k === 'rec' ? ym >= e.date.slice(0, 7) && (!e.end || ym <= e.end) : e.date.slice(0, 7) === ym
function tot(fin: Finance[], ym: string) {
  const r = { i: 0, o: 0, rec: 0, one: 0, cat: {} as Record<string, number> }
  fin.forEach(e => { if (!act(e, ym)) return; if (e.t === 'in') r.i += e.a; else { r.o += e.a; r[e.k] += e.a; r.cat[e.c] = (r.cat[e.c] ?? 0) + e.a } })
  return r
}
interface F { id?: string; t: 'in' | 'out'; k: 'rec' | 'one'; n: string; a: string; date: string; end: string; c: string }

export function Financas() {
  const { data, update, undo, history } = useStore()
  const [ym, setYm] = useState(todayIso().slice(0, 7))
  const [hide, setHide] = useState(true)
  const [f, setF] = useState<F | null>(null)
  const T = tot(data.fin, ym), bal = T.i - T.o
  const [y, m] = ym.split('-').map(Number)
  const months = Array.from({ length: 6 }, (_, k) => ymAdd(ym, k - 5)).map(q => ({ q, ...tot(data.fin, q) }))
  const mx = Math.max(1, ...months.flatMap(x => [x.i, x.o]))
  const cats = FC.map(c => ({ ...c, v: T.cat[c.id] ?? 0 })).filter(c => c.v > 0).sort((a, b) => b.v - a.v)
  const rows = data.fin.filter(e => act(e, ym))
  const row = (e: Finance) => <div key={e.id} className="fr" onClick={() => setF({ id: e.id, t: e.t, k: e.k, n: e.n, a: String(e.a), date: e.date, end: e.end, c: e.c || 'alim' })}>
    <i className="pd" style={{ ['--c' as string]: e.t === 'in' ? PALETTE.sage : fcT(e.c).color }} /><span className="fn">{e.n}</span>
    <small className="mu">{e.t === 'in' ? 'Ganho' : fcT(e.c).name}{e.k === 'one' ? ` · ${parse(e.date).getDate()} ${MN[parse(e.date).getMonth()]}` : ''}</small>
    <b className={e.t}>{e.t === 'in' ? '+' : '−'}{eur(e.a)}</b></div>
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
    <div className="head2"><h2>Finanças</h2><div className="row">
      <button className="btn" disabled={!history.length} onClick={undo}>↶ Anular</button>
      <button className="btn" onClick={() => setHide(!hide)}>{hide ? 'Mostrar valores' : 'Ocultar valores'}</button>
      <button className="btn pri" onClick={() => open()}>Novo registo</button></div></div>
    <div className="bar"><button className="btn sq" onClick={() => setYm(ymAdd(ym, -1))} aria-label="Mês anterior">‹</button>
      <span className="rg cap">{new Date(y, m - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</span>
      <button className="btn sq" onClick={() => setYm(ymAdd(ym, 1))} aria-label="Mês seguinte">›</button>
      <button className="btn ghost" onClick={() => setYm(todayIso().slice(0, 7))}>Hoje</button></div>
    <div className={'fwrap' + mask}>
      {!data.fin.length ? <div className="tem">Ainda não há registos. Começa por adicionar o teu ordenado (ganho mensal recorrente) e as despesas fixas.</div> : <>
        <div className="fk">
          <div className="fc"><span className="fl">Saldo do mês</span><b className={'fv big ' + (bal < 0 ? 'neg' : 'pos')}>{bal > 0 ? '+' : ''}{eur(bal)}</b><small>{T.i ? (bal >= 0 ? `Taxa de poupança de ${Math.round(bal / T.i * 100)}%` : 'Despesas acima dos ganhos') : 'Sem ganhos registados neste mês'}</small></div>
          <div className="fc"><span className="fl">Ganhos</span><b className="fv">{eur(T.i)}</b></div>
          <div className="fc"><span className="fl">Despesas</span><b className="fv">{eur(T.o)}</b></div></div>
        <div className="fc"><span className="fl">Evolução · últimos 6 meses</span>
          <div className="evo">{months.map(x => <button key={x.q} className="evc" aria-pressed={x.q === ym} onClick={() => setYm(x.q)} title={`Ganhos ${eur(x.i)} · Despesas ${eur(x.o)}`}>
            <span className="bars"><i style={{ height: `${x.i / mx * 100}%`, background: PALETTE.sage }} /><i style={{ height: `${x.o / mx * 100}%`, background: PALETTE.clay }} /></span><small>{MN[+x.q.slice(5) - 1]}</small></button>)}</div></div>
        <div className="fg2">
          <div className="fc"><span className="fl">Despesas por categoria</span>{cats.length ? <Donut rows={cats.map(c => ({ id: c.id, name: c.name, color: c.color, v: c.v }))} P={T.o} fv={eur} center={eur(T.o)} label="total" /> : <p className="mu">Sem despesas neste mês.</p>}</div>
          <div className="fc"><span className="fl">Para onde vai o dinheiro</span>
            <div className="st"><span>Fixas (recorrentes)</span><b>{eur(T.rec)}</b></div><div className="st"><span>Esporádicas</span><b>{eur(T.one)}</b></div>
            <div className="st"><span>{bal >= 0 ? 'Por gastar ou poupar' : 'Excedido em'}</span><b className={bal < 0 ? 'neg' : ''}>{eur(Math.abs(bal))}</b></div></div></div>
        <div className="fc"><span className="fl">Recorrentes</span>{sorted('rec').length ? sorted('rec').map(row) : <p className="mu">Nenhum registo recorrente neste mês.</p>}
          <span className="fl top">Esporádicos</span>{sorted('one').length ? sorted('one').map(row) : <p className="mu">Nenhum registo esporádico neste mês.</p>}</div></>}
    </div>
    {f && <Modal title={f.id ? 'Editar registo' : 'Novo registo'} onClose={() => setF(null)}>
      <form className="fgrid" onSubmit={save}>
        <div className="w seg">{(['in', 'out'] as const).map(v => <button key={v} type="button" aria-pressed={f.t === v} onClick={() => setF({ ...f, t: v })}>{v === 'in' ? 'Ganho' : 'Despesa'}</button>)}</div>
        <div className="w seg">{(['rec', 'one'] as const).map(v => <button key={v} type="button" aria-pressed={f.k === v} onClick={() => setF({ ...f, k: v })}>{v === 'rec' ? 'Mensal recorrente' : 'Esporádico'}</button>)}</div>
        <label className="w">Descrição<input value={f.n} required maxLength={60} autoFocus onChange={e => setF({ ...f, n: e.target.value })} /></label>
        <label>Valor (€)<input type="number" min="0.01" step="0.01" required inputMode="decimal" value={f.a} onChange={e => setF({ ...f, a: e.target.value })} /></label>
        <label>{f.k === 'rec' ? 'Começa em' : 'Data'}<input type="date" required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        {f.k === 'rec' && <label className="w">Termina em (opcional)<input type="month" value={f.end} min={f.date.slice(0, 7)} onChange={e => setF({ ...f, end: e.target.value })} /></label>}
        {f.t === 'out' && <div className="w cats">{FC.map(c => <label key={c.id} className="cp"><input type="radio" name="fc" checked={f.c === c.id} onChange={() => setF({ ...f, c: c.id })} /><span style={{ ['--c' as string]: c.color }}>{c.name}</span></label>)}</div>}
        <div className="acts w">{f.id && <button type="button" className="btn dng" onClick={() => { const id = f.id; update(d => { d.fin = d.fin.filter(x => x.id !== id) }); setF(null) }}>Apagar</button>}<span className="sp" /><button type="button" className="btn" onClick={() => setF(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
