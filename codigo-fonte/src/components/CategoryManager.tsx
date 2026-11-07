import { PALETTE } from '../lib/palette'
import { Fragment, useState, type FormEvent } from 'react'
import { DAY_ICONS, DayIcon, dayIconKey } from './DayIcon'
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

/** A row of icons to choose from, shown under the category being edited. */
function IconPicker({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  return <div className="icon-grid" role="listbox" aria-label="Ícone da categoria">
    {DAY_ICONS.map(({ key, label, Icon }) => <button key={key} type="button" role="option" aria-selected={value === key} title={label} aria-label={label} onClick={() => onPick(key)}><Icon size={16} strokeWidth={1.5} aria-hidden="true" /></button>)}
  </div>
}

interface Props { list: CategoryList; title: string; description: string; onClose: () => void }

export function CategoryManager({ list, title, description, onClose }: Props) {
  const { data, update } = useStore()
  const [nn, setNn] = useState(''), [nc, setNc] = useState<string>(PALETTE.gold), [ni, setNi] = useState('pin')
  const [picking, setPicking] = useState<string | null>(null)
  const icons = withIcon[list]
  const patch = (id: string, k: 'name' | 'color' | 'icon', v: string) => {
    if (k === 'name' && !v.trim()) return
    update(d => { const c = d[list].find(x => x.id === id); if (!c) return; c[k] = k === 'name' ? v.trim() : v })
  }
  const iconButton = (id: string, value?: string) => <button className="cat-icon" type="button" aria-label="Escolher ícone" aria-expanded={picking === id} onClick={() => setPicking(p => p === id ? null : id)}><DayIcon icon={value} size={18} /></button>
  const del = (id: string) => update(d => {
    const next = d[list].find(c => c.id !== id)
    d[list] = d[list].filter(c => c.id !== id)
    reassign[list](d, id, next)
  })
  const add = (e: FormEvent) => { e.preventDefault(); const name = nn.trim(); if (!name) return; update(d => { d[list].push({ id: uid('cat'), name, color: nc, ...(icons ? { icon: ni } : {}) }) }); setNn(''); setPicking(null) }
  return <Modal title={title} onClose={onClose}>
    <p className="mu">{description}</p>
    {!data[list].length && <p className="mu">Ainda não há categorias.</p>}
    {data[list].map(c => <Fragment key={c.id + c.name + c.color}><div className={'catrow' + (icons ? ' with-icon' : '')}>
      {icons && iconButton(c.id, c.icon)}
      <input defaultValue={c.name} maxLength={40} aria-label="Nome da categoria" onBlur={e => { if (e.target.value.trim() !== c.name) patch(c.id, 'name', e.target.value) }} />
      <input type="color" defaultValue={c.color} aria-label="Cor da categoria" onBlur={e => { if (e.target.value !== c.color) patch(c.id, 'color', e.target.value) }} />
      <button className="btn dng" type="button" onClick={() => del(c.id)}>Eliminar</button></div>
      {picking === c.id && <IconPicker value={dayIconKey(c.icon)} onPick={key => { patch(c.id, 'icon', key); setPicking(null) }} />}</Fragment>)}
    <form className={'catrow' + (icons ? ' with-icon' : '')} onSubmit={add}>{icons && iconButton('new', ni)}<input value={nn} maxLength={40} placeholder="Nome da categoria" required autoComplete="off" onChange={e => setNn(e.target.value)} />
      <input type="color" value={nc} aria-label="Cor da nova categoria" onChange={e => setNc(e.target.value)} /><button className="btn pri" type="submit">Adicionar</button></form>
    {picking === 'new' && <IconPicker value={ni} onPick={key => { setNi(key); setPicking(null) }} />}
    <div className="acts"><span className="sp" /><button className="btn" onClick={onClose}>Fechar</button></div>
  </Modal>
}
