import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { sleepSchedule } from '../../lib/sleep'
import { mins } from '../../lib/dates'
import { TimePicker } from '../../components/TimePicker'
import { Select } from '../../components/Select'
import { useIsPhone } from '../../components/common'

const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const GROUPS = [{ name: 'Dias úteis', days: [0, 1, 2, 3, 4] }, { name: 'Fim de semana', days: [5, 6] }]
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
type Field = 'bed' | 'wake'

const duration = (bed: string, wake: string) => {
  const total = (mins(wake) - mins(bed) + 1440) % 1440
  return total ? `${Math.floor(total / 60)}h${total % 60 ? ` ${String(total % 60).padStart(2, '0')}` : ''}` : '—'
}

/** Sleep times per weekday. Phones show them grouped, with each day available on demand. */
export function SleepSettings() {
  const { data, update } = useStore()
  const phone = useIsPhone()
  const [syncDay, setSyncDay] = useState(0)
  const [msg, setMsg] = useState('')
  const setTime = (days: number[], field: Field, value: string) => {
    if (!TIME.test(value)) return
    update(d => { const daily = WEEKDAYS.map((_, i) => ({ ...sleepSchedule(d.sleep, i) })); days.forEach(i => { daily[i][field] = value }); d.sleep.daily = daily })
  }
  /** The time shared by these days, or empty when they differ. */
  const shared = (days: number[], field: Field) => {
    const values = days.map(i => sleepSchedule(data.sleep, i)[field])
    return values.every(v => v === values[0]) ? values[0] : ''
  }

  const eachDay = <>
    <div className="sleep-week">
      <div className="sleep-row sleep-head" aria-hidden="true"><span>Dia</span><span>Deito-me</span><span>Acordo</span><span>Duração</span></div>
      {WEEKDAYS.map((day, index) => {
        const schedule = sleepSchedule(data.sleep, index)
        return <div className={`sleep-row${index >= 5 ? ' weekend' : ''}`} key={day}>
          <strong title={day}>{day.slice(0, 3)}</strong>
          <TimePicker required aria-label={`Deito-me — ${day}`} value={schedule.bed} onChange={value => setTime([index], 'bed', value)} />
          <TimePicker required aria-label={`Acordo — ${day}`} value={schedule.wake} onChange={value => setTime([index], 'wake', value)} />
          <span className="sleep-duration">{duration(schedule.bed, schedule.wake)}</span>
        </div>
      })}
    </div>
    <div className="row sleep-sync">
      <label>Usar o horário de<Select value={syncDay} onChange={setSyncDay} options={WEEKDAYS.map((day, index) => ({ value: index, label: day }))} /></label>
      <button type="button" className="btn" onClick={() => {
        update(d => { const schedule = sleepSchedule(d.sleep, syncDay); d.sleep.daily = WEEKDAYS.map(() => ({ ...schedule })) })
        setMsg('Horário de sono aplicado a todos os dias.')
      }}>Aplicar a todos os dias</button>
    </div>
    <p className="mu" role="status">{msg}</p>
  </>

  return <>
    <h2 className="sub">Sono</h2>
    <p className="mu">Define a hora de deitar e de acordar. Fica guardado automaticamente.</p>
    {phone ? <>
      <div className="sleep-week">
        {GROUPS.map(({ name, days }) => {
          const bed = shared(days, 'bed'), wake = shared(days, 'wake')
          return <div className="sleep-group" key={name}>
            <div className="sleep-group-head"><strong>{name}</strong>{bed && wake && <span className="sleep-duration">{duration(bed, wake)}</span>}</div>
            <div className="sleep-group-fields">
              <label>Deito-me<TimePicker required aria-label={`Deito-me — ${name}`} value={bed} onChange={value => setTime(days, 'bed', value)} /></label>
              <label>Acordo<TimePicker required aria-label={`Acordo — ${name}`} value={wake} onChange={value => setTime(days, 'wake', value)} /></label>
            </div>
            {(!bed || !wake) && <small>Estes dias têm horas diferentes. Escolher aqui aplica a todos.</small>}
          </div>
        })}
      </div>
      <details className="sleep-more"><summary>Ajustar dia a dia</summary>{eachDay}</details>
    </> : eachDay}
  </>
}
