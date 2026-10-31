import { useId } from 'react'

/** Small line chart with a faded area, drawn in `--c`. Values are scaled to their own min and max. */
export function Sparkline({ values, color, label, w = 84, h = 32 }: { values: number[]; color: string; label: string; w?: number; h?: number }) {
  const id = useId().replace(/:/g, '')
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1
  const pts = values.map((v, k) => [k / Math.max(1, values.length - 1) * w, h - 3 - (v - lo) / span * (h - 6)])
  const line = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
  const [lx, ly] = pts[pts.length - 1]
  return <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ ['--c' as string]: color }}>
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <path className="spark-area" d={`${line}L${w} ${h}L0 ${h}Z`} fill={`url(#${id})`} />
    <path className="spark-line" d={line} pathLength={1} />
    <circle className="spark-dot" cx={lx} cy={ly} r="2.5" />
  </svg>
}
