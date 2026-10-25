import { PALETTE } from '../lib/palette'
import { useState, type FormEvent } from 'react'
import { useStore } from '../store/useStore'
import { Modal, uid } from './common'
import type { AppData, Category } from '../types'

type CategoryList = 'cats' | 'dayCats'

const reassign: Record<CategoryList, (d: AppData, id: string, next?: Category) => void> = {
  cats: (d, id, next) => d.ev.forEach(v => {
    if (v.cat === id) { v.cat = next?.id ?? ''; v.color = next?.color }
    Object.values(v.ex ?? {}).forEach(x => { if (x.cat === id) { x.cat = next?.id; x.color = next?.color } })
  }),
  dayCats: (d, id, next) => d.days.forEach(x => { if (x.ty === id) x.ty = next?.id ?? '' }),
}

const withIcon: Record<CategoryList, boolean> = { cats: false, dayCats: true }
const firstSymbol = (v: string) => [...new Intl.Segmenter().segment(v.trim())][0]?.segment ?? ''

interface Props { list: CategoryList; title: string; description: string; onClose: () => void }

export function CategoryManager({ list, title, description, onClose }: Props) {
  const { data, update } = useStore()
  const [nn, setNn] = useState(''), [nc, setNc] = useState<string>(PALETTE.gold), [ni, setNi] = useState('📌')
  const icons = withIcon[list]
  const patch = (id: string, k: 'name' | 'color' | 'icon', v: string) => {
    if (k === 'name' && !v.trim()) return
    update(d => { const c = d[list].find(x => x.id === id); if (!c) return; if (k === 'icon') c.icon = firstSymbol(v) || undefined; else c[k] = k === 'name' ? v.trim() : v })
  }
  const del = (id: string) => update(d => {
    const next = d[list].find(c => c.id !== id)
    d[list] = d[list].filter(c => c.id !== id)
    reassign[list](d, id, next)
  })
  const add = (e: FormEvent) => { e.preventDefault(); const name = nn.trim(); if (!name) return; update(d => { d[list].push({ id: uid('cat'), name, color: nc, ...(icons && firstSymbol(ni) ? { icon: firstSymbol(ni) } : {}) }) }); setNn('') }
  return <Modal title={title} onClose={onClose}>
    <p className="mu">{description}</p>
    {!data[list].length && <p className="mu">Ainda não há categorias.</p>}
    {data[list].map(c => <div key={c.id + c.name + c.color + (c.icon ?? '')} className={'catrow' + (icons ? ' with-icon' : '')}>
      {icons && <input className="cat-icon" defaultValue={c.icon ?? ''} maxLength={16} aria-label="Emoji da categoria" onBlur={e => { if (firstSymbol(e.target.value) !== (c.icon ?? '')) patch(c.id, 'icon', e.target.value) }} />}
      <input defaultValue={c.name} maxLength={40} aria-label="Nome da categoria" onBlur={e => { if (e.target.value.trim() !== c.name) patch(c.id, 'name', e.target.value) }} />
      <input type="color" defaultValue={c.color} aria-label="Cor da categoria" onBlur={e => { if (e.target.value !== c.color) patch(c.id, 'color', e.target.value) }} />
      <button className="btn dng" type="button" onClick={() => del(c.id)}>Eliminar</button></div>)}
    <form className={'catrow' + (icons ? ' with-icon' : '')} onSubmit={add}>{icons && <input className="cat-icon" value={ni} maxLength={16} aria-label="Emoji da nova categoria" onChange={e => setNi(e.target.value)} />}<input value={nn} maxLength={40} placeholder="Nome da categoria" required autoComplete="off" onChange={e => setNn(e.target.value)} />
      <input type="color" value={nc} aria-label="Cor da nova categoria" onChange={e => setNc(e.target.value)} /><button className="btn pri" type="submit">Adicionar</button></form>
    <div className="acts"><span className="sp" /><button className="btn" onClick={onClose}>Fechar</button></div>
  </Modal>
}
