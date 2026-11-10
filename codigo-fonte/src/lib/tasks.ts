import { PALETTE } from './palette.ts'
import { addDays, shortDate, todayIso } from './dates.ts'
import { dueKey, isOverdue } from './taskDue.ts'
import { translator } from './i18n/translate.ts'
import type { Language } from './i18n/languages.ts'
import type { Effort, Priority, Task } from '../types'

// Task rules, labels and colours shared by Tarefas, Início, Quick add and the subtask editor.

/** Most urgent first. */
export const PRIORITIES: Priority[] = ['urgente', 'alta', 'media', 'baixa']
export const PC: Record<Priority, string> = { urgente: PALETTE.error, alta: PALETTE.clay, media: PALETTE.gold, baixa: PALETTE.sage }
/** Priority name in a language. */
export const priorityLabel = (p: Priority, lang: Language = 'pt-PT') => translator(lang).t(`tarefas.priority.${p}`)
/** Effort name and its time hint in a language. */
export const effortLabel = (e: Effort, lang: Language = 'pt-PT') => translator(lang).t(`tarefas.effort.${e}`)
export const effortHint = (e: Effort, lang: Language = 'pt-PT') => translator(lang).t(`tarefas.effort.${e}.hint`)
export const EFFORT_COLORS: Record<Effort, string> = { rel: PALETTE.sage, lig: PALETTE.slate, cui: PALETTE.neutral, exi: PALETTE.clay, pro: PALETTE.gold }
export const LK = Object.keys(EFFORT_COLORS) as Effort[]

/** Name of a workspace; the built-in one is translated while it still has its original name. */
export const workspaceLabel = (w: { id: string; name: string }, lang: Language = 'pt-PT') => w.id === 'geral' && w.name === 'Geral' ? translator(lang).t('tarefas.workspace.geral') : w.name
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
export function dueLabel(task: Pick<Task, 'due' | 'dueTime'>, today: string, time: string, lang: Language = 'pt-PT'): [string, boolean] {
  const { t } = translator(lang), d = task.due, at = task.dueTime ? `, ${task.dueTime}` : ''
  if (!d) return ['', false]; if (isOverdue(task, today, time)) return [t('tarefas.due.late'), true]; if (d === today) return [`${t('tarefas.due.today')}${at}`, false]
  if (d === addDays(today, 1)) return [`${t('tarefas.due.tomorrow')}${at}`, false]
  return [`${shortDate(d, lang)}${at}`, false]
}

/** Pending tasks due on or before `last` (overdue ones included); undated tasks are left out. */
export const tasksDueBy = (tasks: Task[], last: string) => tasks.filter(t => !t.d && t.due && t.due <= last)

/** Pending tasks, most urgent first: by due date (overdue first, undated last), then by priority. */
export const urgentTasks = (tasks: Task[]) => tasks.filter(t => !t.d)
  .sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || priorityRank(a.p) - priorityRank(b.p))
