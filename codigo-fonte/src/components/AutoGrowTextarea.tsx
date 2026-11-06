import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** Textarea as tall as its text (explicit and wrapped lines) up to `maxRows`, then it scrolls inside. */
export function AutoGrowTextarea({ value, maxRows = 10, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; maxRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const fit = () => {
    const el = ref.current
    if (!el) return
    // Collapsing to measure can clamp the scroll position of the field and of the dialog around it.
    const scrolled: [Element, number][] = []
    for (let n: Element | null = el; n; n = n.parentElement) if (n.scrollTop) scrolled.push([n, n.scrollTop])
    const style = getComputedStyle(el)
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const chrome = borders + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const limit = parseFloat(style.lineHeight) * maxRows + chrome
    el.style.overflowY = 'hidden'
    el.style.height = 'auto'
    const natural = el.scrollHeight + borders
    // scrollHeight is rounded, so a text of exactly maxRows lines can measure a fraction over the limit.
    const overflows = natural > limit + 1
    el.style.height = `${overflows ? limit : natural}px`
    if (overflows) el.style.overflowY = 'auto'
    for (const [n, top] of scrolled) n.scrollTop = top
  }

  useLayoutEffect(fit, [value, maxRows])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = el.offsetWidth
    // Only a new width changes the wrapping; the height is set here, so it must not trigger this again.
    const observer = new ResizeObserver(() => { if (el.offsetWidth !== width) { width = el.offsetWidth; fit() } })
    observer.observe(el)
    return () => observer.disconnect()
  }, [maxRows]) // eslint-disable-line

  return <textarea {...props} ref={ref} rows={1} value={value} className={'auto-grow' + (className ? ` ${className}` : '')} />
}
