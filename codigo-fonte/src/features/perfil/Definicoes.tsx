import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { parseAppData } from '../../lib/schema'

export function Definicoes() {
  const { data, replace, sidebarAutoOpen, setSidebarAutoOpen, theme, setTheme } = useStore()
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

  return <section className="page narrow">
    <h2>Definições</h2>
    <h2 className="sub">Aparência</h2>
    <label className="ck"><input type="checkbox" checked={theme === 'light'} onChange={e => setTheme(e.target.checked ? 'light' : 'dark')} /> Modo claro</label>
    <h2 className="sub">Barra lateral</h2>
    <label className="ck"><input type="checkbox" checked={sidebarAutoOpen} onChange={e => setSidebarAutoOpen(e.target.checked)} aria-describedby="sidebar-preference-description" /> Abrir automaticamente ao passar o rato</label>
    <p id="sidebar-preference-description" className="mu">{sidebarAutoOpen ? 'Ativo — a barra abre automaticamente ao passar o rato.' : 'Desativado — usa os ícones para mudar de aba ou o botão no topo da barra para abrir e fechar manualmente.'}</p>
    <h2 className="sub">Dados e cópia de segurança</h2>
    <div className="row">
      <button className="btn" onClick={exportar}>Exportar</button>
      <button className="btn" onClick={() => file.current?.click()}>Importar ficheiro</button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void importar(e.target.files?.[0]); e.target.value = '' }} />
    </div>
    <p className="mu" role="status">{msg}</p>
  </section>
}
