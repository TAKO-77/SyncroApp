import type { AppData, Task } from '../types'
import { markDone } from './cleanup.ts'

// A subtask is a normal task with `parentId`: same fields, row, sync and reminders. One level only.
// Only imports modules Node can run directly, so scripts/test-sync.ts can test it.

export const SUBTASK_TITLE_MAX = 90
/** What the editor of the main task changes in a subtask before it is saved. */
export type SubtaskDraft = Pick<Task, 'id' | 't' | 'd'>

/**
 * Separates main tasks from subtasks, keeping the stored order. A task whose parent does not exist,
 * or is itself a subtask, is shown as a main task: nothing stays hidden if a device deleted the
 * parent while another added a subtask to it. The stored `parentId` is left as it is.
 */
export function splitSubtasks(tasks: Task[]): { main: Task[]; children: Map<string, Task[]> } {
  const byId = new Map(tasks.map(t => [t.id, t]))
  const main: Task[] = [], children = new Map<string, Task[]>()
  for (const t of tasks) {
    const parent = t.parentId && t.parentId !== t.id ? byId.get(t.parentId) : undefined
    if (!parent || parent.parentId) { main.push(t); continue }
    const list = children.get(parent.id)
    if (list) list.push(t); else children.set(parent.id, [t])
  }
  return { main, children }
}

/** The list without the task and its subtasks. */
export const withoutTask = (tasks: Task[], id: string) => tasks.filter(t => t.id !== id && t.parentId !== id)

export const hasBlankSubtask = (drafts: SubtaskDraft[]) => drafts.some(s => !s.t.trim())

/** The drafts with a new subtask at the end, or null when the title is empty or only spaces. */
export function addSubtaskDraft(drafts: SubtaskDraft[], title: string, id: string): SubtaskDraft[] | null {
  const t = title.trim()
  return t ? [...drafts, { id, t, d: false }] : null
}

/**
 * Applies what the editor of `parent` changed (`drafts` against `base`, the list when it opened) to the
 * tasks. Only the fields changed here are written, so a sync that arrived meanwhile is kept. Subtasks
 * stay in the workspace of their main task.
 */
export function applySubtaskEdits(d: AppData, parent: Task, base: SubtaskDraft[], drafts: SubtaskDraft[], today: string) {
  const before = new Map(base.map(s => [s.id, s])), kept = new Set(drafts.map(s => s.id))
  d.tasks = d.tasks.filter(t => !(t.parentId === parent.id && before.has(t.id) && !kept.has(t.id)))
  for (const s of drafts) {
    const b = before.get(s.id), t = s.t.trim()
    if (!b) { d.tasks.push({ id: s.id, t, due: '', p: 'media', d: s.d, effort: '', workspaceId: parent.workspaceId, parentId: parent.id }); continue }
    const current = d.tasks.find(x => x.id === s.id)
    if (!current) continue // deleted on another device
    if (t !== b.t) current.t = t
    if (s.d !== b.d) markDone(current, s.d, today)
  }
  for (const t of d.tasks) if (t.parentId === parent.id) t.workspaceId = parent.workspaceId
}
