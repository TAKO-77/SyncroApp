import { useEffect, useRef, useState } from 'react'

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Number that counts up from 0 on mount, and from the old value on change. Intermediate values are rounded. */
export function CountUp({ value, format = String, ms = 700 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [n, setN] = useState(() => still() ? value : 0)
  const cur = useRef(n); cur.current = n
  useEffect(() => {
    const from = cur.current
    if (from === value || still()) { setN(value); return }
    const t0 = performance.now(); let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(p < 1 ? from + (value - from) * (1 - (1 - p) ** 3) : value)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return <>{format(n === value ? value : Math.round(n))}</>
}
