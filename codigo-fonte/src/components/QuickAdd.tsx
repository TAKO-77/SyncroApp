import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../store/useStore'
import { DN, MN, dow, parse } from '../lib/dates'
import { RLB, parseQ } from '../lib/quick'
import { uid } from './common'
import { useToast } from '../store/toast'

export function QuickAdd({ onClose, onEvent }: { onClose: () => void; onEvent: (date: string) => void }) {
  const { data, update } = useStore()
  const [v, setV] = useState(''), ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const r = parseQ(v)
  const guess = (t: string) => {
    const id = /\b(ir|ida|volta|viagem|comboio|autocarro|metro|desloc\w*)\b/i.test(t) ? 'desloc' : /gym|gin[aá]sio|treino|corrida|correr|exerc/i.test(t) ? 'exercicio' : /\b(uni|aula|aulas|faculdade|escola)\b/i.test(t) ? 'presencial' : /estud|tpc/i.test(t) ? 'autonomo' : /projeto|c[oó]digo|programar/i.test(t) ? 'projetos' : /amig|jogo|cinema|sair/i.test(t) ? 'lazer' : 'rotina'
    return data.cats.some(c => c.id === id) ? id : data.cats[0]?.id ?? ''
  }
  const hint = !v ? 'Ex.: Treino sex 18h 1h30 semanal  ·  t: Comprar café' : !r ? 'Falta o título' : 'task' in r ? 'Tarefa · ' + r.task : `${r.title} · ${DN[dow(parse(r.date))]} ${parse(r.date).getDate()} ${MN[parse(r.date).getMonth()]} · ${r.start}–${r.end}${r.rep !== 'none' ? ' · ' + RLB[r.rep] : ''}`
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!r) return
    if ('task' in r) { update(d => { d.tasks.push({ id: uid('t'), t: r.task, due: '', p: 'media', d: false }) }); useToast.getState().show('Tarefa criada') }
    else {
      const cat = guess(r.title)
      update(d => { d.ev.push({ id: uid('e'), title: r.title, start: r.start, end: r.end, date: r.date, rep: r.rep, cat, color: d.cats.find(c => c.id === cat)?.color, done: {} }) })
      onEvent(r.date); useToast.getState().show('Evento criado')
    }
    onClose()
  }
  return <div className="ov qa" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <form className="qb" onSubmit={submit}>
      <input ref={ref} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onClose() }} placeholder="Reunião amanhã 14:30 1h   ou   t: tarefa" aria-label="Adição rápida" autoComplete="off" />
      <div className="qp mu">{hint}</div></form></div>
}
