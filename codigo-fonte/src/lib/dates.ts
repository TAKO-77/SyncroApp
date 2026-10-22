export const DN = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const MN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const p2 = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const parse = (s: string) => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c) }
export const dow = (d: Date) => (d.getDay() + 6) % 7
export const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const hm = (m: number) => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`
export const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? p2(r) : ''}` : `${r}min` }
