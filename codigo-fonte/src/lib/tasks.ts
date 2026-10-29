import { PALETTE } from './palette'
import { MN, iso, parse } from './dates'
import type { Effort, Priority, Task } from '../types'

// Task labels and colours shared by Tarefas and Início.

export const PC: Record<Priority, string> = { urgente: PALETTE.error, alta: PALETTE.clay, media: PALETTE.gold, baixa: PALETTE.sage }
export const PN: Record<Priority, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const LV: Record<Effort, { n: string; t: string; c: string }> = { rel: { n: 'Muito Rápido', t: 'até 15 min', c: PALETTE.sage }, lig: { n: 'Rápido', t: 'cerca de 30 min', c: PALETTE.slate }, cui: { n: 'Moderado', t: '1 a 2 horas', c: PALETTE.neutral }, exi: { n: 'Demorado', t: 'várias horas', c: PALETTE.clay }, pro: { n: 'Projeto', t: 'várias etapas', c: PALETTE.gold } }
export const LK = Object.keys(LV) as Effort[]
const RANK: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }

/** Label for a due date and whether it is overdue. */
export function dueLabel(d: string, today: string): [string, boolean] {
  if (!d) return ['', false]; if (d < today) return ['Atrasada', true]; if (d === today) return ['Hoje', false]
  const t = parse(today); t.setDate(t.getDate() + 1); if (d === iso(t)) return ['Amanhã', false]
  const x = parse(d); return [`${x.getDate()} ${MN[x.getMonth()]}`, false]
}

/** Pending tasks due on or before `last` (overdue ones included); undated tasks are left out. */
export const tasksDueBy = (tasks: Task[], last: string) => tasks.filter(t => !t.d && t.due && t.due <= last)

/** Pending tasks, most urgent first: by due date (overdue first, undated last), then by priority. */
export const urgentTasks = (tasks: Task[]) => tasks.filter(t => !t.d)
  .sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99') || RANK[a.p] - RANK[b.p])
