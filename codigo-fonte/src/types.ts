export type Rep = 'none' | 'daily' | 'weekdays' | 'custom' | 'weekly'
export interface EventOverride { x?: 1; title?: string; start?: string; end?: string; cat?: string; color?: string }
export interface PEvent {
  id: string; title: string; start: string; end: string; date: string
  rep: Rep; days?: number[]; cat: string; color?: string
  done: Record<string, boolean>; ex?: Record<string, EventOverride>
}
export type Priority = 'urgente' | 'alta' | 'media' | 'baixa'
export type Effort = 'rel' | 'lig' | 'cui' | 'exi' | 'pro'
export interface Task { id: string; t: string; due: string; p: Priority; d: boolean; doneAt?: string; effort?: Effort | ''; lv?: Effort | ''; n?: string; workspaceId?: string }
export interface TaskWorkspace { id: string; name: string }
export interface WorkspaceNote { id: string; workspaceId: string; text: string }
export interface Finance { id: string; t: 'in' | 'out'; k: 'rec' | 'one'; n: string; a: number; date: string; end: string; c: string }
export interface SpecialDay { id: string; n: string; ty: string; s: string; e: string; h: string; o: string; y: boolean }
export interface Category { id: string; name: string; color: string; icon?: string }
export interface SleepSchedule { bed: string; wake: string }
export interface Sleep { daily?: SleepSchedule[]; bed: string; wake: string; wk: boolean; bed2: string; wake2: string }
export interface AppData {
  ev: PEvent[]; tasks: Task[]; workspaces: TaskWorkspace[]; fin: Finance[]; days: SpecialDay[]
  cats: Category[]; dayCats: Category[]; sleep: Sleep; name?: string; photo?: string; reset: string
  notes: WorkspaceNote[]
  /** Legacy single note per workspace; moved into `notes` by `parseAppData`. */
  taskNotes?: Record<string, string>
}
