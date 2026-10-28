import { useLayoutEffect, useRef, type ReactNode } from 'react'

const ROW = 2, GAP = 10

/** Two-column masonry: each note spans as many thin grid rows as its height, so short notes fill the space beside tall ones. */
export function NoteGrid({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const fit = (item: Element) => { (item as HTMLElement).style.gridRowEnd = `span ${Math.ceil((item.getBoundingClientRect().height + GAP) / ROW)}` }
    const resize = new ResizeObserver(entries => entries.forEach(e => fit(e.target)))
    const observe = () => [...el.children].forEach(item => { fit(item); resize.observe(item) })
    observe()
    const added = new MutationObserver(observe)
    added.observe(el, { childList: true })
    return () => { resize.disconnect(); added.disconnect() }
  }, [])
  return <div className="note-grid" ref={grid}>{children}</div>
}
