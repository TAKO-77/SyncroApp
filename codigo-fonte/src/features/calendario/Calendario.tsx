import { PALETTE } from '../../lib/palette'
import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { DN, addMonths, iso, monthGrid, parse, todayIso } from '../../lib/dates'
import { Modal, uid, useArrowKeys } from '../../components/common'
import { CategoryManager } from '../../components/CategoryManager'
import { DayIcon } from '../../components/DayIcon'
import type { SpecialDay } from '../../types'
import { daysLeft, defaultEndTime, endTimeInvalid, isMultiDay, specialDayTime, specialDaysOn, upcomingSpecialDays, weekBars } from '../../lib/specialDays'
import { DatePicker } from '../../components/DatePicker'
import { TimePicker } from '../../components/TimePicker'

const NO_CAT = { id: '', name: 'Sem categoria', color: PALETTE.neutral, icon: '📌' }
type F = Omit<SpecialDay, 'id'> & { id?: string }

export function Calendario({ onOpenDay }: { onOpenDay: (ds: string) => void }) {
  const { data, update } = useStore()
  const today = todayIso()
  const [m, setM] = useState(today.slice(0, 8) + '01')
  const [f, setF] = useState<F | null>(null)
  const [cm, setCm] = useState(false)
  const [err, setErr] = useState('')
  const sdT = (x: SpecialDay) => data.dayCats.find(t => t.id === x.ty) ?? NO_CAT
  const first = parse(m), cells = monthGrid(m.slice(0, 7)).map(parse), rows = cells.length / 7
  const bars = Array.from({ length: rows }, (_, r) => weekBars(data.days, iso(cells[r * 7])))
  const open = (x: SpecialDay) => { setErr(''); setF({ ...x }) }
  const upcoming = upcomingSpecialDays(data.days, today)
  const shift = (k: number) => setM(addMonths(m, k))
  useArrowKeys(shift)
  const blank = (): F => ({ n: '', ty: data.dayCats.some(t => t.id === 'evento') ? 'evento' : data.dayCats[0]?.id ?? '', s: m.slice(0, 7) === today.slice(0, 7) ? today : m, e: '', h: '', he: '', o: '', y: false })
  const save = (ev: FormEvent) => {
    ev.preventDefault(); if (!f) return
    const o = { ...f, n: f.n.trim(), e: f.y ? '' : f.e, he: f.h ? f.he ?? '' : '' }
    if (o.e && o.e < o.s) return
    if (endTimeInvalid(o)) { setErr('A hora de fim tem de ser depois da hora de início.'); return }
    update(d => { if (f.id) { const b = d.days.find(x => x.id === f.id); if (b) Object.assign(b, o) } else d.days.push({ ...o, id: uid('d') }) })
    setM(o.s.slice(0, 8) + '01'); setF(null)
  }
  return <section className="page calendar-page">
    <div className="bar">
      <button className="btn sq" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
      <span className="rg cap">{first.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</span>
      <button className="btn sq" onClick={() => shift(1)} aria-label="Mês seguinte">›</button>
      <button className="btn ghost" onClick={() => setM(today.slice(0, 8) + '01')}>Hoje</button>
      <button className="btn sp-l" onClick={() => setCm(true)}>Categorias</button>
      <button className="btn pri" onClick={() => { setErr(''); setF(blank()) }}>Novo dia especial</button>
    </div>
    <section className="upcoming upcoming-compact">
      <div className="upcoming-head"><h2>Próximos 31 dias</h2></div>
      {upcoming.length ? <div className="upcoming-list">{upcoming.map(({ item, date }) => {
        const type = sdT(item), left = daysLeft(date, today)
        return <div className="upcoming-item" key={item.id} style={{ ['--c' as string]: type.color }}>
          <span className="upcoming-icon"><DayIcon icon={type.icon} /></span><span className="upcoming-name"><b>{item.n}</b><small>{parse(date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}{item.h ? ` · ${specialDayTime(item)}` : ''}</small></span>
          <span className="upcoming-count">{left === 0 ? 'Hoje' : `em ${left} ${left === 1 ? 'dia' : 'dias'}`}</span>
        </div>
      })}</div> : <p className="mu upcoming-empty">Sem marcações nos próximos 31 dias.</p>}
    </section>
    <div className="mg" style={{ gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}>
      {DN.map(d => <div key={d} className="mh">{d}</div>)}
      {cells.map((d, i) => { const ds = iso(d), r = Math.floor(i / 7), c = i % 7, sds = specialDaysOn(data.days, ds).filter(x => !isMultiDay(x))
        // Multi-day special days are drawn once per week row below; empty slots keep their lanes free here.
        const lanes = Math.max(0, ...bars[r].filter(b => b.from <= c && b.to >= c).map(b => b.lane + 1))
        return <div key={ds} className={'mc' + (d.getMonth() !== first.getMonth() ? ' out' : '') + (ds === today ? ' td' : '')} style={{ gridRow: r + 2, gridColumn: c + 1 }} onClick={() => onOpenDay(ds)}>
          <span className="mn">{d.getDate()}</span>
          {Array.from({ length: lanes }, (_, k) => <i key={k} className="sdp-gap" aria-hidden="true" />)}
          {sds.map(x => { const t = sdT(x); return <i key={x.id} className="sdp" style={{ ['--c' as string]: t.color }} onClick={e => { e.stopPropagation(); open(x) }}><DayIcon icon={t.icon} size={12} />{x.n}</i> })}
        </div> })}
      {bars.flatMap((week, r) => week.map(({ item, from, to, lane, head, tail }) => { const t = sdT(item)
        return <i key={item.id + r} role="button" tabIndex={0} title={item.o || item.n} className={'sdb' + (head ? ' head' : '') + (tail ? ' tail' : '')}
          style={{ gridRow: r + 2, gridColumn: `${from + 1} / ${to + 2}`, ['--c' as string]: t.color, ['--lane' as string]: lane }}
          onClick={() => open(item)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item) } }}><DayIcon icon={t.icon} size={12} />{item.n}</i>
      }))}
    </div>
    {cm && <CategoryManager list="dayCats" title="Categorias do Calendário" description="Define o nome e a cor usadas nos dias especiais." onClose={() => setCm(false)} />}
    {f && <Modal title={f.id ? 'Editar dia especial' : 'Novo dia especial'} onClose={() => setF(null)}>
      <form className="fgrid" onSubmit={save}>
        <label className="w">Título<input value={f.n} required maxLength={60} autoFocus onChange={e => setF({ ...f, n: e.target.value })} /></label>
        <div className="w cats">{data.dayCats.map(t => <label key={t.id} className="cp"><input type="radio" name="sd" checked={f.ty === t.id} onChange={() => setF({ ...f, ty: t.id, y: !f.id && t.id === 'aniv' ? true : f.y })} /><span style={{ ['--c' as string]: t.color }}><DayIcon icon={t.icon} size={14} />{t.name}</span></label>)}</div>
        <label>Início<DatePicker required value={f.s} onChange={s => setF({ ...f, s })} /></label>
        {!f.y && <label>Fim (opcional)<DatePicker value={f.e} min={f.s} onChange={e => setF({ ...f, e })} /></label>}
        <label>Hora (opcional)<TimePicker value={f.h} onChange={h => { setErr(''); setF({ ...f, h, he: h ? (f.he && f.he > h ? f.he : defaultEndTime(h)) : '' }) }} /></label>
        {f.h && <label>Hora de fim<TimePicker value={f.he ?? ''} onChange={he => { setErr(''); setF({ ...f, he }) }} /></label>}
        <label className="ck"><input type="checkbox" checked={f.y} onChange={e => setF({ ...f, y: e.target.checked })} /> Repete todos os anos</label>
        <label className="w">Notas<input value={f.o} maxLength={200} onChange={e => setF({ ...f, o: e.target.value })} /></label>
        {err && <p className="w neg" role="alert">{err}</p>}
        <div className="acts w">{f.id && <button type="button" className="btn dng" onClick={() => { const id = f.id; update(d => { d.days = d.days.filter(x => x.id !== id) }); setF(null) }}>Apagar</button>}
          <span className="sp" /><button type="button" className="btn" onClick={() => setF(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
