import type { Rep } from '../types'
import { dow, hm, iso } from './dates'
export type Parsed = { task: string } | { title: string; date: string; start: string; end: string; rep: Rep }
export const RLB: Record<string, string> = { daily: 'todos os dias', weekdays: 'dias úteis', weekly: 'semanal' }

export function parseQ(q0: string, now = new Date()): Parsed | null {
  let q = q0.trim(); if (!q) return null
  if (/^t:/i.test(q)) { const t = q.slice(2).trim(); return t ? { task: t } : null }
  const today = iso(now)
  let rep: Rep = 'none', date = today, dur = 60, start: number | null = null
  const reps: [RegExp, Rep][] = [[/\b(todos os dias|diariamente|diário|diario)\b/i, 'daily'], [/\bdias [uú]teis\b/i, 'weekdays'], [/\b(semanalmente|semanal|todas as semanas)\b/i, 'weekly']]
  for (const [r, v] of reps) if (r.test(q)) { rep = v; q = q.replace(r, ' ') }
  if (/amanh[ãa]/i.test(q)) { const d = new Date(now); d.setDate(d.getDate() + 1); date = iso(d); q = q.replace(/amanh[ãa]/i, ' ') }
  else if (/\bhoje\b/i.test(q)) q = q.replace(/\bhoje\b/i, ' ')
  else {
    const m = q.match(/\b(seg(?:unda)?|ter(?:[çc]a)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|s[áa]b(?:ado)?|dom(?:ingo)?)(?:-feira)?(?![a-zà-ú])/i)
    if (m) {
      const w = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].indexOf(m[1].slice(0, 3).toLowerCase().replace('á', 'a'))
      const d = new Date(now); d.setDate(d.getDate() + (w - dow(d) + 7) % 7); date = iso(d); q = q.replace(m[0], ' ')
    }
  }
  const mn = q.match(/(\d+)\s?min\b/i); if (mn) { dur = +mn[1]; q = q.replace(mn[0], ' ') }
  const hr = q.match(/(\d+(?:[.,]\d+)?)\s?(?:horas?|hrs?)\b/i); if (hr) { dur = Math.round(parseFloat(hr[1].replace(',', '.')) * 60); q = q.replace(hr[0], ' ') }
  const re = /\b(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\d)/gi, ts = [...q.matchAll(re)]
  const val = (m: RegExpMatchArray) => +m[1] * 60 + +(m[2] || m[3] || 0)
  if (ts.length === 1) { const m = ts[0]; if (!m[2] && +m[1] < 6 && !/(^|\s)às(\s|$)/i.test(q)) dur = val(m); else start = val(m) }
  else if (ts.length > 1) { start = val(ts[0]); dur = val(ts[1]) }
  q = q.replace(re, ' ').replace(/(^|\s)às(?=\s|$)/gi, ' ')
  let title = q.replace(/\s+/g, ' ').trim(); if (!title) return null
  title = title[0].toUpperCase() + title.slice(1)
  if (start == null) start = date === today ? Math.min(now.getHours() * 60 + now.getMinutes() + 1, 1439) : 540
  return { title, date, start: hm(start), end: hm(Math.min(start + dur, 1439)), rep }
}
