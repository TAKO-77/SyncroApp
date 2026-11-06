import { useEffect, useRef, useState, type ReactNode } from 'react'
import { iso } from '../lib/dates'
export const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
export const todayIso = () => iso(new Date())
export function useNow(ms = 30000) {
  const [n, setN] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setN(new Date()), ms); return () => clearInterval(id) }, [ms])
  return n
}
const PHONE_QUERY = '(max-width:760px)'
/** True in the phone layout, using the same breakpoint as `styles.css`. */
export function useIsPhone() {
  const [phone, setPhone] = useState(() => matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const query = matchMedia(PHONE_QUERY), onChange = () => setPhone(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return phone
}
const SCROLL_STEP = 60, SCROLL_SPEED = 1100, SCROLL_RESPONSE = 14, SCROLL_STOP = 8
/** Arrow keys belong to the app unless a key combination is held, the user is typing, or a dialog or picker is open. */
function arrowKeyIsFree(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false
  const target = e.target as HTMLElement | null
  if (target?.closest?.('input:not([type=checkbox]),textarea,select,[contenteditable="true"]')) return false
  return !document.querySelector('.ov,.pop,[role=dialog],[role=alertdialog]')
}
/**
 * The up and down arrow keys scroll the Agenda's timetable when it scrolls by itself, and otherwise the page.
 * The speed eases towards the target while a key is held and back to zero after it is released.
 */
export function useArrowScroll() {
  useEffect(() => {
    const scrollBox = () => {
      const timetable = document.querySelector<HTMLElement>('.tt')
      return timetable && timetable.scrollHeight > timetable.clientHeight ? timetable : document.scrollingElement
    }
    let key = '', target = 0, speed = 0, carry = 0, last = 0, frame = 0
    const tick = (time: number) => {
      const seconds = Math.min((time - last) / 1000, 0.05)
      last = time
      speed += (target - speed) * Math.min(1, seconds * SCROLL_RESPONSE)
      if (!target && Math.abs(speed) < SCROLL_STOP) { speed = 0; carry = 0; frame = 0; return }
      carry += speed * seconds
      const whole = Math.trunc(carry)
      if (whole) { scrollBox()?.scrollBy(0, whole); carry -= whole }
      frame = requestAnimationFrame(tick)
    }
    const release = () => { key = ''; target = 0 }
    const onDown = (e: KeyboardEvent) => {
      const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      if (!step || !arrowKeyIsFree(e)) return
      e.preventDefault()
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { scrollBox()?.scrollBy(0, step * SCROLL_STEP); return }
      key = e.key
      target = step * SCROLL_SPEED
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick) }
    }
    const onUp = (e: KeyboardEvent) => { if (e.key === key) release() }
    addEventListener('keydown', onDown)
    addEventListener('keyup', onUp)
    addEventListener('blur', release)
    return () => {
      removeEventListener('keydown', onDown)
      removeEventListener('keyup', onUp)
      removeEventListener('blur', release)
      cancelAnimationFrame(frame)
    }
  }, [])
}
/**
 * The left and right arrow keys do the same as a page's ‹ and › buttons.
 * Phones are excluded because Agenda and Calendário stay mounted side by side there.
 */
export function useArrowKeys(move: (step: number) => void) {
  const latest = useRef(move)
  latest.current = move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
      if (!step || !arrowKeyIsFree(e) || matchMedia(PHONE_QUERY).matches) return
      e.preventDefault()
      latest.current(step)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [onClose])
  return <div className="ov" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="dl" role="dialog" aria-label={title}><h2>{title}</h2>{children}</div></div>
}

/** SVG filter that makes the logo's dark background transparent; apply with `filter:url(#logo-background)`. */
export function LogoFilter() {
  return <svg className="logo-filters" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="logo-background" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  4 0 -4 0 -0.08" />
    </filter></defs>
  </svg>
}
