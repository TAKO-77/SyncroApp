import { PALETTE } from '../../lib/palette'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { DN, MN, dow, fmt, hm, iso, mins, parse } from '../../lib/dates'
import { eventsOn } from '../../lib/recurrence'
import { sleepIv } from '../../lib/sleep'
import { Modal, uid, useNow } from '../../components/common'
import { CategoryManager } from '../../components/CategoryManager'
import { useToast } from '../../store/toast'
import { useStore as store } from '../../store/useStore'
import type { PEvent, Rep } from '../../types'
import { DatePicker } from '../../components/DatePicker'
import { TimePicker } from '../../components/TimePicker'
import { Select } from '../../components/Select'

type L = PEvent & { l: number; n: number }
function lanes(list: PEvent[]): L[] {
  const out: L[] = []; let cl: L[] = []; let end = 0
  const flush = () => {
    const le: number[] = []
    cl.forEach(e => { let i = le.findIndex(x => x <= mins(e.start)); if (i < 0) { i = le.length; le.push(0) } le[i] = mins(e.end); e.l = i })
    cl.forEach(e => { e.n = le.length }); out.push(...cl); cl = []
  }
  list.forEach(e => { if (cl.length && mins(e.start) >= end) { flush(); end = 0 } cl.push({ ...e, l: 0, n: 1 }); end = Math.max(end, mins(e.end)) })
  flush(); return out
}
const dur = (e: PEvent) => Math.max(0, mins(e.end) - mins(e.start))
interface Form { id?: string; ds: string; title: string; start: string; end: string; date: string; rep: Rep; days: number[]; cat: string }

export type AgendaView = 'week' | 'day'

export function Agenda({ anchor, setAnchor, view, setView }: { anchor: string; setAnchor: (s: string) => void; view: AgendaView; setView: (v: AgendaView) => void }) {
  const { data, update } = useStore()
  const [fcat, setFcat] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [err, setErr] = useState('')
  const [cm, setCm] = useState(false)
  const now = useNow(), box = useRef<HTMLDivElement>(null)
  const nowM = now.getHours() * 60 + now.getMinutes(), td = iso(now)
  useEffect(() => { if (box.current) box.current.scrollTop = Math.max(0, nowM - 90) }, []) // eslint-disable-line

  const A = parse(anchor), N = view === 'week' ? 7 : 1
  const first = new Date(A); if (N === 7) first.setDate(first.getDate() - dow(A))
  const days = Array.from({ length: N }, (_, i) => { const d = new Date(first); d.setDate(d.getDate() + i); return d })
  const last = days[N - 1]
  const specialDaysOn = (ds: string) => data.days
    .filter(x => x.y ? ds >= x.s && ds.slice(5) === x.s.slice(5) : ds >= x.s && ds <= (x.e || x.s))
    .sort((a, b) => (a.h || '99').localeCompare(b.h || '99'))
  const label = N === 7 ? `${first.getDate()} ${MN[first.getMonth()]} – ${last.getDate()} ${MN[last.getMonth()]} ${last.getFullYear()}` : `${DN[dow(A)]}, ${A.getDate()} ${MN[A.getMonth()]} ${A.getFullYear()}`
  const move = (k: number) => { const d = new Date(A); d.setDate(d.getDate() + k * N); setAnchor(iso(d)) }
  const color = (e: PEvent) => data.cats.find(c => c.id === e.cat)?.color ?? e.color ?? PALETTE.neutral

  const openNew = (ds: string, m: number) => { setErr(''); setForm({ ds, title: '', start: hm(m), end: hm(Math.min(m + 60, 1439)), date: ds, rep: 'none', days: [], cat: data.cats[0]?.id ?? '' }) }
  const openEdit = (id: string, ds: string) => {
    const e = data.ev.find(x => x.id === id); if (!e) return
    setErr(''); setForm({ id, ds, title: e.title, start: e.start, end: e.end, date: e.date, rep: e.rep, days: e.days ?? [], cat: e.cat })
  }
  const save = (ev: FormEvent) => {
    ev.preventDefault(); const f = form; if (!f) return
    if (mins(f.end) <= mins(f.start)) { setErr('O fim tem de ser depois do início'); return }
    const dd = f.rep === 'custom' ? (f.days.length ? [...f.days].sort() : [dow(parse(f.date))]) : undefined
    const o = { title: f.title.trim(), start: f.start, end: f.end, date: f.date, rep: f.rep, days: dd, cat: f.cat, color: data.cats.find(c => c.id === f.cat)?.color }
    update(d => { if (f.id) { const b = d.ev.find(x => x.id === f.id); if (b) Object.assign(b, o) } else d.ev.push({ ...o, id: uid('e'), done: {} }) })
    setAnchor(f.date); setForm(null)
  }
  const delSeries = () => { const id = form?.id; update(d => { d.ev = d.ev.filter(x => x.id !== id) }); setForm(null) }
  const delDay = () => { const f = form; update(d => { const b = d.ev.find(x => x.id === f?.id); if (b && f) b.ex = { ...b.ex, [f.ds]: { x: 1 } } }); setForm(null) }
  const rep = form?.id ? data.ev.find(x => x.id === form.id)?.rep !== 'none' : false
  const noClick = useRef(0)
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, ev: PEvent, srcDs: string) => {
    if (e.button !== 0 || !box.current) return
    const el = e.currentTarget, tt = box.current, st0 = tt.scrollTop
    const resize = !!(e.target as HTMLElement).closest('.rz')
    const cols = [...tt.querySelectorAll<HTMLElement>('.col')], srcCol = el.parentElement as HTMLElement
    const eff = eventsOn(data, srcDs).find(x => x.id === ev.id) ?? ev
    const s0 = mins(eff.start), e0 = mins(eff.end), sx = e.clientX, sy = e.clientY
    let moved = false, ghost: HTMLDivElement | null = null, tip: HTMLSpanElement | null = null
    let tgt = { col: srcCol, s: s0, e: e0 }
    const snap = (v: number) => Math.max(0, Math.min(1439, Math.round(v)))
    const colAt = (x: number) => { let b = cols[0], bd = 1e9; cols.forEach(c => { const r = c.getBoundingClientRect(), d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0; if (d < bd) { bd = d; b = c } }); return b }
    const onMove = (m: PointerEvent) => {
      const tr = tt.getBoundingClientRect()
      if (moved) { if (m.clientY < tr.top + 50) tt.scrollTop -= 14; else if (m.clientY > tr.bottom - 50) tt.scrollTop += 14 }
      const dx = m.clientX - sx, dy = m.clientY - sy + (tt.scrollTop - st0)
      if (!moved) {
        if (Math.hypot(dx, m.clientY - sy) < 5) return
        moved = true; el.classList.add('drag')
        if (!resize) { ghost = document.createElement('div'); ghost.className = 'ghost'; tip = document.createElement('span'); tip.className = 'tip'; ghost.appendChild(tip); srcCol.appendChild(ghost) }
      }
      if (resize) { const ne = Math.max(s0 + 1, Math.min(1439, snap(e0 + dy))); tgt.e = ne; el.style.height = Math.max(18, ne - s0 - 1) + 'px'; return }
      const d = e0 - s0, ns = Math.max(0, Math.min(1439 - d, snap(s0 + dy))), col = colAt(m.clientX)
      tgt = { col, s: ns, e: ns + d }
      el.style.transform = `translate(${dx}px,${dy}px)`
      if (ghost && tip) { ghost.style.top = ns + 'px'; ghost.style.height = Math.max(18, d - 1) + 'px'; if (ghost.parentElement !== col) col.appendChild(ghost); tip.textContent = hm(ns) + '–' + hm(ns + d) + (col !== srcCol ? ' · ' + DN[dow(parse(col.dataset.d as string))] : '') }
    }
    const commit = () => {
      const st = store.getState(), sd = srcCol.dataset.d as string, td = tgt.col.dataset.d as string
      const diff = !resize && tgt.col !== srcCol, ns = hm(tgt.s), ne = hm(tgt.e)
      const series = (o: PEvent) => {
        o.start = ns; o.end = ne
        if (!diff) return
        if (o.rep === 'none') o.date = td
        else if (o.rep === 'weekly') { const k = Math.round((+parse(td) - +parse(sd)) / 864e5), d = parse(o.date); d.setDate(d.getDate() + k); o.date = iso(d) }
        else if (o.rep === 'custom') { const a = dow(parse(sd)), c = dow(parse(td)); o.days = [...new Set((o.days ?? []).filter(x => x !== a).concat(c))].sort() }
      }
      const undo = { label: 'Anular', fn: () => store.getState().undo() }
      if (ev.rep === 'none') { st.update(d => { const o = d.ev.find(x => x.id === ev.id); if (o) series(o) }); useToast.getState().show(resize ? 'Duração alterada' : 'Evento movido', [undo]); return }
      st.update(d => {
        const o = d.ev.find(x => x.id === ev.id); if (!o) return
        o.ex = o.ex ?? {}
        if (diff) { o.ex[sd] = { x: 1 }; d.ev.push({ id: uid('e'), title: eff.title, start: ns, end: ne, date: td, rep: 'none', cat: eff.cat, color: eff.color, done: {} }) }
        else { const cur = o.ex[sd]; o.ex[sd] = { ...(cur && !cur.x ? cur : {}), start: ns, end: ne } }
      })
      useToast.getState().show(diff ? 'Movido só neste dia' : 'Alterado só neste dia', [undo, { label: 'Aplicar à série', fn: () => { const s2 = store.getState(); s2.undo(); s2.update(d => { const o = d.ev.find(x => x.id === ev.id); if (o) series(o) }) } }])
    }
    const onUp = () => {
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp)
      if (!moved) return
      noClick.current = Date.now() + 300
      ghost?.remove(); el.classList.remove('drag'); el.style.transform = ''
      commit()
    }
    addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp)
  }
  let total = 0

  return <section className="page agenda-page">
    <div className="bar">
      <button className="btn sq" onClick={() => move(-1)} aria-label="Anterior">‹</button>
      <span className="rg">{label}</span>
      <button className="btn sq" onClick={() => move(1)} aria-label="Seguinte">›</button>
      <button className="btn ghost" onClick={() => { setAnchor(td); if (box.current) box.current.scrollTop = Math.max(0, nowM - 90) }}>Hoje</button>
      <Select value={fcat} onChange={setFcat} aria-label="Filtrar por categoria" options={[{ value: '', label: 'Todas as categorias' }, ...data.cats.map(c => ({ value: c.id, label: c.name, color: c.color }))]} />
      <button className="btn" onClick={() => setCm(true)}>Categorias</button>
      <div className="seg"><button aria-pressed={view === 'week'} onClick={() => setView('week')}>Semana</button><button aria-pressed={view === 'day'} onClick={() => setView('day')}>Dia</button></div>
      <button className="btn pri" onClick={() => openNew(anchor, anchor === td ? Math.min(nowM + 1, 1439) : 540)}>Novo evento</button>
    </div>
    <div className="tt" ref={box} tabIndex={0} role="region" aria-label="Horário da agenda">
      <div className="gr" style={{ gridTemplateColumns: `52px repeat(${N},minmax(104px,1fr))`, minWidth: N === 7 ? 790 : 0 }}>
        <div className="corner" />
        {days.map(d => <div key={iso(d)} className={'hd' + (iso(d) === td ? ' td' : '')}><span className="dw">{DN[dow(d)]}</span><b className="dd">{d.getDate()}</b>
          {specialDaysOn(iso(d)).map(x => <span className="agenda-special" key={x.id} title={x.o || x.n}>{x.h ? `${x.h} · ` : ''}{x.n}</span>)}
        </div>)}
        <div className="tc" style={{ height: 1440 }}>{Array.from({ length: 24 }, (_, h) => <div key={h} style={{ top: h * 60 }}>{String(h).padStart(2, '0')}:00</div>)}</div>
        {days.map(d => {
          const ds = iso(d), evs = eventsOn(data, ds).filter(e => !fcat || e.cat === fcat); total += evs.reduce((a, e) => a + dur(e), 0)
          return <div key={ds} data-d={ds} className={'col' + (ds === td ? ' td' : '')} style={{ height: 1440 }}
            onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('slp') || (e.target as HTMLElement).classList.contains('past')) openNew(ds, Math.max(0, Math.min(1439, Math.round(e.clientY - e.currentTarget.getBoundingClientRect().top)))) }}>
            {sleepIv(data.sleep, ds).map(([a, b], i) => <div key={i} className="slp" style={{ top: a, height: b - a }}>{b - a > 90 && <span>Sono</span>}</div>)}
            {lanes(evs).map(e => { const h = Math.max(18, dur(e) - 1), w = 100 / e.n
              return <div key={e.id} className={'ev' + (h < 44 ? ' sm' : '')} title={e.title} style={{ ['--c' as string]: color(e), top: mins(e.start), height: h, left: `calc(${e.l * w}% + 2px)`, width: `calc(${w}% - 4px)` }} onPointerDown={ev => startDrag(ev, e, ds)} onClick={() => { if (Date.now() > noClick.current) openEdit(e.id, ds) }}>
                <div className="rz" /><b>{e.title}</b><small>{e.start}–{e.end}{h < 44 ? '' : ' · ' + fmt(dur(e))}</small></div> })}
            {ds === td && <><div className="past" style={{ height: nowM }} /><div className="now" style={{ top: nowM }} /></>}
          </div>
        })}
      </div>
    </div>
    <p className="mu">{total ? `${fmt(total)} planeadas ${N === 7 ? 'esta semana' : 'neste dia'}` : ''}</p>
    {cm && <CategoryManager list="cats" title="Categorias da Agenda" description="Define o nome e a cor usadas nos eventos." onClose={() => setCm(false)} />}
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
        {err && <p className="w neg" role="alert">{err}</p>}
        <div className="acts w">{form.id && (rep ? <><button type="button" className="btn dng" onClick={delDay}>Apagar só este dia</button><button type="button" className="btn dng" onClick={delSeries}>Apagar série</button></> : <button type="button" className="btn dng" onClick={delSeries}>Apagar</button>)}
          <span className="sp" /><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
