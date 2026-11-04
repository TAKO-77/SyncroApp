import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
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
const SWIPE_MIN = 60, SWIPE_EDGE = 24
const scrollsSideways = (el: Element | null, stop: Element): boolean => {
  for (let at = el; at && at !== stop; at = at.parentElement) {
    if (at.scrollWidth > at.clientWidth && /auto|scroll/.test(getComputedStyle(at).overflowX)) return true
  }
  return false
}
/**
 * Touch handlers that report a clear sideways swipe. Swipes are ignored from dialogs, pickers, fields and anything
 * that scrolls sideways, and from the screen edges, which phones use for going back.
 */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      const touch = e.touches[0], target = e.target as Element
      const ignored = e.touches.length > 1 || touch.clientX < SWIPE_EDGE || touch.clientX > innerWidth - SWIPE_EDGE
        || !!target.closest('.ov,.pop,input,textarea,select') || scrollsSideways(target, e.currentTarget)
      start.current = ignored ? null : { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      const from = start.current, touch = e.changedTouches[0]
      start.current = null
      if (!from) return
      const dx = touch.clientX - from.x, dy = touch.clientY - from.y
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx < 0) onLeft(); else onRight()
    },
    onTouchCancel: () => { start.current = null },
  }
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
