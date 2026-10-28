import type { Repeat } from '../types/events'
import { addDays, hm, toIso, weekday } from './dates.ts'

// Natural-language quick add ("Treino sex 18h 1h30 semanal", "t: Comprar café"). Pure port of the web app's lib/quick.ts.

export type QuickEntry = { task: string } | { title: string; date: string; start: string; end: string; repeat: Repeat }

export const REPEAT_HINTS: Partial<Record<Repeat, string>> = { daily: 'todos os dias', weekdays: 'dias úteis', weekly: 'semanal' }

export function parseQuickAdd(input: string, now = new Date()): QuickEntry | null {
  let q = input.trim()
  if (!q) return null
  if (/^t:/i.test(q)) { const task = q.slice(2).trim(); return task ? { task } : null }
  const today = toIso(now)
  let repeat: Repeat = 'none', date = today, duration = 60, start: number | null = null
  const repeats: [RegExp, Repeat][] = [[/\b(todos os dias|diariamente|diário|diario)\b/i, 'daily'], [/\bdias [uú]teis\b/i, 'weekdays'], [/\b(semanalmente|semanal|todas as semanas)\b/i, 'weekly']]
  for (const [re, value] of repeats) if (re.test(q)) { repeat = value; q = q.replace(re, ' ') }
  if (/amanh[ãa]/i.test(q)) { date = addDays(today, 1); q = q.replace(/amanh[ãa]/i, ' ') }
  else if (/\bhoje\b/i.test(q)) q = q.replace(/\bhoje\b/i, ' ')
  else {
    const m = q.match(/\b(seg(?:unda)?|ter(?:[çc]a)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|s[áa]b(?:ado)?|dom(?:ingo)?)(?:-feira)?(?![a-zà-ú])/i)
    if (m) {
      const w = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].indexOf(m[1].slice(0, 3).toLowerCase().replace('á', 'a'))
      date = addDays(today, (w - weekday(today) + 7) % 7)
      q = q.replace(m[0], ' ')
    }
  }
  const mins = q.match(/(\d+)\s?min\b/i)
  if (mins) { duration = +mins[1]; q = q.replace(mins[0], ' ') }
  const hours = q.match(/(\d+(?:[.,]\d+)?)\s?(?:horas?|hrs?)\b/i)
  if (hours) { duration = Math.round(parseFloat(hours[1].replace(',', '.')) * 60); q = q.replace(hours[0], ' ') }
  const timeRe = /\b(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\d)/gi
  const times = [...q.matchAll(timeRe)]
  const value = (m: RegExpMatchArray) => +m[1] * 60 + +(m[2] || m[3] || 0)
  // A lone "1h30" under 6 hours is a duration; "às 1h", "14:00" or "18h" is a start time.
  if (times.length === 1) { const m = times[0]; if (!m[2] && +m[1] < 6 && !/(^|\s)às(\s|$)/i.test(q)) duration = value(m); else start = value(m) }
  else if (times.length > 1) { start = value(times[0]); duration = value(times[1]) }
  q = q.replace(timeRe, ' ').replace(/(^|\s)às(?=\s|$)/gi, ' ')
  let title = q.replace(/\s+/g, ' ').trim()
  if (!title) return null
  title = title[0].toUpperCase() + title.slice(1)
  if (start == null) start = date === today ? Math.min(now.getHours() * 60 + now.getMinutes() + 1, 1439) : 540
  start = Math.min(start, 1438)
  return { title, date, start: hm(start), end: hm(Math.min(start + Math.max(duration, 1), 1439)), repeat }
}

/** Guesses one of the default Agenda categories from the title, like the web app. */
export function guessCategory(title: string, available: readonly { id: string }[]): string {
  const id = /\b(ir|ida|volta|viagem|comboio|autocarro|metro|desloc\w*)\b/i.test(title) ? 'desloc'
    : /gym|gin[aá]sio|treino|corrida|correr|exerc/i.test(title) ? 'exercicio'
    : /\b(uni|aula|aulas|faculdade|escola)\b/i.test(title) ? 'presencial'
    : /estud|tpc/i.test(title) ? 'autonomo'
    : /projeto|c[oó]digo|programar/i.test(title) ? 'projetos'
    : /amig|jogo|cinema|sair/i.test(title) ? 'lazer'
    : 'rotina'
  return available.some(c => c.id === id) ? id : available[0]?.id ?? ''
}
