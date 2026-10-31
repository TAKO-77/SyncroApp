import { useId, useState } from 'react'
export interface Slice { id: string; name: string; color: string; v: number }
export function Donut({ rows, P, fv, center, label }: { rows: Slice[]; P: number; fv: (v: number) => string; center: string; label: string }) {
  const [h, setH] = useState<string | null>(null)
  const mask = useId().replace(/:/g, '')
  const C = 2 * Math.PI * 70; let off = 0
  const r = rows.find(x => x.id === h)
  const pc = (v: number) => v / P * 100 < 1 ? '<1%' : Math.round(v / P * 100) + '%'
  return <div className="dv">
    <div className="don"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="70" fill="none" stroke="var(--l1)" strokeWidth="16" />
      {/* The mask sweeps the slices in clockwise on mount. */}
      <mask id={mask}><circle className="don-sweep" cx="95" cy="95" r="70" fill="none" stroke="#fff" strokeWidth="20" pathLength={1} transform="rotate(-90 95 95)" /></mask>
      <g mask={`url(#${mask})`}>{rows.map(s => { const L = s.v / P * C, o = off; off += L
        return <circle key={s.id} cx="95" cy="95" r="70" fill="none" stroke={s.color} strokeWidth={h === s.id ? 19 : 16} strokeDasharray={`${Math.max(0, L - (rows.length > 1 ? 3 : 0))} ${C}`} strokeDashoffset={-o} transform="rotate(-90 95 95)" style={{ opacity: h && h !== s.id ? .25 : 1 }} /> })}</g></svg>
      <div className="dc"><b>{r ? fv(r.v) : center}</b><span>{r ? r.name : label}</span></div></div>
    <div className="lgd" onMouseLeave={() => setH(null)}>{rows.map(s => <div key={s.id} className={'lg' + (h && h !== s.id ? ' dim' : '')} onMouseEnter={() => setH(s.id)}>
      <i style={{ ['--c' as string]: s.color }} /><span>{s.name}</span><b>{fv(s.v)}</b><em>{pc(s.v)}</em></div>)}</div></div>
}
