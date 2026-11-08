import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/common'
import { DatePicker } from '../../components/DatePicker'
import { TimePicker } from '../../components/TimePicker'
import { Select } from '../../components/Select'
import { Glider } from '../../components/Glider'
import { LEADS, LEAD_LABELS, leadAvailable, reminderError } from '../../lib/reminderItems'
import { toStamp } from '../../lib/dates'
import { TASK_TITLE_MAX } from '../../lib/tasks'
import type { ReminderItem, ReminderLead } from '../../types'

export type ReminderFormValues = Pick<ReminderItem, 'title' | 'date' | 'time' | 'repeat' | 'lead' | 'until'>

export function ReminderForm({ initial, onSave, onDelete, onClose }: { initial: ReminderFormValues; onSave: (values: ReminderFormValues) => void; onDelete?: () => void; onClose: () => void }) {
  const [form, setForm] = useState(initial)
  const [tried, setTried] = useState(false)
  const set = (change: Partial<ReminderFormValues>) => setForm(f => ({ ...f, ...change }))
  const recurring = form.repeat !== 'none'
  const now = toStamp(new Date())
  const leads = LEADS.filter(lead => leadAvailable(form, lead, now))
  const lead: ReminderLead = leads.includes(form.lead) ? form.lead : ''
  const error = reminderError(form, now, onDelete ? initial : undefined)
  // Days already gone can't be picked, unless this reminder is already on one.
  const firstDay = onDelete && initial.date < now.slice(0, 10) ? initial.date : now.slice(0, 10)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (error) { setTried(true); return }
    onSave({ ...form, lead })
  }
  return <Modal title={onDelete ? 'Editar lembrete' : 'Novo lembrete'} onClose={onClose}>
    <form className="fgrid" onSubmit={submit} noValidate>
      <label className="w">Nome<input value={form.title} maxLength={TASK_TITLE_MAX} autoFocus={!onDelete} autoComplete="off" onChange={e => set({ title: e.target.value })} /></label>
      <div className="w reminder-field" role="group" aria-label="Tipo de aviso"><span>Tipo de aviso</span>
        <div className="seg"><button type="button" aria-pressed={!recurring} onClick={() => set({ repeat: 'none' })}>Normal</button><button type="button" aria-pressed={recurring} onClick={() => { if (!recurring) set({ repeat: 'daily' }) }}>Recorrente</button><Glider /></div>
      </div>
      {recurring && <div className="w reminder-field" role="group" aria-label="Frequência"><span>Frequência</span>
        <div className="seg"><button type="button" aria-pressed={form.repeat === 'daily'} onClick={() => set({ repeat: 'daily' })}>Diariamente</button><button type="button" aria-pressed={form.repeat === 'weekly'} onClick={() => set({ repeat: 'weekly' })}>Semanalmente</button><Glider /></div>
        {form.repeat === 'weekly' && <small className="mu">Repete no dia da semana da data de início.</small>}
      </div>}
      <label>{recurring ? 'Data de início' : 'Data'}<DatePicker value={form.date} required min={firstDay} onChange={date => set({ date })} /></label>
      <label>Hora<TimePicker value={form.time} required onChange={time => set({ time })} /></label>
      {recurring
        ? <label className="w">Dia final<DatePicker value={form.until} required min={form.date} onChange={until => set({ until })} /></label>
        : <label className="w">Aviso prévio<Select<ReminderLead> value={lead} onChange={value => set({ lead: value })} options={leads.map(value => ({ value, label: LEAD_LABELS[value] }))} /></label>}
      {tried && error && <small className="w field-error" role="alert">{error}</small>}
      <div className="acts w">{onDelete && <button type="button" className="btn dng" onClick={onDelete}>Apagar</button>}<span className="sp" /><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
    </form>
  </Modal>
}
