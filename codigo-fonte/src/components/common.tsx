import { useEffect, useState, type ReactNode } from 'react'
import { iso } from '../lib/dates'
export const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
export const todayIso = () => iso(new Date())
export function useNow(ms = 30000) {
  const [n, setN] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setN(new Date()), ms); return () => clearInterval(id) }, [ms])
  return n
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
