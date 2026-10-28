import { PALETTE } from '../../lib/palette'
import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { DN, dow, iso, parse } from '../../lib/dates'
import { Modal, todayIso, uid } from '../../components/common'
import { CategoryManager } from '../../components/CategoryManager'
import type { SpecialDay } from '../../types'
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
  const sdT = (x: SpecialDay) => data.dayCats.find(t => t.id === x.ty) ?? NO_CAT
  const icon = (t: { icon?: string }) => t.icon ? `${t.icon} ` : ''
  const first = parse(m), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), rows = Math.ceil((dow(first) + dim) / 7)
  const sdOn = (ds: string) => data.days.filter(x => x.y ? ds >= x.s && ds.slice(5) === x.s.slice(5) : ds >= x.s && ds <= (x.e || x.s)).sort((a, b) => (a.h || '99').localeCompare(b.h || '99'))
  const horizon = parse(today)
  horizon.setDate(horizon.getDate() + 31)
  const upcomingEnd = iso(horizon)
  const daysLeft = (date: string) => Math.round((Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) - Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))) / 86400000)
  const upcoming = data.days.flatMap(item => {
    if (item.y) {
      let year = Math.max(+today.slice(0, 4), +item.s.slice(0, 4))
      let date = `${year}${item.s.slice(4)}`
      if (date < today) date = `${++year}${item.s.slice(4)}`
      return date >= item.s && date <= upcomingEnd && iso(parse(date)) === date ? [{ item, date }] : []
    }
    const end = item.e || item.s
    if (end < today || item.s > upcomingEnd) return []
    return [{ item, date: item.s < today ? today : item.s }]
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.item.h || '99').localeCompare(b.item.h || '99'))
  const shift = (k: number) => { const d = new Date(first); d.setMonth(d.getMonth() + k); setM(iso(d)) }
  const blank = (): F => ({ n: '', ty: data.dayCats.some(t => t.id === 'evento') ? 'evento' : data.dayCats[0]?.id ?? '', s: m.slice(0, 7) === today.slice(0, 7) ? today : m, e: '', h: '', o: '', y: false })
  const save = (ev: FormEvent) => {
    ev.preventDefault(); if (!f) return
    const o = { ...f, n: f.n.trim(), e: f.y ? '' : f.e }
    if (o.e && o.e < o.s) return
    update(d => { if (f.id) { const b = d.days.find(x => x.id === f.id); if (b) Object.assign(b, o) } else d.days.push({ ...o, id: uid('d') }) })
    setM(o.s.slice(0, 8) + '01'); setF(null)
  }
  const cells = Array.from({ length: rows * 7 }, (_, i) => { const d = new Date(first); d.setDate(1 - dow(first) + i); return d })
  return <section className="page calendar-page">
    <div className="bar">
      <button className="btn sq" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
      <span className="rg cap">{first.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</span>
      <button className="btn sq" onClick={() => shift(1)} aria-label="Mês seguinte">›</button>
      <button className="btn ghost" onClick={() => setM(today.slice(0, 8) + '01')}>Hoje</button>
      <button className="btn sp-l" onClick={() => setCm(true)}>Categorias</button>
      <button className="btn pri" onClick={() => setF(blank())}>Novo dia especial</button>
    </div>
    <section className="upcoming upcoming-compact">
      <div className="upcoming-head"><h2>Próximos 31 dias</h2></div>
      {upcoming.length ? <div className="upcoming-list">{upcoming.map(({ item, date }) => {
        const type = sdT(item), left = daysLeft(date)
        return <div className="upcoming-item" key={item.id} style={{ ['--c' as string]: type.color }}>
          <span className="upcoming-icon">{type.icon}</span><span className="upcoming-name"><b>{item.n}</b><small>{parse(date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}{item.h ? ` · ${item.h}` : ''}</small></span>
          <span className="upcoming-count">{left === 0 ? 'Hoje' : `em ${left} ${left === 1 ? 'dia' : 'dias'}`}</span>
        </div>
      })}</div> : <p className="mu upcoming-empty">Sem marcações nos próximos 31 dias.</p>}
    </section>
    <div className="mg" style={{ gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}>
      {DN.map(d => <div key={d} className="mh">{d}</div>)}
      {cells.map(d => { const ds = iso(d), sds = sdOn(ds)
        return <div key={ds} className={'mc' + (d.getMonth() !== first.getMonth() ? ' out' : '') + (ds === today ? ' td' : '')} onClick={() => onOpenDay(ds)}>
          <span className="mn">{d.getDate()}</span>
          {sds.map(x => { const t = sdT(x); return <i key={x.id} className="sdp" style={{ ['--c' as string]: t.color }} onClick={e => { e.stopPropagation(); setF({ ...x }) }}>{icon(t)}{x.n}</i> })}
        </div> })}
    </div>
    {cm && <CategoryManager list="dayCats" title="Categorias do Calendário" description="Define o nome e a cor usadas nos dias especiais." onClose={() => setCm(false)} />}
    {f && <Modal title={f.id ? 'Editar dia especial' : 'Novo dia especial'} onClose={() => setF(null)}>
      <form className="fgrid" onSubmit={save}>
        <label className="w">Título<input value={f.n} required maxLength={60} autoFocus onChange={e => setF({ ...f, n: e.target.value })} /></label>
        <div className="w cats">{data.dayCats.map(t => <label key={t.id} className="cp"><input type="radio" name="sd" checked={f.ty === t.id} onChange={() => setF({ ...f, ty: t.id, y: !f.id && t.id === 'aniv' ? true : f.y })} /><span style={{ ['--c' as string]: t.color }}>{icon(t)}{t.name}</span></label>)}</div>
        <label>Início<DatePicker required value={f.s} onChange={s => setF({ ...f, s })} /></label>
        {!f.y && <label>Fim (opcional)<DatePicker value={f.e} min={f.s} onChange={e => setF({ ...f, e })} /></label>}
        <label>Hora (opcional)<TimePicker value={f.h} onChange={h => setF({ ...f, h })} /></label>
        <label className="ck"><input type="checkbox" checked={f.y} onChange={e => setF({ ...f, y: e.target.checked })} /> Repete todos os anos</label>
        <label className="w">Notas<input value={f.o} maxLength={200} onChange={e => setF({ ...f, o: e.target.value })} /></label>
        <div className="acts w">{f.id && <button type="button" className="btn dng" onClick={() => { const id = f.id; update(d => { d.days = d.days.filter(x => x.id !== id) }); setF(null) }}>Apagar</button>}
          <span className="sp" /><button type="button" className="btn" onClick={() => setF(null)}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
      </form></Modal>}
  </section>
}
