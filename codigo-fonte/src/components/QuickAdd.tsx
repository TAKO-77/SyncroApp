import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../store/useStore'
import { dow, parse } from '../lib/dates'
import { RLB, parseQ } from '../lib/quick'
import { uid } from './common'
import { newTask } from '../lib/tasks'
import { categoryColor } from '../lib/recurrence'
import { useToast } from '../store/toast'
import { useT } from '../lib/i18n/useT'

export function QuickAdd({ onClose, onEvent }: { onClose: () => void; onEvent: (date: string) => void }) {
  const { data, update } = useStore()
  const { t, lang, days, shortDate } = useT()
  const [v, setV] = useState(''), ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const r = parseQ(v, new Date(), lang)
  // Picks the category from words in the title, in any of the app's languages.
  const guess = (text: string) => {
    const id = /\b(ir|ida|volta|viagem|comboio|autocarro|metro|desloc\w*|trip|train|bus|commute|travel|reise|fahrt|zug|bahn|voyage|trajet)\b/i.test(text) ? 'desloc' : /gym|gin[aá]sio|treino|corrida|correr|exerc|workout|training|fitness|jogging|\bsport\b/i.test(text) ? 'exercicio' : /\b(uni|aula|aulas|faculdade|escola|class|lecture|school|unterricht|vorlesung|schule|cours|école|ecole|fac)\b/i.test(text) ? 'presencial' : /estud|tpc|study|homework|lernen|hausaufgabe|étud|etud|devoir/i.test(text) ? 'autonomo' : /projeto|c[oó]digo|programar|project|coding|projekt|programmier|projet/i.test(text) ? 'projetos' : /amig|jogo|cinema|sair|friend|game|movie|freund|spiel|kino|\bamis?\b|\bjeu\b|\bfilm\b/i.test(text) ? 'lazer' : 'rotina'
    return data.cats.some(c => c.id === id) ? id : data.cats[0]?.id ?? ''
  }
  const hint = !v ? t('quick.example') : !r ? t('quick.missingTitle') : 'task' in r ? t('quick.task', { title: r.task }) : `${r.title} · ${days[dow(parse(r.date))]} ${shortDate(r.date)} · ${r.start}–${r.end}${r.end < r.start ? ' ' + t('quick.nextDay') : ''}${r.rep !== 'none' ? ' · ' + t(RLB[r.rep]) : ''}`
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!r) return
    if ('task' in r) { update(d => { d.tasks.push(newTask(uid('t'), { t: r.task })) }); useToast.getState().show(t('quick.taskCreated')) }
    else {
      const cat = guess(r.title)
      update(d => { d.ev.push({ id: uid('e'), title: r.title, start: r.start, end: r.end, date: r.date, rep: r.rep, cat, color: categoryColor(d.cats, cat), done: {} }) })
      onEvent(r.date); useToast.getState().show(t('quick.eventCreated'))
    }
    onClose()
  }
  return <div className="ov qa" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <form className="qb" onSubmit={submit}>
      <input ref={ref} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onClose() }} placeholder={t('quick.placeholder')} aria-label={t('quick.label')} autoComplete="off" />
      <div className="qp mu">{hint}</div></form></div>
}
