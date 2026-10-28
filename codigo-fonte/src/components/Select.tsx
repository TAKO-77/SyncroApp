import { ChevronDown, Check } from 'lucide-react'
import { Picker, moveFocus } from './Picker'

export interface SelectOption<T> { value: T; label: string; hint?: string; color?: string }

/** Themed replacement for `<select>`: a field that opens a list of options in a popover. */
export function Select<T extends string | number>({ value, options, onChange, className, 'aria-label': label }: {
  value: T; options: SelectOption<T>[]; onChange: (value: T) => void; className?: string; 'aria-label'?: string
}) {
  const current = options.find(o => o.value === value)
  const initial = current ?? options[0]
  return <Picker className={'sel' + (className ? ' ' + className : '')} label={label} matchWidth value={String(value)} empty={!current}
    icon={current?.color ? <span className="sel-dot" style={{ ['--c' as string]: current.color }} aria-hidden="true" /> : undefined}
    after={<ChevronDown className="sel-chevron" size={16} aria-hidden="true" />}
    text={current?.label ?? 'Escolher'}
    panel={close => <div className="sel-list" role="listbox" aria-label={label}
      onKeyDown={e => moveFocus(e, { ArrowUp: -1, ArrowDown: 1, Home: -999, End: 999 })}>
      {options.map(o => <button key={String(o.value)} type="button" role="option" className="sel-opt" aria-selected={o.value === value}
        tabIndex={o === initial ? 0 : -1} data-initial={o === initial || undefined} onClick={() => { onChange(o.value); close() }}>
        {o.color && <span className="sel-dot" style={{ ['--c' as string]: o.color }} aria-hidden="true" />}
        <span className="sel-text">{o.label}{o.hint && <small>{o.hint}</small>}</span>
        {o.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>} />
}
