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
  return <div className="pomo"><div className="pl">Foco</div><div className="pq">{t}</div>
    <div className="pbr"><i style={{ width: `${100 - left / tot * 100}%` }} /></div>
    <div className="pcs">{[[1500, '25'], [3000, '50'], [300, 'Pausa']].map(([s, l]) => <button key={l} className={'btn' + (tot === s ? ' on' : '')} onClick={() => pick(s as number)}>{l}</button>)}</div>
    <div className="pas"><button className="btn pri" onClick={() => setRun(!run)}>{run ? 'Pausar' : 'Iniciar'}</button><button className="btn" onClick={() => pick(tot)}>Repor</button></div></div>
}
