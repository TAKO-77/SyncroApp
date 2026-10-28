import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

/** Floating panel anchored to a trigger; rendered in `body` so modals and `overflow:hidden` cards don't clip it. */
function Popover({ anchor, matchWidth, onClose, children }: { anchor: RefObject<HTMLElement>; matchWidth?: boolean; onClose: (refocus: boolean) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth?: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect(), panel = ref.current
      if (!a || !panel) return
      const w = Math.max(panel.offsetWidth, matchWidth ? a.width : 0), h = panel.offsetHeight, gap = 6
      const below = a.bottom + gap + h <= innerHeight - 8 || a.top - gap - h < 8
      const top = below ? a.bottom + gap : a.top - gap - h
      setPos({ top: Math.max(8, Math.min(top, innerHeight - h - 8)), left: Math.max(8, Math.min(a.left, innerWidth - w - 8)), minWidth: matchWidth ? a.width : undefined })
    }
    place()
    addEventListener('resize', place); addEventListener('scroll', place, true)
    return () => { removeEventListener('resize', place); removeEventListener('scroll', place, true) }
  }, [anchor, matchWidth])

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-initial]')?.focus()
    const outside = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose(false)
    }
    addEventListener('pointerdown', outside, true)
    return () => removeEventListener('pointerdown', outside, true)
  }, [anchor, onClose])

  return createPortal(<div ref={ref} className="pop" role="dialog" tabIndex={-1} style={pos ?? { visibility: 'hidden' }}
    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') onClose(true) }}
    onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) onClose(false) }}>
    {children}
  </div>, document.body)
}

/** Field trigger shared by the date, month, time and option pickers. `panel` receives `close` to dismiss after a choice. */
export function Picker({ icon, after, text, empty, value, required, label, className, matchWidth, panel }: {
  icon?: ReactNode; after?: ReactNode; text: string; empty: boolean; value: string; required?: boolean; label?: string; className?: string; matchWidth?: boolean
  panel: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const dismiss = useCallback((refocus: boolean) => { setOpen(false); if (refocus) anchor.current?.focus() }, [])
  const close = useCallback(() => dismiss(true), [dismiss])
  return <span className={'pk' + (className ? ' ' + className : '')}>
    <button ref={anchor} type="button" className={'pk-btn' + (empty ? ' empty' : '')} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      {icon}<span>{text}</span>{after}
    </button>
    {required && <input className="pk-req" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} onFocus={() => anchor.current?.focus()} />}
    {open && <Popover anchor={anchor} matchWidth={matchWidth} onClose={dismiss}>{panel(close)}</Popover>}
  </span>
}

/** Moves focus between sibling options with the arrow keys (roving tabindex). */
export function moveFocus(e: React.KeyboardEvent<HTMLElement>, step: Record<string, number>) {
  const delta = step[e.key]
  if (!delta) return
  const options = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const i = options.indexOf(document.activeElement as HTMLButtonElement)
  const next = options[Math.max(0, Math.min(options.length - 1, i + delta))]
  if (next) { e.preventDefault(); next.focus() }
}
