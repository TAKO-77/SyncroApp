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
