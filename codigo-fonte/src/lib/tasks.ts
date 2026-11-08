import { PALETTE } from './palette.ts'
import { addDays, shortDate, todayIso } from './dates.ts'
import { dueKey, isOverdue } from './taskDue.ts'
import type { Effort, Priority, Task } from '../types'

// Task rules, labels and colours shared by Tarefas, Início, Quick add and the subtask editor.

/** Most urgent first. */
export const PRIORITIES: Priority[] = ['urgente', 'alta', 'media', 'baixa']
export const PC: Record<Priority, string> = { urgente: PALETTE.error, alta: PALETTE.clay, media: PALETTE.gold, baixa: PALETTE.sage }
export const PN: Record<Priority, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const LV: Record<Effort, { n: string; t: string; c: string }> = { rel: { n: 'Muito Rápido', t: 'até 15 min', c: PALETTE.sage }, lig: { n: 'Rápido', t: 'cerca de 30 min', c: PALETTE.slate }, cui: { n: 'Moderado', t: '1 a 2 horas', c: PALETTE.neutral }, exi: { n: 'Demorado', t: 'várias horas', c: PALETTE.clay }, pro: { n: 'Projeto', t: 'várias etapas', c: PALETTE.gold } }
export const LK = Object.keys(LV) as Effort[]
export const TASK_TITLE_MAX = 90

export const priorityRank = (p: Priority) => PRIORITIES.indexOf(p)
export const nextPriority = (p: Priority) => PRIORITIES[(priorityRank(p) + 1) % PRIORITIES.length]
export const effortRank = (e: Task['effort']) => e ? LK.indexOf(e) : LK.length

/** A pending task with the defaults every new task gets. */
export const newTask = (id: string, fields: Pick<Task, 't'> & Partial<Task>): Task =>
  ({ id, due: '', p: 'media', d: false, effort: '', workspaceId: 'geral', ...fields })

/** Completes or reopens a task, recording the day it was completed. */
export function markDone(task: Task, done: boolean, today = todayIso()) {
  task.d = done
  if (done) task.doneAt = today
  else delete task.doneAt
}

/** Label for a task's deadline and whether it is overdue. */
export function dueLabel(task: Pick<Task, 'due' | 'dueTime'>, today: string, time: string): [string, boolean] {
  const d = task.due, at = task.dueTime ? `, ${task.dueTime}` : ''
  if (!d) return ['', false]; if (isOverdue(task, today, time)) return ['Atrasada', true]; if (d === today) return [`Hoje${at}`, false]
  if (d === addDays(today, 1)) return [`Amanhã${at}`, false]
  return [`${shortDate(d)}${at}`, false]
}

/** Pending tasks due on or before `last` (overdue ones included); undated tasks are left out. */
export const tasksDueBy = (tasks: Task[], last: string) => tasks.filter(t => !t.d && t.due && t.due <= last)

/** Pending tasks, most urgent first: by due date (overdue first, undated last), then by priority. */
export const urgentTasks = (tasks: Task[]) => tasks.filter(t => !t.d)
  .sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || priorityRank(a.p) - priorityRank(b.p))
