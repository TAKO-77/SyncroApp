import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { Modal, uid } from '../../components/common'

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data, update } = useStore()
  const [nn, setNn] = useState(''), [nc, setNc] = useState('#d2bd62')
  const patch = (id: string, k: 'name' | 'color', v: string) => {
    if (k === 'name' && !v.trim()) return
    update(d => { const c = d.cats.find(x => x.id === id); if (c) c[k] = k === 'name' ? v.trim() : v })
  }
  const del = (id: string) => update(d => {
    const next = d.cats.find(c => c.id !== id)
    d.cats = d.cats.filter(c => c.id !== id)
    d.ev.forEach(v => {
      if (v.cat === id) { v.cat = next?.id ?? ''; v.color = next?.color }
      Object.values(v.ex ?? {}).forEach(x => { if (x.cat === id) { x.cat = next?.id; x.color = next?.color } })
    })
  })
  const add = (e: FormEvent) => { e.preventDefault(); const name = nn.trim(); if (!name) return; update(d => { d.cats.push({ id: uid('cat'), name, color: nc }) }); setNn('') }
  return <Modal title="Categorias da Agenda" onClose={onClose}>
    <p className="mu">Define o nome e a cor usadas nos eventos.</p>
    {data.cats.map(c => <div key={c.id + c.name + c.color} className="catrow">
      <input defaultValue={c.name} maxLength={40} aria-label="Nome da categoria" onBlur={e => { if (e.target.value.trim() !== c.name) patch(c.id, 'name', e.target.value) }} />
      <input type="color" defaultValue={c.color} aria-label="Cor da categoria" onBlur={e => { if (e.target.value !== c.color) patch(c.id, 'color', e.target.value) }} />
      <button className="btn dng" type="button" onClick={() => del(c.id)}>Eliminar</button></div>)}
    <form className="catrow" onSubmit={add}><input value={nn} maxLength={40} placeholder="Nome da categoria" required autoComplete="off" onChange={e => setNn(e.target.value)} />
      <input type="color" value={nc} aria-label="Cor da nova categoria" onChange={e => setNc(e.target.value)} /><button className="btn pri" type="submit">Adicionar</button></form>
    <div className="acts"><span className="sp" /><button className="btn" onClick={onClose}>Fechar</button></div>
  </Modal>
}
