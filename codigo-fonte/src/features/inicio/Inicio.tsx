import { useState } from 'react'
import { ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { FIN_CATS, PALETTE } from '../../lib/palette'
import { MN, fmt, iso, mins, parse } from '../../lib/dates'
import { eventsOn } from '../../lib/recurrence'
import { eur, monthTotals, ymAdd } from '../../lib/finance'
import { daysLeft, upcomingSpecialDays } from '../../lib/specialDays'
import { PC, PN, dueLabel, tasksDueBy, urgentTasks } from '../../lib/tasks'
import { markDone } from '../../lib/cleanup'
import { todayIso, useNow } from '../../components/common'
import type { PEvent } from '../../types'

export type HomeTarget = 'agenda' | 'calendario' | 'tarefas' | 'financas'
const LIMIT = 5
const inDays = (n: number) => n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `em ${n} dias`
const count = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
type Range = 'hoje' | 'semana' | 'todas'
const RANGES: { id: Range; label: string; empty: string }[] = [
  { id: 'hoje', label: 'Hoje', empty: 'Nada para hoje.' },
  { id: 'semana', label: 'Semana', empty: 'Nada com data nos próximos 7 dias.' },
  { id: 'todas', label: 'Todas', empty: 'Tudo em dia. Não há tarefas pendentes.' },
]

/** Line under the greeting with how many events and tasks today holds; overdue tasks count as today. */
export function TodaySummary() {
  const { data } = useStore()
  const today = todayIso(), ev = eventsOn(data, today).length, tk = tasksDueBy(data.tasks, today).length
  const parts = [ev && count(ev, 'evento', 'eventos'), tk && count(tk, 'tarefa', 'tarefas')].filter(Boolean)
  return <p className="hello-sub">{parts.length ? `Tens ${parts.join(' e ')} para hoje.` : 'Não tens eventos nem tarefas para hoje.'}</p>
}

/** Home overview: today's agenda, the most urgent tasks, this month's money and the next special days. */
export function Inicio({ go }: { go: (target: HomeTarget) => void }) {
  const { data, update } = useStore()
  const [hide, setHide] = useState(true)
  const [range, setRange] = useState<Range>('hoje')
  const now = useNow(30000), today = todayIso(), nowM = now.getHours() * 60 + now.getMinutes()

  const color = (e: PEvent) => data.cats.find(c => c.id === e.cat)?.color ?? e.color ?? PALETTE.neutral
  const catName = (e: PEvent) => data.cats.find(c => c.id === e.cat)?.name
  const events = eventsOn(data, today)
  const planned = events.reduce((s, e) => s + Math.max(0, mins(e.end) - mins(e.start)), 0)
  const next = events.find(e => mins(e.end) > nowM)

  const pending = urgentTasks(data.tasks)
  const late = pending.filter(t => t.due && t.due < today).length
  const dueToday = pending.filter(t => t.due === today).length
  const weekEnd = parse(today); weekEnd.setDate(weekEnd.getDate() + 6)
  const shown = range === 'todas' ? pending : tasksDueBy(pending, range === 'hoje' ? today : iso(weekEnd))

  const ym = today.slice(0, 7), T = monthTotals(data.fin, ym), bal = T.i - T.o
  const months = Array.from({ length: 6 }, (_, k) => ymAdd(ym, k - 5)).map(q => ({ q, ...monthTotals(data.fin, q) }))
  const mx = Math.max(1, ...months.flatMap(x => [x.i, x.o]))
  const spend = FIN_CATS.map(c => ({ ...c, v: T.cat[c.id] ?? 0 })).filter(c => c.v > 0).sort((a, b) => b.v - a.v).slice(0, 4)
  const money = hide ? ' blurred' : ''

  const upcoming = upcomingSpecialDays(data.days, today)
  const dayType = (ty: string) => data.dayCats.find(t => t.id === ty)
  const first = upcoming[0]

  const complete = (id: string) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) markDone(t, true) })
  const more = (target: HomeTarget, label: string) => <button type="button" className="link-btn" onClick={() => go(target)}>{label}<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>

  return <section className="page home">
    <div className="kpis">
      <button type="button" className="card kpi" onClick={() => go('agenda')}>
        <span className="card-h"><span className="kpi-l">Agenda de hoje</span>{planned > 0 && <span className="trend acc">{fmt(planned)}</span>}</span>
        <b className="kpi-v num">{events.length} <small>{events.length === 1 ? 'evento' : 'eventos'}</small></b>
        <span className="kpi-f">{next ? `${mins(next.start) <= nowM ? 'Agora' : `Às ${next.start}`} · ${next.title}` : events.length ? 'Sem mais eventos hoje' : 'Dia livre'}</span>
      </button>
      <button type="button" className="card kpi" onClick={() => go('tarefas')}>
        <span className="card-h"><span className="kpi-l">Tarefas pendentes</span>{late ? <span className="trend down">{late} {late === 1 ? 'atrasada' : 'atrasadas'}</span> : pending.length ? <span className="trend up">Em dia</span> : null}</span>
        <b className="kpi-v num">{pending.length}</b>
        <span className="kpi-f">{dueToday ? `${dueToday} para hoje` : 'Nenhuma para hoje'}</span>
      </button>
      <button type="button" className="card kpi" onClick={() => go('financas')}>
        <span className="card-h"><span className="kpi-l cap">Saldo de {new Date(+ym.slice(0, 4), +ym.slice(5) - 1, 1).toLocaleDateString('pt-PT', { month: 'long' })}</span>{T.i > 0 && <span className={'trend ' + (bal >= 0 ? 'up' : 'down') + money}>{bal >= 0 ? `Poupas ${Math.round(bal / T.i * 100)}%` : 'Acima dos ganhos'}</span>}</span>
        <b className={'kpi-v num' + money}>{bal > 0 ? '+' : ''}{eur(bal)}</b>
        <span className={'kpi-f' + money}>Ganhos {eur(T.i)} · Despesas {eur(T.o)}</span>
      </button>
      <button type="button" className="card kpi" onClick={() => go('calendario')}>
        <span className="card-h"><span className="kpi-l">Próximos 31 dias</span>{first && <span className="trend acc">{inDays(daysLeft(first.date, today))}</span>}</span>
        <b className="kpi-v num">{upcoming.length} <small>{upcoming.length === 1 ? 'dia especial' : 'dias especiais'}</small></b>
        <span className="kpi-f">{first ? `${dayType(first.item.ty)?.icon ?? '📌'} ${first.item.n}` : 'Nada marcado'}</span>
      </button>
    </div>

    <div className="home-grid">
      <article className="card">
        <div className="card-h"><h3>Agenda de hoje</h3>{more('agenda', 'Abrir agenda')}</div>
        {events.length ? <div className="hl">{events.slice(0, 6).map(e => {
          const live = mins(e.start) <= nowM && nowM < mins(e.end), past = mins(e.end) <= nowM
          return <div key={e.id} className={'hl-row ev-row' + (live ? ' is-now' : '') + (past ? ' is-past' : '')} style={{ ['--c' as string]: color(e) }}>
            <time className="num">{e.start}</time>
            <span className="hl-main"><b>{e.title}</b><small>{live ? `Agora · até às ${e.end}` : `${e.start} – ${e.end}`}</small></span>
            {catName(e) && <span className="tag">{catName(e)}</span>}
          </div>
        })}{events.length > 6 && <p className="mu hl-more">Mais {events.length - 6} na agenda.</p>}</div>
          : <p className="mu home-empty">Sem eventos hoje. Abre a agenda para planear o dia.</p>}
      </article>

      <article className="card">
        <div className="card-h"><h3>Tarefas</h3>
          <span className="card-acts"><span className="seg sm" role="group" aria-label="Período das tarefas">{RANGES.map(x => <button key={x.id} type="button" aria-pressed={range === x.id} onClick={() => setRange(x.id)}>{x.label}</button>)}</span>{more('tarefas', 'Ver tarefas')}</span></div>
        {shown.length ? <div className="hl">{shown.slice(0, LIMIT).map(t => {
          const [lbl, isLate] = dueLabel(t.due, today)
          return <label key={t.id} className="hl-row task-row">
            <input className="rc" type="checkbox" checked={false} aria-label={`Concluir ${t.t}`} onChange={() => complete(t.id)} />
            <span className="hl-main"><b>{t.t}</b>{lbl && <small className={isLate ? 'late' : ''}>{lbl}</small>}</span>
            <span className="prio" title={`Prioridade ${PN[t.p].toLowerCase()}`} style={{ ['--c' as string]: PC[t.p] }} />
          </label>
        })}{shown.length > LIMIT && <p className="mu hl-more">Mais {shown.length - LIMIT} por fazer.</p>}</div>
          : <p className="mu home-empty">{pending.length ? RANGES.find(x => x.id === range)?.empty : RANGES[2].empty}</p>}
      </article>

      <article className="card">
        <div className="card-h"><h3>Finanças · últimos 6 meses</h3>
          <span className="card-acts">{data.fin.length > 0 && <button type="button" className="btn ghost sm" aria-pressed={!hide} onClick={() => setHide(!hide)}>{hide ? <Eye size={15} strokeWidth={1.5} aria-hidden="true" /> : <EyeOff size={15} strokeWidth={1.5} aria-hidden="true" />}{hide ? 'Mostrar valores' : 'Ocultar valores'}</button>}{more('financas', 'Ver finanças')}</span></div>
        {data.fin.length ? <div className={'home-fin' + money}>
          <div className="mini-bars" role="img" aria-label="Ganhos e despesas dos últimos 6 meses">{months.map(x => <span key={x.q} className={x.q === ym ? 'on' : ''} title={`Ganhos ${eur(x.i)} · Despesas ${eur(x.o)}`}>
            <span className="mb"><i style={{ height: `${x.i / mx * 100}%`, background: PALETTE.sage }} /><i style={{ height: `${x.o / mx * 100}%`, background: PALETTE.clay }} /></span><small>{MN[+x.q.slice(5) - 1]}</small></span>)}</div>
          <div className="spend">{spend.length ? spend.map(c => <div key={c.id} className="spend-row" style={{ ['--c' as string]: c.color }}>
            <span className="spend-h"><span>{c.name}</span><b className="num">{eur(c.v)}</b></span><span className="spend-bar"><i style={{ width: `${c.v / spend[0].v * 100}%` }} /></span></div>)
            : <p className="mu">Sem despesas este mês.</p>}</div>
        </div> : <p className="mu home-empty">Ainda não há registos. Começa pelo teu ordenado e pelas despesas fixas.</p>}
      </article>

      <article className="card">
        <div className="card-h"><h3>Próximos dias especiais</h3>{more('calendario', 'Abrir calendário')}</div>
        {upcoming.length ? <div className="hl">{upcoming.slice(0, LIMIT).map(({ item, date }) => {
          const type = dayType(item.ty), d = parse(date)
          return <div key={item.id} className="hl-row" style={{ ['--c' as string]: type?.color ?? PALETTE.neutral }}>
            <span className="hl-icon" aria-hidden="true">{type?.icon ?? '📌'}</span>
            <span className="hl-main"><b>{item.n}</b><small>{d.getDate()} {MN[d.getMonth()]}{item.h ? ` · ${item.h}` : ''}</small></span>
            <span className="tag">{inDays(daysLeft(date, today))}</span>
          </div>
        })}</div> : <p className="mu home-empty">Sem dias especiais nos próximos 31 dias.</p>}
      </article>
    </div>
  </section>
}
