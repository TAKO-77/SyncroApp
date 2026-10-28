import type { Effort, Priority, Task, TaskDraft, TaskRow, TaskSort, Workspace, WorkspaceRow } from '../types/tasks'
import { addDays, isIsoDate, shortDate } from './dates.ts'
import { str, type Validation } from './records.ts'

// Pure task logic shared by the Tarefas screen and its data layer.
// Only imports other pure modules (with their `.ts` extension) so scripts/test-tasks.ts can run it with Node directly.

export const GENERAL_WORKSPACE_ID = 'geral'
export const TITLE_MAX = 90
export const NOTES_MAX = 400
export const WORKSPACE_NAME_MAX = 32

export const PRIORITIES: readonly Priority[] = ['urgente', 'alta', 'media', 'baixa']
export const PRIORITY_LABELS: Record<Priority, string> = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const NEXT_PRIORITY: Record<Priority, Priority> = { urgente: 'alta', alta: 'media', media: 'baixa', baixa: 'urgente' }
export const nextPriority = (p: Priority): Priority => NEXT_PRIORITY[p]

export const EFFORTS: readonly Effort[] = ['rel', 'lig', 'cui', 'exi', 'pro']
export const EFFORT_LABELS: Record<Effort, { name: string; hint: string }> = {
  rel: { name: 'Muito Rápido', hint: 'até 15 min' },
  lig: { name: 'Rápido', hint: 'cerca de 30 min' },
  cui: { name: 'Moderado', hint: '1 a 2 horas' },
  exi: { name: 'Demorado', hint: 'várias horas' },
  pro: { name: 'Projeto', hint: 'várias etapas' },
}

export const SORT_OPTIONS: readonly { value: TaskSort; label: string }[] = [
  { value: 'priority', label: 'Relevância' },
  { value: 'effort', label: 'Tempo' },
  { value: 'due', label: 'Data limite' },
  { value: 'custom', label: 'Customizado' },
]
export const isTaskSort = (v: unknown): v is TaskSort => SORT_OPTIONS.some(o => o.value === v)

const isPriority = (v: unknown): v is Priority => PRIORITIES.includes(v as Priority)
const isEffort = (v: unknown): v is Effort => EFFORTS.includes(v as Effort)

// ── Dates ──────────────────────────────────────────────────────────────

/** Label for a due date relative to `today`, and whether the task is late. */
export function dueLabel(due: string, today: string): { label: string; late: boolean } {
  if (!due) return { label: '', late: false }
  if (due < today) return { label: 'Atrasada', late: true }
  if (due === today) return { label: 'Hoje', late: false }
  if (due === addDays(today, 1)) return { label: 'Amanhã', late: false }
  return { label: shortDate(due), late: false }
}

// ── Rows ↔ domain ──────────────────────────────────────────────────────

export function taskFromRow(row: Record<string, unknown>): Task {
  return {
    id: str(row.id),
    title: str(row.title),
    due: str(row.due),
    priority: isPriority(row.priority) ? row.priority : 'media',
    done: Boolean(row.done),
    effort: isEffort(row.effort) ? row.effort : '',
    workspaceId: str(row.workspace_id) || GENERAL_WORKSPACE_ID,
    notes: str(row.notes),
    position: Number(row.position ?? 0),
  }
}

export function taskToRow(t: Task): TaskRow {
  return {
    id: t.id,
    title: t.title,
    due: t.due || null,
    priority: t.priority,
    done: t.done,
    effort: t.effort || null,
    workspace_id: t.workspaceId,
    notes: t.notes,
    position: t.position,
  }
}

export const workspaceFromRow = (row: Record<string, unknown>): Workspace =>
  ({ id: str(row.id), name: str(row.name), position: Number(row.position ?? 0) })

export const workspaceToRow = (w: Workspace): WorkspaceRow => ({ id: w.id, name: w.name, position: w.position })

/** Sorted workspaces, always starting with "Geral" even when the account has no row for it yet. */
export function withGeneralWorkspace(list: readonly Workspace[]): Workspace[] {
  const sorted = [...list].sort((a, b) => a.position - b.position)
  return sorted.some(w => w.id === GENERAL_WORKSPACE_ID)
    ? sorted
    : [{ id: GENERAL_WORKSPACE_ID, name: 'Geral', position: -1 }, ...sorted]
}

// ── Validation ─────────────────────────────────────────────────────────

/** Trims and checks a task before it is sent to Supabase. */
export function validateTaskDraft(draft: TaskDraft): Validation<TaskDraft> {
  const title = draft.title.trim()
  if (!title) return { ok: false, error: 'Indica o nome da tarefa.' }
  if (title.length > TITLE_MAX) return { ok: false, error: `O nome pode ter até ${TITLE_MAX} caracteres.` }
  if (draft.due && !isIsoDate(draft.due)) return { ok: false, error: 'A data limite não é válida.' }
  if (!isPriority(draft.priority)) return { ok: false, error: 'Escolhe uma prioridade.' }
  if (draft.effort && !isEffort(draft.effort)) return { ok: false, error: 'Escolhe um esforço válido.' }
  const notes = draft.notes.trim()
  if (notes.length > NOTES_MAX) return { ok: false, error: `As notas podem ter até ${NOTES_MAX} caracteres.` }
  if (!draft.workspaceId) return { ok: false, error: 'Escolhe um espaço de trabalho.' }
  return { ok: true, value: { ...draft, title, notes } }
}

export function validateWorkspaceName(name: string): Validation<string> {
  const value = name.trim()
  if (!value) return { ok: false, error: 'Indica o nome do espaço.' }
  if (value.length > WORKSPACE_NAME_MAX) return { ok: false, error: `O nome pode ter até ${WORKSPACE_NAME_MAX} caracteres.` }
  return { ok: true, value }
}

// ── Listing ────────────────────────────────────────────────────────────

/** Tasks of a workspace; "Geral" shows every task, like the web app. */
export const tasksInWorkspace = (tasks: readonly Task[], workspaceId: string) =>
  workspaceId === GENERAL_WORKSPACE_ID ? [...tasks] : tasks.filter(t => t.workspaceId === workspaceId)

const PRIORITY_RANK: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }

/** Returns a new array; ties keep the stored (custom) order. */
export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  const byPosition = (a: Task, b: Task) => a.position - b.position
  const compare: Record<TaskSort, (a: Task, b: Task) => number> = {
    custom: () => 0,
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    effort: (a, b) => (a.effort ? EFFORTS.indexOf(a.effort) : 99) - (b.effort ? EFFORTS.indexOf(b.effort) : 99),
    due: (a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'),
  }
  return [...tasks].sort((a, b) => compare[sort](a, b) || byPosition(a, b))
}
