import { useEffect, useState } from 'react'
export function Foco() {
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
  return <div className="pomo" data-state={left === 0 ? 'done' : run ? 'run' : 'idle'} data-break={tot === 300 || undefined}><div className="pl">Foco</div>
    <div className="pq-row"><span className="orb" aria-hidden="true"><i /><i /></span><div className="pq">{t}</div></div>
    <div className="pbr"><i style={{ width: `${100 - left / tot * 100}%` }} /></div>
    <div className="pcs">{[[1500, '25'], [3000, '50'], [300, 'Pausa']].map(([s, l]) => <button key={l} className={'btn' + (tot === s ? ' on' : '')} onClick={() => pick(s as number)}>{l}</button>)}</div>
    <div className="pas"><button className="btn pri" onClick={() => setRun(!run)}>{run ? 'Pausar' : 'Iniciar'}</button><button className="btn" onClick={() => pick(tot)}>Repor</button></div></div>
}
