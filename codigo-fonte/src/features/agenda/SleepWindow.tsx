import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { dow, fmt, mins, parse } from '../../lib/dates'
import { sleepSchedule, sleepTargetDays, sleepWeek } from '../../lib/sleep'
import { Modal } from '../../components/common'
import { TimePicker } from '../../components/TimePicker'

const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

/** Edits the sleep times of the day clicked in the Agenda, and optionally of other days. Saved only on Guardar. */
export function SleepWindow({ ds, onClose }: { ds: string; onClose: () => void }) {
  const { data, update } = useStore()
  const day = dow(parse(ds))
  const [{ bed, wake }, setSchedule] = useState(() => sleepSchedule(data.sleep, day))
  const [all, setAll] = useState(false)
  const [week, setWeek] = useState(false)
  const [weekend, setWeekend] = useState(false)
  const [err, setErr] = useState('')
  const change = (field: 'bed' | 'wake', value: string) => { setErr(''); setSchedule({ bed, wake, [field]: value }) }
  const save = (ev: FormEvent) => {
    ev.preventDefault()
    if (bed === wake) { setErr('O fim tem de ser diferente do início'); return }
    const days = sleepTargetDays(day, { all, week, weekend })
    update(d => { d.sleep.daily = sleepWeek(d.sleep, days, { bed, wake }) })
    onClose()
  }

  return <Modal title={`Sono: ${WEEKDAYS[day]}`} onClose={onClose}>
    <form className="fgrid" onSubmit={save}>
      <label>Início<TimePicker required value={bed} onChange={value => change('bed', value)} /></label>
      <label>Fim<TimePicker required value={wake} onChange={value => change('wake', value)} /></label>
      {bed !== wake && <p className="w mu">Neste dia, dormes das {bed} às {wake}, ({fmt((mins(wake) - mins(bed) + 1440) % 1440)}).</p>}
      <label className="w ck"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Todos os dias</label>
      {day < 5
        ? <label className="w ck"><input type="checkbox" checked={all || week} disabled={all} onChange={e => setWeek(e.target.checked)} /> Restantes dias da semana</label>
        : <label className="w ck"><input type="checkbox" checked={all || weekend} disabled={all} onChange={e => setWeekend(e.target.checked)} /> Fim de semana</label>}
      {err && <p className="w neg" role="alert">{err}</p>}
      <div className="acts w"><span className="sp" /><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn pri" type="submit">Guardar</button></div>
    </form>
  </Modal>
}
