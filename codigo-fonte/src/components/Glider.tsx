import { useLayoutEffect, useRef } from 'react'

type Box = { x: number; y: number; w: number; h: number }
const css = (b: Box) => ({ left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })

/**
 * Highlight that slides to the parent's selected child (`aria-current` or `aria-pressed="true"`).
 * On a change it stretches over both items before settling, like a drop of liquid. Put it as a child of a
 * positioned container (`.seg`, `.nav`); the container's CSS hides the selected item's own background.
 */
export function Glider() {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const g = ref.current, box = g?.parentElement
    if (!g || !box) return
    let last: Box | null = null
    const place = (move: boolean) => {
      const on = box.querySelector<HTMLElement>(':scope > [aria-current], :scope > [aria-pressed="true"]')
      if (!on) { g.style.opacity = '0'; last = null; return }
      const b = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight }
      if (move && last && (last.x !== b.x || last.y !== b.y) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const x = Math.min(last.x, b.x), y = Math.min(last.y, b.y)
        const both = { x, y, w: Math.max(last.x + last.w, b.x + b.w) - x, h: Math.max(last.y + last.h, b.y + b.h) - y }
        g.animate([css(last), { ...css(both), offset: .45 }, css(b)], { duration: 420, easing: 'cubic-bezier(.3,.8,.3,1)' })
      }
      Object.assign(g.style, css(b), { opacity: '1' }); last = b
    }
    place(false)
    const mo = new MutationObserver(() => place(true))
    mo.observe(box, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'aria-pressed'] })
    const ro = new ResizeObserver(() => place(false))
    ro.observe(box); Array.from(box.children).forEach(c => ro.observe(c))
    return () => { mo.disconnect(); ro.disconnect() }
  }, [])
  return <span ref={ref} className="glider" aria-hidden="true" />
}
