import { useState, type FormEvent } from 'react'
import { useStore } from '../../store/useStore'
import { dow, fmt, parse, spanMinutes } from '../../lib/dates'
import { sleepSchedule, sleepTargetDays, sleepWeek } from '../../lib/sleep'
import { Modal } from '../../components/common'
import { TimePicker } from '../../components/TimePicker'
import { useT } from '../../lib/i18n/useT'

/** Edits the sleep times of the day clicked in the Agenda, and optionally of other days. Saved only on Guardar. */
export function SleepWindow({ ds, onClose }: { ds: string; onClose: () => void }) {
  const { data, update } = useStore()
  const { t, daysLong } = useT()
  const day = dow(parse(ds))
  const [{ bed, wake }, setSchedule] = useState(() => sleepSchedule(data.sleep, day))
  const [all, setAll] = useState(false)
  const [week, setWeek] = useState(false)
  const [weekend, setWeekend] = useState(false)
  const [err, setErr] = useState('')
  const change = (field: 'bed' | 'wake', value: string) => { setErr(''); setSchedule({ bed, wake, [field]: value }) }
  const save = (ev: FormEvent) => {
    ev.preventDefault()
    if (bed === wake) { setErr(t('agenda.endDiffers')); return }
    const days = sleepTargetDays(day, { all, week, weekend })
    update(d => { d.sleep.daily = sleepWeek(d.sleep, days, { bed, wake }) })
    onClose()
  }

  return <Modal title={t('agenda.sleepTitle', { day: daysLong[day].charAt(0).toUpperCase() + daysLong[day].slice(1) })} onClose={onClose}>
    <form className="fgrid" onSubmit={save}>
      <label>{t('agenda.fStart')}<TimePicker required value={bed} onChange={value => change('bed', value)} /></label>
      <label>{t('agenda.fEnd')}<TimePicker required value={wake} onChange={value => change('wake', value)} /></label>
      {bed !== wake && <p className="w mu">{t('agenda.sleepSummary', { bed, wake, duration: fmt(spanMinutes(bed, wake)) })}</p>}
      <label className="w ck"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> {t('agenda.sleepAll')}</label>
      {day < 5
        ? <label className="w ck"><input type="checkbox" checked={all || week} disabled={all} onChange={e => setWeek(e.target.checked)} /> {t('agenda.sleepRest')}</label>
        : <label className="w ck"><input type="checkbox" checked={all || weekend} disabled={all} onChange={e => setWeekend(e.target.checked)} /> {t('agenda.sleepWeekend')}</label>}
      {err && <p className="w neg" role="alert">{err}</p>}
      <div className="acts w"><span className="sp" /><button type="button" className="btn" onClick={onClose}>{t('agenda.cancel')}</button><button className="btn pri" type="submit">{t('agenda.save')}</button></div>
    </form>
  </Modal>
}
