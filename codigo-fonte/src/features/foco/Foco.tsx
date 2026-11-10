import { useEffect, useState } from 'react'
import { useT } from '../../lib/i18n/useT'
export function Foco() {
  const { t: tt } = useT()
  const [tot, setTot] = useState(1500), [left, setLeft] = useState(1500), [run, setRun] = useState(false)
  useEffect(() => {
    if (!run) return
    const id = setInterval(() => setLeft(l => { if (l <= 1) { setRun(false); return 0 } return l - 1 }), 1000)
    return () => clearInterval(id)
  }, [run])
  const pick = (s: number) => { setTot(s); setLeft(s); setRun(false) }
  const t = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
  useEffect(() => { document.title = run ? `${t} · Syncro` : 'Syncro' }, [run, t])
  // The orb breathes while idle, pulses while running, bounces when time is up and turns slate for a break.
  return <div className="pomo" data-state={left === 0 ? 'done' : run ? 'run' : 'idle'} data-break={tot === 300 || undefined}><div className="pl">{tt('app.focus.title')}</div>
    <div className="pq-row"><span className="orb" aria-hidden="true"><i /><i /></span><div className="pq">{t}</div></div>
    <div className="pbr"><i style={{ width: `${100 - left / tot * 100}%` }} /></div>
    <div className="pcs">{[[1500, '25'], [3000, '50'], [300, tt('app.focus.break')]].map(([s, l]) => <button key={s} className={'btn' + (tot === s ? ' on' : '')} onClick={() => pick(s as number)}>{l}</button>)}</div>
    <div className="pas"><button className="btn pri" onClick={() => setRun(!run)}>{tt(run ? 'app.focus.pause' : 'app.focus.start')}</button><button className="btn" onClick={() => pick(tot)}>{tt('app.focus.reset')}</button></div></div>
}
