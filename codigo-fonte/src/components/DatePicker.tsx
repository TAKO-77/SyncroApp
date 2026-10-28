import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { DN, MN, dow, iso, parse } from '../lib/dates'
import { todayIso } from './common'
import { Picker, moveFocus } from './Picker'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
const addMonths = (s: string, n: number) => {
  const d = parse(s), day = d.getDate()
  d.setDate(1); d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return iso(d)
}
const DAY_KEYS: Record<string, (s: string) => string> = {
  ArrowLeft: s => addDays(s, -1), ArrowRight: s => addDays(s, 1), ArrowUp: s => addDays(s, -7), ArrowDown: s => addDays(s, 7),
  PageUp: s => addMonths(s, -1), PageDown: s => addMonths(s, 1),
}

type FieldProps = { value: string; onChange: (value: string) => void; min?: string; required?: boolean; 'aria-label'?: string; className?: string }

function Calendar({ value, min, required, onPick }: { value: string; min?: string; required?: boolean; onPick: (value: string) => void }) {
  const today = todayIso()
  const [cursor, setCursor] = useState(value || (min && min > today ? min : today))
  const grid = useRef<HTMLDivElement>(null)
  const fromKeyboard = useRef(false)
  useEffect(() => {
    if (fromKeyboard.current) grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
    fromKeyboard.current = false
  }, [cursor])

  const shown = parse(cursor), first = new Date(shown.getFullYear(), shown.getMonth(), 1)
  const start = addDays(iso(first), -dow(first))
  const weeks = Math.ceil((dow(first) + new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate()) / 7)
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))

  return <>
    <div className="cal-head">
      <button type="button" className="cal-nav" aria-label="Mês anterior" onClick={() => setCursor(addMonths(cursor, -1))}>‹</button>
      <strong>{MONTHS[shown.getMonth()]} {shown.getFullYear()}</strong>
      <button type="button" className="cal-nav" aria-label="Mês seguinte" onClick={() => setCursor(addMonths(cursor, 1))}>›</button>
    </div>
    <div className="cal-grid" ref={grid} onKeyDown={e => {
      const move = DAY_KEYS[e.key]
      if (!move) return
      e.preventDefault(); fromKeyboard.current = true; setCursor(move(cursor))
    }}>
      {DN.map(d => <span key={d} className="cal-wd" aria-hidden="true">{d[0]}</span>)}
      {days.map(d => {
        const date = parse(d)
        return <button key={d} type="button" tabIndex={d === cursor ? 0 : -1} data-initial={d === cursor || undefined}
          className={'pk-opt' + (date.getMonth() !== shown.getMonth() ? ' out' : '') + (d === today ? ' today' : '')}
          aria-selected={d === value} aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`}
          disabled={!!min && d < min} onClick={() => onPick(d)}>{date.getDate()}</button>
      })}
    </div>
    <div className="pop-foot">
      <button type="button" className="pop-link" disabled={!!min && today < min} onClick={() => onPick(today)}>Hoje</button>
      {!required && value && <button type="button" className="pop-link" onClick={() => onPick('')}>Limpar</button>}
    </div>
  </>
}

export function DatePicker({ value, onChange, min, required, className, 'aria-label': label }: FieldProps) {
  const date = value ? parse(value) : null
  return <Picker icon={<CalendarDays size={16} aria-hidden="true" />} empty={!date} value={value} required={required} label={label} className={className}
    text={date ? `${date.getDate()} ${MN[date.getMonth()]} ${date.getFullYear()}` : 'Escolher data'}
    panel={close => <Calendar value={value} min={min} required={required} onPick={v => { onChange(v); close() }} />} />
}

/** Month picker for `YYYY-MM` values. */
export function MonthPicker({ value, onChange, min, required, className, 'aria-label': label }: FieldProps) {
  const [y, m] = value ? value.split('-').map(Number) : [0, 0]
  return <Picker icon={<CalendarDays size={16} aria-hidden="true" />} empty={!value} value={value} required={required} label={label} className={className}
    text={value ? `${MN[m - 1]} ${y}` : 'Escolher mês'}
    panel={close => <MonthGrid value={value} min={min} required={required} onPick={v => { onChange(v); close() }} />} />
}

function MonthGrid({ value, min, required, onPick }: { value: string; min?: string; required?: boolean; onPick: (value: string) => void }) {
  const [year, setYear] = useState(Number((value || min || todayIso()).slice(0, 4)))
  const months = MN.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  const initial = months.includes(value) ? value : months.find(v => !min || v >= min)
  return <>
    <div className="cal-head">
      <button type="button" className="cal-nav" aria-label="Ano anterior" onClick={() => setYear(year - 1)}>‹</button>
      <strong>{year}</strong>
      <button type="button" className="cal-nav" aria-label="Ano seguinte" onClick={() => setYear(year + 1)}>›</button>
    </div>
    <div className="cal-months" onKeyDown={e => moveFocus(e, { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 })}>
      {months.map((v, i) => <button key={v} type="button" className="pk-opt" tabIndex={v === initial ? 0 : -1} data-initial={v === initial || undefined}
        aria-selected={v === value} aria-label={`${MONTHS[i]} de ${year}`} disabled={!!min && v < min} onClick={() => onPick(v)}>{MN[i]}</button>)}
    </div>
    {!required && value && <div className="pop-foot"><span /><button type="button" className="pop-link" onClick={() => onPick('')}>Limpar</button></div>}
  </>
}
