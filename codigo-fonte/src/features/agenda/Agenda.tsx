import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Tags } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { DN, MN, dow, fmt, hm, iso, mins, minuteOfDay, p2, parse, spanMinutes } from '../../lib/dates'
import { categoryColor, crossesMidnight, eventColor, eventMinutes, eventsOn, type DayEvent } from '../../lib/recurrence'
import { specialDaysOn } from '../../lib/specialDays'
import { sleepIv } from '../../lib/sleep'
import { Modal, uid, useArrowKeys, useIsPhone, useNow } from '../../components/common'
import { CategoryManager } from '../../components/CategoryManager'
import type { PEvent, Rep } from '../../types'
import { DatePicker } from '../../components/DatePicker'
import { TimePicker } from '../../components/TimePicker'
import { Select } from '../../components/Select'
import { Glider } from '../../components/Glider'
import { WEEK_RANGE, clipToWeek, weekScale } from '../../lib/agendaFit'
import { SleepWindow } from './SleepWindow'

type L = DayEvent & { l: number; n: number }
function lanes(list: DayEvent[]): L[] {
  const out: L[] = []; let cl: L[] = []; let end = 0
  const flush = () => {
    const le: number[] = []
    cl.forEach(e => { let i = le.findIndex(x => x <= mins(e.start)); if (i < 0) { i = le.length; le.push(0) } le[i] = mins(e.end); e.l = i })
    cl.forEach(e => { e.n = le.length }); out.push(...cl); cl = []
  }
  list.forEach(e => { if (cl.length && mins(e.start) >= end) { flush(); end = 0 } cl.push({ ...e, l: 0, n: 1 }); end = Math.max(end, mins(e.end)) })
  flush(); return out
}
interface Form { id?: string; ds: string; title: string; start: string; end: string; date: string; rep: Rep; days: number[]; cat: string }

export type AgendaView = 'week' | 'day'

export function Agenda({ anchor, setAnchor, view, setView }: { anchor: string; setAnchor: (s: string) => void; view: AgendaView; setView: (v: AgendaView) => void }) {
  const { data, update } = useStore()
  const [fcat, setFcat] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [err, setErr] = useState('')
  const [cm, setCm] = useState(false)
  const [sleepDay, setSleepDay] = useState<string | null>(null)
  const now = useNow(), box = useRef<HTMLDivElement>(null)
  const nowM = minuteOfDay(now), td = iso(now)
  useEffect(() => { if (box.current) box.current.scrollTop = Math.max(0, nowM - 90) }, []) // eslint-disable-line

  const A = parse(anchor), N = view === 'week' ? 7 : 1
  // On phones the week fits the screen: seven narrow columns, 08:00 to 20:00.
  const phone = useIsPhone(), narrow = phone && N === 7
  // Agenda weeks run Sunday to Saturday.
  const first = new Date(A); if (N === 7) first.setDate(first.getDate() - A.getDay())
  const days = Array.from({ length: N }, (_, i) => { const d = new Date(first); d.setDate(d.getDate() + i); return d })
  const last = days[N - 1]
  const range = narrow ? WEEK_RANGE : { from: 0, to: 1440 }
  const px = narrow ? weekScale(innerHeight) : 1
  const eventsFor = (ds: string) => eventsOn(data, ds).filter(e => !fcat || e.cat === fcat)
  const y = (m: number) => (m - range.from) * px
  const gridHeight = y(range.to)
  const label = N === 7 ? `${first.getDate()} ${MN[first.getMonth()]} – ${last.getDate()} ${MN[last.getMonth()]} ${last.getFullYear()}` : `${DN[dow(A)]}, ${A.getDate()} ${MN[A.getMonth()]} ${A.getFullYear()}`
  const move = (k: number) => { const d = new Date(A); d.setDate(d.getDate() + k * N); setAnchor(iso(d)) }
  useArrowKeys(move)
  const color = (e: PEvent) => eventColor(data.cats, e)

  const openNew = (ds: string, m: number) => { setErr(''); setForm({ ds, title: '', start: hm(m), end: hm(Math.min(m + 60, 1439)), date: ds, rep: 'none', days: [], cat: data.cats[0]?.id ?? '' }) }
  const openEdit = (id: string, ds: string) => {
    const e = data.ev.find(x => x.id === id); if (!e) return
    setErr(''); setForm({ id, ds, title: e.title, start: e.start, end: e.end, date: e.date, rep: e.rep, days: e.days ?? [], cat: e.cat })
  }
  const save = (ev: FormEvent) => {
    ev.preventDefault(); const f = form; if (!f) return
    if (f.end === f.start) { setErr('O fim tem de ser diferente do início'); return }
    const dd = f.rep === 'custom' ? (f.days.length ? [...f.days].sort() : [dow(parse(f.date))]) : undefined
    const o = { title: f.title.trim(), start: f.start, end: f.end, date: f.date, rep: f.rep, days: dd, cat: f.cat, color: categoryColor(data.cats, f.cat) }
    update(d => { if (f.id) { const b = d.ev.find(x => x.id === f.id); if (b) Object.assign(b, o) } else d.ev.push({ ...o, id: uid('e'), done: {} }) })
    setAnchor(f.date); setForm(null)
  }
  const delSeries = () => { const id = form?.id; update(d => { d.ev = d.ev.filter(x => x.id !== id) }); setForm(null) }
  const delDay = () => { const f = form; update(d => { const b = d.ev.find(x => x.id === f?.id); if (b && f) b.ex = { ...b.ex, [f.ds]: { x: 1 } } }); setForm(null) }
  const rep = form?.id ? data.ev.find(x => x.id === form.id)?.rep !== 'none' : false

  return <section className="page agenda-page">
    <div className="bar">
      <button className="btn sq" onClick={() => move(-1)} aria-label="Anterior">‹</button>
      <span className="rg">{label}</span>
      <button className="btn sq" onClick={() => move(1)} aria-label="Seguinte">›</button>
      <button className="btn ghost" onClick={() => { setAnchor(td); if (box.current) box.current.scrollTop = Math.max(0, nowM - 90) }}>Hoje</button>
      <Select value={fcat} onChange={setFcat} aria-label="Filtrar por categoria" options={[{ value: '', label: phone ? 'Todas' : 'Todas as categorias' }, ...data.cats.map(c => ({ value: c.id, label: c.name, color: c.color }))]} />
      {phone ? <button className="btn sq" aria-label="Categorias" title="Categorias" onClick={() => setCm(true)}><Tags size={16} strokeWidth={1.5} aria-hidden="true" /></button> : <button className="btn" onClick={() => setCm(true)}>Categorias</button>}
      <div className="seg"><button aria-pressed={view === 'week'} onClick={() => setView('week')}>Semana</button><button aria-pressed={view === 'day'} onClick={() => setView('day')}>Dia</button><Glider /></div>
      <button className={'btn pri' + (phone ? ' sq' : '')} aria-label="Novo evento" title="Novo evento" onClick={() => openNew(anchor, anchor === td ? Math.min(nowM + 1, 1439) : 540)}>{phone ? <Plus size={16} strokeWidth={2} aria-hidden="true" /> : 'Novo evento'}</button>
    </div>
    <div className={'tt' + (narrow ? ' fit' : '')} ref={box} tabIndex={0} role="region" aria-label="Horário da agenda">
      <div className="gr" style={{ gridTemplateColumns: narrow ? '26px repeat(7,minmax(0,1fr))' : `52px repeat(${N},minmax(104px,1fr))`, minWidth: N === 7 && !narrow ? 790 : 0, ['--hour' as string]: `${60 * px}px` }}>
        <div className="corner" />
        {days.map(d => <div key={iso(d)} className={'hd' + (iso(d) === td ? ' td' : '')}><span className="dw">{DN[dow(d)]}</span><b className="dd">{d.getDate()}</b>
          {narrow && (() => { const hidden = eventsFor(iso(d)).length - clipToWeek(eventsFor(iso(d))).length
            return hidden > 0 && <button type="button" className="hd-more" aria-label={`${hidden} fora do horário, abrir este dia`} title="Fora do horário das 8:00 às 20:00" onClick={() => { setAnchor(iso(d)); setView('day') }}>+{hidden}</button> })()}
          {specialDaysOn(data.days, iso(d)).map(x => <span className="agenda-special" key={x.id} title={x.o || x.n}>{x.h ? `${x.h} · ` : ''}{x.n}</span>)}
        </div>)}
        <div className="tc" style={{ height: gridHeight }}>{Array.from({ length: (range.to - range.from) / 60 + (narrow ? 1 : 0) }, (_, i) => range.from / 60 + i).map(h => <div key={h} style={{ top: y(h * 60) }}>{narrow ? `${h}h` : `${p2(h)}:00`}</div>)}</div>
        {days.map(d => {
          const ds = iso(d), evs = narrow ? clipToWeek(eventsFor(ds)) : eventsFor(ds)
          return <div key={ds} data-d={ds} className={'col' + (ds === td ? ' td' : '')} style={{ height: gridHeight }}
            onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('past')) openNew(ds, Math.max(0, Math.min(1439, Math.round(range.from + (e.clientY - e.currentTarget.getBoundingClientRect().top) / px)))) }}>
            {sleepIv(data.sleep, ds).map(([a, b]) => [Math.max(a, range.from), Math.min(b, range.to)]).filter(([a, b]) => b > a).map(([a, b], i) => <button key={i} type="button" className="slp" aria-label={`Editar o sono de ${DN[dow(d)]}, dia ${d.getDate()}`} title="Editar o horário de sono" style={{ top: y(a), height: (b - a) * px }} onClick={() => setSleepDay(ds)}>{!narrow && b - a > 90 && <span>Sono</span>}</button>)}
            {lanes(evs).map(e => { const h = Math.max(narrow ? 16 : 18, eventMinutes(e) * px - 1), w = 100 / e.n, gap = narrow ? 1 : 2, night = crossesMidnight({ start: e.realStart, end: e.realEnd }), full = spanMinutes(e.realStart, e.realEnd)
              return <div key={`${e.id}:${e.day}`} className={'ev' + (!narrow && h < 44 ? ' sm' : '') + (narrow && (e.n > 1 || h < 26) ? ' tight' : '') + (e.cont ? ' from-prev' : night ? ' to-next' : '')} title={e.title} style={{ ['--c' as string]: color(e), top: y(mins(e.start)), height: h, left: `calc(${e.l * w}% + ${gap}px)`, width: `calc(${w}% - ${gap * 2}px)` }} onClick={() => openEdit(e.id, e.day)}>
                <b>{e.title}</b><small>{e.cont ? `até às ${e.realEnd}` : `${e.realStart}–${e.realEnd}`}{h < 44 ? '' : ' · ' + fmt(full)}</small></div> })}
            {ds === td && <><div className="past" style={{ height: Math.max(0, Math.min(y(nowM), gridHeight)) }} />{nowM >= range.from && nowM < range.to && <div className="now" style={{ top: y(nowM) }} />}</>}
          </div>
        })}
      </div>
    </div>
    {cm && <CategoryManager list="cats" title="Categorias da Agenda" description="Define o nome e a cor usadas nos eventos." onClose={() => setCm(false)} />}
    {sleepDay && <SleepWindow ds={sleepDay} onClose={() => setSleepDay(null)} />}
    {form && <Modal title={form.id ? 'Editar evento' : 'Novo evento'} onClose={() => setForm(null)}>
      <form className="fgrid" onSubmit={save}>
        <label className="w">Título<input value={form.title} maxLength={80} required autoFocus onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>Início<TimePicker required value={form.start} onChange={start => setForm({ ...form, start })} /></label>
        <label>Fim<TimePicker required value={form.end} onChange={end => setForm({ ...form, end })} /></label>
        <label>Dia<DatePicker required value={form.date} onChange={date => setForm({ ...form, date })} /></label>
        <label>Repetir<Select<Rep> value={form.rep} onChange={rep => setForm({ ...form, rep })} options={[
          { value: 'none', label: 'Não repete' }, { value: 'daily', label: 'Todos os dias' }, { value: 'weekdays', label: 'Dias úteis' }, { value: 'custom', label: 'Dias à escolha' }, { value: 'weekly', label: 'Todas as semanas' }]} /></label>
        {form.rep === 'custom' && <div className="w dys">{DN.map((n, i) => <button key={n} type="button" aria-pressed={form.days.includes(i)} onClick={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter(x => x !== i) : [...form.days, i] })}>{n}</button>)}</div>}
        <div className="w cats">{data.cats.map(c => <label key={c.id} className="cp"><input type="radio" name="cat" checked={form.cat === c.id} onChange={() => setForm({ ...form, cat: c.id })} /><span style={{ ['--c' as string]: c.color }}>{c.name}</span></label>)}</div>
        {crossesMidnight(form) && <p className="w mu">Termina no dia seguinte.</p>}
        {err && <p className="w neg" role="alert">{err}</p>}
        <div className="acts w">{form.id && (rep ? <><button type="button" className="btn dng" onClick={delDay}>Apagar só este dia</button><button type="button" className="btn dng" onClick={delSeries}>Apagar série</button></> : <button type="button" className="btn dng" onClick={delSeries}>Apagar</button>)}
          <span className="sp" /><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
