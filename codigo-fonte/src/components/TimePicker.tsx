import { useLayoutEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { Picker, moveFocus } from './Picker'
import { useT } from '../lib/i18n/useT'

const p2 = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => p2(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => p2(i))
// The wheel repeats its options and jumps by whole turns near either end, so scrolling never reaches a limit.
const COPIES = 5, MIDDLE = 2, JUMP = 2

function TimeColumn({ label, options, selected, initial, onPick }: { label: string; options: string[]; selected: string; initial?: boolean; onPick: (value: string) => void }) {
  const focused = options.includes(selected) ? selected : options[0]
  const n = options.length, column = useRef<HTMLDivElement>(null)
  const items = () => [...(column.current?.children ?? [])] as HTMLElement[]
  useLayoutEffect(() => {
    const col = column.current, el = items()[MIDDLE * n + options.indexOf(focused)]
    if (col && el) col.scrollTop = el.offsetTop - (col.clientHeight - el.offsetHeight) / 2
  }, []) // eslint-disable-line
  const keepTurning = () => {
    const col = column.current, all = items()
    if (!col || all.length < COPIES * n) return
    const turn = all[n].offsetTop - all[0].offsetTop
    const shift = col.scrollTop < turn ? JUMP : col.scrollTop + col.clientHeight > turn * (COPIES - 1) ? -JUMP : 0
    if (!shift) return
    const active = all.indexOf(document.activeElement as HTMLElement)
    col.scrollTop += shift * turn
    // The same option a few turns away, so the arrow keys carry on from it.
    if (active >= 0) all[active + shift * n]?.focus({ preventScroll: true })
  }
  return <div ref={column} className="time-col" role="group" aria-label={label} onScroll={keepTurning} onKeyDown={e => moveFocus(e, { ArrowUp: -1, ArrowDown: 1 })}>
    {Array.from({ length: COPIES }, (_, copy) => options.map(o => {
      const entry = copy === MIDDLE && o === focused
      return <button key={`${copy}-${o}`} type="button" className="pk-opt" tabIndex={entry ? 0 : -1} data-initial={(initial && entry) || undefined}
        aria-selected={o === selected} onClick={() => onPick(o)}>{o}</button>
    }))}
  </div>
}

function TimePanel({ value, required, onPick, close }: { value: string; required?: boolean; onPick: (value: string) => void; close: () => void }) {
  const { t } = useT()
  const [h, m] = value ? value.split(':') : ['', '']
  return <>
    <div className="time-cols">
      <TimeColumn label={t('common.hours')} options={HOURS} selected={h} initial onPick={v => onPick(`${v}:${m || '00'}`)} />
      <TimeColumn label={t('common.minutes')} options={MINUTES} selected={m} onPick={v => { onPick(`${h || '00'}:${v}`); close() }} />
    </div>
    {!required && value && <div className="pop-foot"><span /><button type="button" className="pop-link" onClick={() => { onPick(''); close() }}>{t('common.clear')}</button></div>}
  </>
}

/** Time picker for `HH:MM` values: choosing the hour keeps the panel open, choosing the minutes closes it. */
export function TimePicker({ value, onChange, required, className, 'aria-label': label }: { value: string; onChange: (value: string) => void; required?: boolean; 'aria-label'?: string; className?: string }) {
  return <Picker icon={<Clock size={16} aria-hidden="true" />} empty={!value} value={value} required={required} label={label} className={className}
    text={value || '--:--'} panel={close => <TimePanel value={value} required={required} onPick={onChange} close={close} />} />
}
