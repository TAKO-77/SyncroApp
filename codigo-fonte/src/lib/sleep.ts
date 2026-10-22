import type { Sleep } from '../types'
import { dow, mins, parse } from './dates'
export function sleepIv(s: Sleep, ds: string): [number, number][] {
  const we = dow(parse(ds)) >= 5 && s.wk, b = mins(we ? s.bed2 : s.bed), w = mins(we ? s.wake2 : s.wake)
  if (b === w) return []
  if (b < w) return [[b, w]]
  const r: [number, number][] = []
  if (w > 0) r.push([0, w])
  if (b < 1440) r.push([b, 1440])
  return r
}
