import { useEffect, useRef, useState } from 'react'

/** Matches the `.tk.completing` animation in `styles.css`. */
const COMPLETE_MS = 1300

/**
 * A ticked row plays the completion animation before `commit` removes it from the list.
 * Unticking during the animation cancels it.
 */
export function useCompletion(commit: (id: string) => void) {
  const [completing, setCompleting] = useState<string[]>([])
  const timers = useRef(new Map<string, number>())
  const latest = useRef(commit)
  latest.current = commit
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const finish = (id: string) => { timers.current.delete(id); setCompleting(c => c.filter(x => x !== id)) }

  const start = (id: string, row: HTMLElement | null | undefined) => {
    // Rows differ in height on phones, so the collapse starts from this row's own height.
    row?.style.setProperty('--tk-h', `${row.offsetHeight}px`)
    setCompleting(c => [...c, id])
    timers.current.set(id, window.setTimeout(() => { finish(id); latest.current(id) }, COMPLETE_MS))
  }
  /** Stops a running animation; false when there was none. */
  const cancel = (id: string) => {
    const timer = timers.current.get(id)
    if (timer === undefined) return false
    clearTimeout(timer)
    finish(id)
    return true
  }
  return { completing, start, cancel }
}
