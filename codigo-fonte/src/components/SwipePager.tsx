import { useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode, type TouchEvent } from 'react'

const SLIDE_MS = 280
const LOCK_PX = 8
const FLICK_SPEED = 0.35 // px per ms
const FLICK_MIN_PX = 20
const DRAG_SHARE = 0.35 // of a page
const CLICK_GUARD_MS = 350

const scrollsSideways = (el: Element | null, stop: Element): boolean => {
  for (let at = el; at && at !== stop; at = at.parentElement) {
    if (at.scrollWidth > at.clientWidth && /auto|scroll/.test(getComputedStyle(at).overflowX)) return true
  }
  return false
}

interface Drag { x: number; y: number; left: number; page: number; lastX: number; lastTime: number; speed: number; axis: 'x' | 'y' | null }

/**
 * Pages side by side that follow the finger. The box doesn't scroll by itself: the code sets its position, which the
 * browser keeps between the first and last page, so a swipe can never pass either end or stop between pages, and
 * moves one page at most. The box takes the height of the current page; changing `page` from outside slides to it.
 */
export function SwipePager({ page, onChange, pages }: { page: number; onChange: (page: number) => void; pages: ReactNode[] }) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const safety = useRef(0)
  const slidingTo = useRef<number | null>(null)
  const ignoreClickUntil = useRef(0)
  const current = useRef(page)
  current.current = page

  const step = () => {
    const [a, b] = Array.from(box.current?.children ?? []) as HTMLElement[]
    return a && b ? b.offsetLeft - a.offsetLeft : 1
  }
  const fitHeight = () => {
    const el = box.current, panel = el?.children[current.current] as HTMLElement | undefined
    if (el && panel) el.style.height = `${panel.offsetHeight}px`
  }
  const stopSliding = () => { cancelAnimationFrame(frame.current); clearTimeout(safety.current); slidingTo.current = null }
  const slideTo = (target: number) => {
    const el = box.current
    if (!el) return
    stopSliding()
    const from = el.scrollLeft, to = target * step()
    if (from === to) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.scrollLeft = to; return }
    slidingTo.current = target
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SLIDE_MS)
      el.scrollLeft = from + (to - from) * (1 - (1 - t) ** 3)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else slidingTo.current = null
    }
    frame.current = requestAnimationFrame(tick)
    // Browsers can pause animation frames, and the page must never rest between two positions.
    safety.current = window.setTimeout(() => { stopSliding(); el.scrollLeft = to }, SLIDE_MS + 120)
  }

  useLayoutEffect(() => {
    if (box.current) box.current.scrollLeft = current.current * step()
    fitHeight()
  }, [])

  useEffect(() => {
    fitHeight()
    if (slidingTo.current !== page && !drag.current) slideTo(page)
  }, [page])

  useEffect(() => {
    const el = box.current
    if (!el) return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      fitHeight()
      // A rotated phone changes the page width, so the position has to follow.
      if (el.clientWidth !== width) { width = el.clientWidth; stopSliding(); el.scrollLeft = current.current * step() }
    })
    observer.observe(el)
    Array.from(el.children).forEach(child => observer.observe(child))
    return () => { observer.disconnect(); stopSliding() }
  }, [])

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const el = box.current, touch = e.touches[0], target = e.target as Element
    drag.current = null
    if (!el || e.touches.length > 1 || target.closest('.ov,.pop,input,textarea,select') || scrollsSideways(target, el)) return
    const page = slidingTo.current ?? current.current
    stopSliding()
    drag.current = { x: touch.clientX, y: touch.clientY, left: el.scrollLeft, page, lastX: touch.clientX, lastTime: e.timeStamp, speed: 0, axis: null }
  }
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const el = box.current, d = drag.current, touch = e.touches[0]
    if (!el || !d) return
    const dx = touch.clientX - d.x, dy = touch.clientY - d.y
    if (!d.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      // Vertical: the page scrolls as usual, and a slide this touch interrupted carries on.
      if (d.axis === 'y') { drag.current = null; slideTo(d.page); return }
    }
    el.scrollLeft = d.left - dx
    const elapsed = e.timeStamp - d.lastTime
    if (elapsed > 0) { d.speed = (touch.clientX - d.lastX) / elapsed; d.lastX = touch.clientX; d.lastTime = e.timeStamp }
  }
  const onRelease = (e: TouchEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    // A tap can interrupt a slide, which still has to reach its page.
    if (!d.axis) { slideTo(d.page); return }
    ignoreClickUntil.current = e.timeStamp + CLICK_GUARD_MS
    const moved = e.type === 'touchend' ? e.changedTouches[0].clientX - d.x : 0
    const stale = e.timeStamp - d.lastTime > 100
    const flick = !stale && Math.abs(d.speed) >= FLICK_SPEED && Math.abs(moved) >= FLICK_MIN_PX
    const direction = flick || Math.abs(moved) >= step() * DRAG_SHARE ? Math.sign(moved) : 0
    const target = Math.max(0, Math.min(pages.length - 1, d.page - direction))
    slideTo(target)
    if (target !== current.current) onChange(target)
  }
  // A finger lifted after a swipe isn't a tap on whatever lies under it.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.timeStamp < ignoreClickUntil.current) { e.preventDefault(); e.stopPropagation() }
  }

  return <div ref={box} className="pager" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onRelease} onTouchCancel={onRelease} onClickCapture={onClickCapture}>
    {pages.map((content, i) => <div key={i} className="pager-panel" {...(i === page ? {} : { inert: '' })}>{content}</div>)}
  </div>
}
