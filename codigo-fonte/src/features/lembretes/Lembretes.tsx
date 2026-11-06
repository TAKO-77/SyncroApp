import { useEffect, useRef, useState } from 'react'
import { todayIso, uid, useNow } from '../../components/common'
import { Glider } from '../../components/Glider'
import { MN, hm, parse } from '../../lib/dates'
import { LEAD_LABELS, applyReminderEdit, concludeReminder, occurrenceAfter, reminderStatus, reopenReminder, toStamp } from '../../lib/reminderItems'
import { dueLabel } from '../../lib/tasks'
import { useStore } from '../../store/useStore'
import type { ReminderItem } from '../../types'
import { ReminderForm, type ReminderFormValues } from './ReminderForm'

const COMPLETE_MS = 1300
const shortDay = (day: string) => { const d = parse(day); return `${d.getDate()} ${MN[d.getMonth()]}` }

export function Lembretes() {
  const { data, update } = useStore()
  const now = useNow(), nowStamp = toStamp(now), today = todayIso(), nowTime = hm(now.getHours() * 60 + now.getMinutes())
  const [pendingView, setPendingView] = useState(true)
  const [form, setForm] = useState<{ id: string | null; values: ReminderFormValues } | null>(null)
  // A reminder's last tick plays the completion animation before it leaves the list.
  const [completing, setCompleting] = useState<string[]>([])
  const timers = useRef(new Map<string, number>())
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const rows = data.reminders.map(r => ({ r, status: reminderStatus(r, nowStamp) }))
  const pending = rows.filter(x => !x.status.done).sort((a, b) => (a.status.at ?? '').localeCompare(b.status.at ?? ''))
  const done = rows.filter(x => x.status.done).sort((a, b) => (b.status.at ?? '').localeCompare(a.status.at ?? ''))
  const list = pendingView ? pending : done

  const patch = (id: string, fn: (r: ReminderItem) => void) => update(d => { const r = d.reminders.find(x => x.id === id); if (r) fn(r) })
  const conclude = (id: string) => patch(id, r => concludeReminder(r, toStamp(new Date()), todayIso()))
  const toggle = (r: ReminderItem, at: string | null, checked: boolean, row: HTMLElement | null) => {
    if (!checked) {
      const timer = timers.current.get(r.id)
      if (timer !== undefined) { clearTimeout(timer); timers.current.delete(r.id); setCompleting(c => c.filter(x => x !== r.id)) }
      else patch(r.id, reopenReminder)
      return
    }
    // A repeating reminder with occurrences left stays in the list and moves on to the next one.
    if (!at || occurrenceAfter(r, at)) { conclude(r.id); return }
    row?.style.setProperty('--tk-h', `${row.offsetHeight}px`)
    setCompleting(c => [...c, r.id])
    timers.current.set(r.id, window.setTimeout(() => { timers.current.delete(r.id); setCompleting(c => c.filter(x => x !== r.id)); conclude(r.id) }, COMPLETE_MS))
  }
  const save = (values: ReminderFormValues) => {
    if (!form) return
    const id = form.id
    update(d => {
      const target = id ? d.reminders.find(x => x.id === id) : { id: uid('r'), title: '', date: '', time: '', repeat: 'none' as const, lead: '' as const, until: '', doneUntil: '', doneAt: '' }
      if (!target) return
      applyReminderEdit(target, values, today)
      if (!id) d.reminders.push(target)
    })
    setForm(null); if (!id) setPendingView(true)
  }
  const remove = (id: string) => update(d => { d.reminders = d.reminders.filter(r => r.id !== id) })
  const label = (at: string | null, late: boolean) => {
    if (!at) return ''
    const day = at.slice(0, 10), time = at.slice(11)
    if (late || !pendingView) return `${late ? 'Atrasado · ' : ''}${shortDay(day)}, ${time}`
    return dueLabel({ due: day, dueTime: time }, today, nowTime)[0]
  }

  return <section className="page tasks-page"><div className="tasks-main">
    <div className="head2"><h2>Lembretes</h2><div className="reminder-head">
      <div className="seg"><button aria-pressed={pendingView} onClick={() => setPendingView(true)}>Pendentes {pending.length}</button><button aria-pressed={!pendingView} onClick={() => setPendingView(false)}>Concluídos {done.length}</button><Glider /></div>
      <button className="btn pri" onClick={() => setForm({ id: null, values: { title: '', date: today, time: '', repeat: 'none', lead: '', until: '' } })}>+ Novo lembrete</button>
    </div></div>
    <div className="tasks-list">{list.length ? list.map(({ r, status }) => {
      const finishing = completing.includes(r.id)
      return <div key={r.id} className="tk-group"><div className={'tk reminder' + (status.done ? ' dn' : '') + (finishing ? ' completing' : '')} style={{ ['--c' as string]: status.late ? 'var(--error)' : 'var(--ac-fill)' }}>
        <span className="rc-wrap"><input className="rc" type="checkbox" checked={status.done || finishing} aria-label="Concluído" onChange={e => toggle(r, status.at, e.target.checked, e.currentTarget.closest<HTMLElement>('.tk'))} /></span>
        <span className="tt2" onClick={() => setForm({ id: r.id, values: { title: r.title, date: r.date, time: r.time, repeat: r.repeat, lead: r.lead, until: r.until } })}><span className="tt2-text">{r.title}</span></span>
        <span className="tk-meta">
          {r.repeat !== 'none' && <small className="tm">{r.repeat === 'daily' ? 'Diário' : 'Semanal'} até {shortDay(r.until)}</small>}
          {r.lead && <small className="tm">{LEAD_LABELS[r.lead]}</small>}
          <small className={'tm' + (status.late ? ' late' : '')}>{label(status.at, status.late)}</small>
        </span>
        <button className="x" aria-label="Remover" onClick={() => remove(r.id)}>✕</button>
      </div></div>
    }) : <div className="tem">{pendingView ? 'Sem lembretes pendentes. Cria um em “Novo lembrete”.' : 'Ainda nada concluído.'}</div>}</div>
    </div>
    {form && <ReminderForm initial={form.values} onSave={save} onClose={() => setForm(null)} onDelete={form.id ? () => { remove(form.id!); setForm(null) } : undefined} />}
  </section>
}
