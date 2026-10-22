import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { parseAppData } from '../../lib/schema'
import { Dashboard } from './Dashboard'

export function Perfil() {
  const { data, update, replace } = useStore()
  const [name, setName] = useState(data.name ?? '')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const exportar = () => {
    const txt = JSON.stringify({ app: 'syncro', v: 1, exported: new Date().toISOString(), data }, null, 1)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }))
    a.download = `syncro-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setMsg(`Exportado: ${data.ev.length} eventos, ${data.tasks.length} tarefas.`)
  }
  const importar = async (f?: File) => {
    if (!f) return
    try {
      const d = parseAppData(JSON.parse(await f.text()))
      if (!d) throw new Error()
      replace(d); setMsg('Dados importados.')
    } catch { setMsg('Ficheiro inválido.') }
  }

  return (
    <section className="page narrow">
      <h2>Perfil</h2>
      <form className="row" onSubmit={e => { e.preventDefault(); update(d => { d.name = name.trim() }); setMsg('Guardado') }}>
        <label>Nome<input value={name} maxLength={24} onChange={e => setName(e.target.value)} required /></label>
        <button className="btn pri" type="submit">Guardar</button>
      </form>
      <h2 className="sub">Sono</h2>
      <div className="row">
        <label>Deito-me<input type="time" value={data.sleep.bed} onChange={e => update(d => { d.sleep.bed = e.target.value || d.sleep.bed })} /></label>
        <label>Acordo<input type="time" value={data.sleep.wake} onChange={e => update(d => { d.sleep.wake = e.target.value || d.sleep.wake })} /></label>
      </div>
      <label className="ck"><input type="checkbox" checked={data.sleep.wk} onChange={e => update(d => { d.sleep.wk = e.target.checked })} /> Horário diferente ao fim de semana</label>
      {data.sleep.wk && <div className="row">
        <label>Deito-me (sáb e dom)<input type="time" value={data.sleep.bed2} onChange={e => update(d => { d.sleep.bed2 = e.target.value || d.sleep.bed2 })} /></label>
        <label>Acordo (sáb e dom)<input type="time" value={data.sleep.wake2} onChange={e => update(d => { d.sleep.wake2 = e.target.value || d.sleep.wake2 })} /></label>
      </div>}
      <h2 className="sub">Onde gasto o tempo</h2>
      <Dashboard />
      <h2 className="sub">Dados e cópia de segurança</h2>
      <div className="row">
        <button className="btn" onClick={exportar}>Exportar</button>
        <button className="btn" onClick={() => file.current?.click()}>Importar ficheiro</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void importar(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="mu" role="status">{msg}</p>
    </section>
  )
}
