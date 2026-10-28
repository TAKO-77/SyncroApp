// Domain types for the Tarefas section. Values match the web app and the `tasks`/`workspaces` tables.

export type Priority = 'urgente' | 'alta' | 'media' | 'baixa'
export type Effort = 'rel' | 'lig' | 'cui' | 'exi' | 'pro'
export type TaskSort = 'priority' | 'effort' | 'due' | 'custom'

export interface Task {
  readonly id: string
  readonly title: string
  /** ISO `YYYY-MM-DD`, or '' when there is no due date. */
  readonly due: string
  readonly priority: Priority
  readonly done: boolean
  readonly effort: Effort | ''
  readonly workspaceId: string
  readonly notes: string
  readonly position: number
}

export interface Workspace {
  readonly id: string
  readonly name: string
  readonly position: number
}

/** Fields the user fills in when creating or editing a task. */
export type TaskDraft = Pick<Task, 'title' | 'due' | 'priority' | 'effort' | 'workspaceId' | 'notes' | 'done'>

/** Columns of `public.tasks` written by the app (user_id, deleted and updated_at are handled separately). */
export interface TaskRow {
  id: string
  title: string
  due: string | null
  priority: Priority
  done: boolean
  effort: Effort | null
  workspace_id: string
  notes: string
  position: number
}

export interface WorkspaceRow {
  id: string
  name: string
  position: number
}
