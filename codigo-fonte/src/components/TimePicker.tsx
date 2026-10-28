import { useLayoutEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { Picker, moveFocus } from './Picker'

const p2 = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => p2(i))
const MINUTES = Array.from({ length: 12 }, (_, i) => p2(i * 5))

function TimeColumn({ label, options, selected, initial, onPick }: { label: string; options: string[]; selected: string; initial?: boolean; onPick: (value: string) => void }) {
  const focused = options.includes(selected) ? selected : options[0]
  return <div className="time-col" role="group" aria-label={label} onKeyDown={e => moveFocus(e, { ArrowUp: -1, ArrowDown: 1 })}>
    {options.map(o => <button key={o} type="button" className="pk-opt" tabIndex={o === focused ? 0 : -1} data-initial={(initial && o === focused) || undefined}
      aria-selected={o === selected} onClick={() => onPick(o)}>{o}</button>)}
  </div>
}

function TimePanel({ value, required, onPick, close }: { value: string; required?: boolean; onPick: (value: string) => void; close: () => void }) {
  const [h, m] = value ? value.split(':') : ['', '']
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES
  const cols = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    cols.current?.querySelectorAll<HTMLElement>('.time-col').forEach(col => {
      const el = col.querySelector<HTMLElement>('[aria-selected=true]')
      if (el) col.scrollTop = el.offsetTop - (col.clientHeight - el.offsetHeight) / 2
    })
  }, [])
  return <>
    <div className="time-cols" ref={cols}>
      <TimeColumn label="Horas" options={HOURS} selected={h} initial onPick={v => onPick(`${v}:${m || '00'}`)} />
      <TimeColumn label="Minutos" options={minutes} selected={m} onPick={v => { onPick(`${h || '00'}:${v}`); close() }} />
    </div>
    {!required && value && <div className="pop-foot"><span /><button type="button" className="pop-link" onClick={() => { onPick(''); close() }}>Limpar</button></div>}
  </>
}

/** Time picker for `HH:MM` values: choosing the hour keeps the panel open, choosing the minutes closes it. */
export function TimePicker({ value, onChange, required, className, 'aria-label': label }: { value: string; onChange: (value: string) => void; required?: boolean; 'aria-label'?: string; className?: string }) {
  return <Picker icon={<Clock size={16} aria-hidden="true" />} empty={!value} value={value} required={required} label={label} className={className}
    text={value || '--:--'} panel={close => <TimePanel value={value} required={required} onPick={onChange} close={close} />} />
}
