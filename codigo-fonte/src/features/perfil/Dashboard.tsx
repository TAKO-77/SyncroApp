import { PALETTE } from '../../lib/palette'
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { dow, fmt, iso, mins, parse } from '../../lib/dates'
import { eventsOn } from '../../lib/recurrence'
import { sleepIv } from '../../lib/sleep'
import { todayIso } from '../../components/common'
import { Donut, type Slice } from '../../components/Donut'

export function Dashboard() {
  const { data } = useStore()
  const [per, setPer] = useState<'week' | 'month'>('week')
  const t = parse(todayIso()); let a: Date, b: Date
  if (per === 'week') { a = new Date(t); a.setDate(a.getDate() - dow(t)); b = new Date(a); b.setDate(b.getDate() + 6) }
  else { a = new Date(t.getFullYear(), t.getMonth(), 1); b = new Date(t.getFullYear(), t.getMonth() + 1, 0) }
  const m: Record<string, number> = {}; let days = 0, sl = 0
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    days++; const ds = iso(d), busy = new Uint8Array(1440)
    eventsOn(data, ds).forEach(e => { const k = e.cat || 'none'; m[k] = (m[k] ?? 0) + Math.max(0, mins(e.end) - mins(e.start)); for (let x = mins(e.start); x < mins(e.end); x++) busy[x] = 1 })
    sleepIv(data.sleep, ds).forEach(([p, q]) => { for (let x = p; x < q; x++) if (!busy[x]) sl++ })
  }
  const cr: Slice[] = [...data.cats, { id: 'none', name: 'Sem categoria', color: PALETTE.neutral }].map(c => ({ ...c, v: m[c.id] ?? 0 })).filter(r => r.v > 0).sort((x, y) => y.v - x.v)
  const plan = cr.reduce((q, r) => q + r.v, 0), P = Math.max(days * 1440, plan)
  const rows: Slice[] = [...cr, ...(sl ? [{ id: 'sono', name: 'Sono', color: PALETTE.slate, v: sl }] : []), { id: 'free', name: 'Tempo livre', color: PALETTE.muted, v: Math.max(0, P - plan - sl) }]
  return <>
    <div className="seg dsw"><button aria-pressed={per === 'week'} onClick={() => setPer('week')}>Semana</button><button aria-pressed={per === 'month'} onClick={() => setPer('month')}>Mês</button></div>
    {plan ? <Donut rows={rows} P={P} fv={fmt} center={fmt(plan)} label="planeadas" /> : <p className="mu">Ainda não há eventos neste período.</p>}
  </>
}
