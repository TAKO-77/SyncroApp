export type Rep = 'none' | 'daily' | 'weekdays' | 'custom' | 'weekly'
export interface EventOverride { x?: 1; title?: string; start?: string; end?: string; cat?: string; color?: string }
export interface PEvent {
  id: string; title: string; start: string; end: string; date: string
  rep: Rep; days?: number[]; cat: string; color?: string
  done: Record<string, boolean>; ex?: Record<string, EventOverride>
}
export type Priority = 'urgente' | 'alta' | 'media' | 'baixa'
export type Effort = 'rel' | 'lig' | 'cui' | 'exi' | 'pro'
/** `parentId` makes the task a subtask of that task; see `lib/subtasks.ts`. */
export interface Task { id: string; t: string; due: string; dueTime?: string; p: Priority; d: boolean; doneAt?: string; effort?: Effort | ''; lv?: Effort | ''; n?: string; workspaceId?: string; parentId?: string }
export type ReminderRepeat = 'none' | 'daily' | 'weekly'
export type ReminderLead = '' | '1w' | '1d' | '1h' | '10m'
/** `until` is the final day of a repeating reminder; `doneUntil` is the last occurrence concluded; see `lib/reminderItems.ts`. */
export interface ReminderItem { id: string; title: string; date: string; time: string; repeat: ReminderRepeat; lead: ReminderLead; until: string; doneUntil: string; doneAt: string }
export interface TaskWorkspace { id: string; name: string }
export interface WorkspaceNote { id: string; workspaceId: string; text: string }
export interface Finance { id: string; t: 'in' | 'out'; k: 'rec' | 'one'; n: string; a: number; date: string; end: string; c: string }
/** `h` is the start time and `he` the optional end time (`HH:MM`); see `lib/specialDays.ts`. */
export interface SpecialDay { id: string; n: string; ty: string; s: string; e: string; h: string; he?: string; o: string; y: boolean }
export interface Category { id: string; name: string; color: string; icon?: string }
export interface SleepSchedule { bed: string; wake: string }
export interface Sleep { daily?: SleepSchedule[]; bed: string; wake: string; wk: boolean; bed2: string; wake2: string }
export interface AppData {
  ev: PEvent[]; tasks: Task[]; workspaces: TaskWorkspace[]; fin: Finance[]; days: SpecialDay[]
  cats: Category[]; dayCats: Category[]; sleep: Sleep; name?: string; photo?: string; reset: string
  notes: WorkspaceNote[]; reminders: ReminderItem[]
  /** False when only reminders should notify. */
  notifyTasks: boolean
  /** Legacy single note per workspace; moved into `notes` by `parseAppData`. */
  taskNotes?: Record<string, string>
}
