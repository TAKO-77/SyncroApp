import { useState } from 'react'
import { ArrowUpRight, CalendarHeart, CalendarPlus, CheckCheck, Eye, EyeOff, Wallet } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { PALETTE } from '../../lib/palette'
import { addDays, fmt, hm, mins, minuteOfDay, todayIso } from '../../lib/dates'
import { useT } from '../../lib/i18n/useT'
import type { MessageKey } from '../../lib/i18n/translate'
import { eventColor, eventMinutes, eventsOn } from '../../lib/recurrence'
import { MonthTip, IN_COLOR, OUT_COLOR, monthShort } from '../../components/MonthTip'
import { DayIcon } from '../../components/DayIcon'
import { eur, monthTotals, recentMonths, spendByCategory } from '../../lib/finance'
import { daysLeft, upcomingSpecialDays, specialDayTime } from '../../lib/specialDays'
import { PC, PRIORITIES, dueLabel, priorityLabel, markDone, tasksDueBy, urgentTasks } from '../../lib/tasks'
import { isOverdue } from '../../lib/taskDue'
import { useNow } from '../../components/common'
import { CountUp } from '../../components/CountUp'
import { Sparkline } from '../../components/Sparkline'
import { EmptyState } from '../../components/EmptyState'
import type { PEvent } from '../../types'
import { Glider } from '../../components/Glider'

export type HomeTarget = 'agenda' | 'calendario' | 'tarefas' | 'financas'
const LIMIT = 5
/** Position of a time of day on the Agenda KPI strip, which spans 06:00–24:00. */
const dayPos = (m: number) => Math.min(100, Math.max(0, (m - 360) / 1080 * 100))
type Range = 'hoje' | 'semana' | 'todas'
const RANGES: { id: Range; label: MessageKey; empty: MessageKey }[] = [
  { id: 'hoje', label: 'inicio.today', empty: 'inicio.empty.today' },
  { id: 'semana', label: 'inicio.range.week', empty: 'inicio.empty.week' },
  { id: 'todas', label: 'inicio.range.all', empty: 'inicio.empty.all' },
]

/** Line under the greeting with how many events and tasks today holds; overdue tasks count as today. */
export function TodaySummary() {
  const { data } = useStore()
  const { t, tn } = useT()
  const today = todayIso(), ev = eventsOn(data, today).length, tk = tasksDueBy(data.tasks, today).length
  const parts = [ev && tn('inicio.events', ev), tk && tn('inicio.tasks', tk)].filter(Boolean) as string[]
  return <p className="hello-sub">{parts.length === 2 ? t('inicio.summary.two', { a: parts[0], b: parts[1] }) : parts.length ? t('inicio.summary.one', { a: parts[0] }) : t('inicio.summary.none')}</p>
}

/** Home overview: today's agenda, the most urgent tasks, this month's money and the next special days. */
export function Inicio({ go }: { go: (target: HomeTarget) => void }) {
  const { data, update } = useStore()
  const { t, tn, lang, months: monthNames, monthsLong, shortDate } = useT()
  const money2 = (n: number) => eur(n, lang)
  const inDays = (n: number) => n === 0 ? t('inicio.today') : n === 1 ? t('inicio.tomorrow') : t('inicio.inDays', { n })
  const [hide, setHide] = useState(true)
  const [range, setRange] = useState<Range>('hoje')
  const now = useNow(30000), today = todayIso(), nowM = minuteOfDay(now)

  const color = (e: PEvent) => eventColor(data.cats, e)
  const catName = (e: PEvent) => data.cats.find(c => c.id === e.cat)?.name
  const events = eventsOn(data, today)
  const planned = events.reduce((s, e) => s + eventMinutes(e), 0)
  const next = events.find(e => mins(e.end) > nowM)

  const pending = urgentTasks(data.tasks)
  const nowTime = hm(nowM)
  const late = pending.filter(t => isOverdue(t, today, nowTime)).length
  const dueToday = pending.filter(t => t.due === today && !isOverdue(t, today, nowTime)).length
  const shown = range === 'todas' ? pending : tasksDueBy(pending, range === 'hoje' ? today : addDays(today, 6))

  const ym = today.slice(0, 7), T = monthTotals(data.fin, ym), bal = T.i - T.o
  const { months, max: mx } = recentMonths(data.fin, ym)
  const spend = spendByCategory(T).slice(0, 4)
  const money = hide ? ' blurred' : ''

  const upcoming = upcomingSpecialDays(data.days, today)
  const dayType = (ty: string) => data.dayCats.find(t => t.id === ty)
  const first = upcoming[0]
  const marked = new Map(upcoming.map(x => [daysLeft(x.date, today), dayType(x.item.ty)?.color ?? PALETTE.neutral]))

  const complete = (id: string) => update(d => { const t = d.tasks.find(x => x.id === id); if (t) markDone(t, true) })
  const more = (target: HomeTarget, label: string) => <button type="button" className="link-btn" onClick={() => go(target)}>{label}<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>

  return <section className="page home">
    <div className="kpis">
      <button type="button" className="card kpi" onClick={() => go('agenda')}>
        <span className="card-h"><span className="kpi-l">{t('inicio.agendaToday')}</span>{planned > 0 && <span className="trend acc">{fmt(planned)}</span>}</span>
        <b className="kpi-v num"><CountUp value={events.length} /> <small>{tn('inicio.eventWord', events.length)}</small></b>
        <span className="kpi-strip day-strip" aria-hidden="true">{events.map(e => <i key={`${e.id}:${e.day}`} style={{ left: `${dayPos(mins(e.start))}%`, width: `${Math.max(1.2, dayPos(mins(e.end)) - dayPos(mins(e.start)))}%`, ['--c' as string]: color(e) }} />)}<b style={{ left: `${dayPos(nowM)}%` }} /></span>
        <span className="kpi-f">{next ? `${mins(next.start) <= nowM ? t('inicio.now') : t('inicio.atTime', { time: next.start })} · ${next.title}` : events.length ? t('inicio.noMoreEvents') : t('inicio.freeDay')}</span>
      </button>
      <button type="button" className="card kpi" onClick={() => go('tarefas')}>
        <span className="card-h"><span className="kpi-l">{t('inicio.pendingTasks')}</span>{late ? <span className="trend down">{tn('inicio.late', late)}</span> : pending.length ? <span className="trend up">{t('inicio.onTrack')}</span> : null}</span>
        <b className="kpi-v num"><CountUp value={pending.length} /></b>
        <span className="kpi-strip prio-strip" aria-hidden="true">{PRIORITIES.map(p => { const k = pending.filter(t => t.p === p).length; return k ? <i key={p} style={{ flexGrow: k, ['--c' as string]: PC[p] }} /> : null })}</span>
        <span className="kpi-f">{dueToday ? t('inicio.dueToday', { n: dueToday }) : t('inicio.noneToday')}</span>
      </button>
      <button type="button" className="card kpi" aria-label={t(hide && data.fin.length ? 'inicio.showValues' : 'inicio.openFinance')} onClick={() => { if (hide && data.fin.length) setHide(false); else go('financas') }}>
        <span className="card-h"><span className="kpi-l cap">{t('inicio.balanceOf', { month: monthsLong[+ym.slice(5) - 1] })}</span>{T.i > 0 && <span className={'trend ' + (bal >= 0 ? 'up' : 'down') + money}>{bal >= 0 ? t('inicio.saving', { pct: Math.round(bal / T.i * 100) }) : t('inicio.overspent')}</span>}</span>
        <span className="kpi-row"><b className={'kpi-v num' + money}>{bal > 0 ? '+' : ''}<CountUp value={bal} format={money2} /></b>
          {data.fin.length > 0 && <span className={money.trim()}><Sparkline values={months.map(x => x.i - x.o)} color={bal >= 0 ? 'var(--success)' : 'var(--error)'} label={t('inicio.balanceSpark')} /></span>}</span>
        <span className={'kpi-f' + money}>{t('inicio.incomeExpense', { income: money2(T.i), expense: money2(T.o) })}</span>
      </button>
      <button type="button" className="card kpi" onClick={() => go('calendario')}>
        <span className="card-h"><span className="kpi-l">{t('inicio.next31')}</span>{first && <span className="trend acc">{inDays(daysLeft(first.date, today))}</span>}</span>
        <b className="kpi-v num"><CountUp value={upcoming.length} /> <small>{tn('inicio.specialDay', upcoming.length)}</small></b>
        <span className="kpi-strip month-strip" aria-hidden="true">{Array.from({ length: 31 }, (_, k) => <i key={k} className={k === 0 ? 'today' : undefined} data-on={marked.has(k) || undefined} style={marked.has(k) ? { ['--c' as string]: marked.get(k) } : undefined} />)}</span>
        <span className="kpi-f">{first ? <><DayIcon icon={dayType(first.item.ty)?.icon} size={14} />{first.item.n}</> : t('inicio.nothingMarked')}</span>
      </button>
    </div>

    <div className="home-grid">
      <article className="card">
        <div className="card-h"><h3>{t('inicio.agendaToday')}</h3>{more('agenda', t('inicio.openAgenda'))}</div>
        {events.length ? <div className="hl">{events.slice(0, 6).map(e => {
          const live = mins(e.start) <= nowM && nowM < mins(e.end), past = mins(e.end) <= nowM
          return <div key={`${e.id}:${e.day}`} className={'hl-row ev-row' + (live ? ' is-now' : '') + (past ? ' is-past' : '')} style={{ ['--c' as string]: color(e) }}>
            <time className="num">{e.start}</time>
            <span className="hl-main"><b>{e.title}</b><small>{live ? t('inicio.nowUntil', { time: e.realEnd }) : e.cont ? t('inicio.untilTime', { time: e.realEnd }) : `${e.start} – ${e.realEnd}`}</small></span>
            {catName(e) && <span className="tag">{catName(e)}</span>}
          </div>
        })}{events.length > 6 && <p className="mu hl-more">{t('inicio.moreInAgenda', { n: events.length - 6 })}</p>}</div>
          : <EmptyState compact icon={<CalendarPlus size={18} strokeWidth={1.5} />} title={t('inicio.noEventsToday')} text={t('inicio.openAgendaHint')} />}
      </article>

      <article className="card">
        <div className="card-h"><h3>{t('inicio.tasksTitle')}</h3>
          <span className="card-acts"><span className="seg sm" role="group" aria-label={t('inicio.taskRange')}>{RANGES.map(x => <button key={x.id} type="button" aria-pressed={range === x.id} onClick={() => setRange(x.id)}>{t(x.label)}</button>)}<Glider /></span>{more('tarefas', t('inicio.viewTasks'))}</span></div>
        {shown.length ? <div className="hl">{shown.slice(0, LIMIT).map(tk => {
          const [lbl, isLate] = dueLabel(tk, today, nowTime, lang)
          return <label key={tk.id} className="hl-row task-row">
            <input className="rc" type="checkbox" checked={false} aria-label={t('inicio.complete', { title: tk.t })} onChange={() => complete(tk.id)} />
            <span className="hl-main"><b>{tk.t}</b>{lbl && <small className={isLate ? 'late' : ''}>{lbl}</small>}</span>
            <span className="prio" title={t('inicio.priority', { name: priorityLabel(tk.p, lang).toLowerCase() })} style={{ ['--c' as string]: PC[tk.p] }} />
          </label>
        })}{shown.length > LIMIT && <p className="mu hl-more">{t('inicio.moreTasks', { n: shown.length - LIMIT })}</p>}</div>
          : <EmptyState compact icon={<CheckCheck size={18} strokeWidth={1.5} />} title={t(pending.length ? 'inicio.nothingInRange' : 'inicio.allDone')} text={t(pending.length ? RANGES.find(x => x.id === range)!.empty : 'inicio.noPending')} />}
      </article>

      <article className="card">
        <div className="card-h"><h3>{t('inicio.financeTitle')}</h3>
          <span className="card-acts">{data.fin.length > 0 && <button type="button" className="btn ghost sm" aria-pressed={!hide} onClick={() => setHide(!hide)}>{hide ? <Eye size={15} strokeWidth={1.5} aria-hidden="true" /> : <EyeOff size={15} strokeWidth={1.5} aria-hidden="true" />}{t(hide ? 'inicio.showValues' : 'inicio.hideValues')}</button>}{more('financas', t('inicio.viewFinance'))}</span></div>
        {data.fin.length ? <div className={'home-fin' + money}>
          <div className="mini-bars" role="img" aria-label={t('inicio.barsLabel')}>{months.map((x, k) => <span key={x.q} className={x.q === ym ? 'on' : ''} style={{ ['--i' as string]: k }}>
            <MonthTip month={x} />
            <span className="mb"><i style={{ height: `${x.i / mx * 100}%`, background: IN_COLOR }} /><i style={{ height: `${x.o / mx * 100}%`, background: OUT_COLOR }} /></span><small>{monthShort(x.q, monthNames)}</small></span>)}</div>
          <div className="spend">{spend.length ? spend.map((c, k) => <div key={c.id} className="spend-row" style={{ ['--c' as string]: c.color, ['--i' as string]: k }}>
            <span className="spend-h"><span>{t(`financas.cat.${c.id}` as MessageKey)}</span><b className="num">{money2(c.v)}</b></span><span className="spend-bar"><i style={{ width: `${c.v / spend[0].v * 100}%` }} /></span></div>)
            : <p className="mu">{t('inicio.noSpending')}</p>}</div>
        </div> : <EmptyState compact icon={<Wallet size={18} strokeWidth={1.5} />} title={t('inicio.noRecords')} text={t('inicio.noRecordsHint')} />}
      </article>

      <article className="card">
        <div className="card-h"><h3>{t('inicio.upcomingTitle')}</h3>{more('calendario', t('inicio.openCalendar'))}</div>
        {upcoming.length ? <div className="hl">{upcoming.slice(0, LIMIT).map(({ item, date }) => {
          const type = dayType(item.ty)
          return <div key={item.id} className="hl-row" style={{ ['--c' as string]: type?.color ?? PALETTE.neutral }}>
            <span className="hl-icon" aria-hidden="true"><DayIcon icon={type?.icon} size={18} /></span>
            <span className="hl-main"><b>{item.n}</b><small>{shortDate(date)}{item.h ? ` · ${specialDayTime(item)}` : ''}</small></span>
            <span className="tag">{inDays(daysLeft(date, today))}</span>
          </div>
        })}</div> : <EmptyState compact icon={<CalendarHeart size={18} strokeWidth={1.5} />} title={t('inicio.nothingMarked')} text={t('inicio.noSpecialDays')} />}
      </article>
    </div>
  </section>
}
