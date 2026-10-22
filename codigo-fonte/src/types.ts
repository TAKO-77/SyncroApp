export type Rep = 'none' | 'daily' | 'weekdays' | 'custom' | 'weekly'
export interface EventOverride { x?: 1; title?: string; start?: string; end?: string; cat?: string; color?: string }
export interface PEvent {
  id: string; title: string; start: string; end: string; date: string
  rep: Rep; days?: number[]; cat: string; color?: string
  done: Record<string, boolean>; ex?: Record<string, EventOverride>
}
export type Priority = 'urgente' | 'alta' | 'media' | 'baixa'
export type Effort = 'rel' | 'lig' | 'cui' | 'exi' | 'pro'
export interface Task { id: string; t: string; due: string; p: Priority; d: boolean; effort?: Effort | ''; lv?: Effort | ''; n?: string; workspaceId?: string }
export interface TaskWorkspace { id: string; name: string }
export interface Finance { id: string; t: 'in' | 'out'; k: 'rec' | 'one'; n: string; a: number; date: string; end: string; c: string }
export interface SpecialDay { id: string; n: string; ty: string; s: string; e: string; h: string; o: string; y: boolean }
export interface Category { id: string; name: string; color: string }
export interface Sleep { bed: string; wake: string; wk: boolean; bed2: string; wake2: string }
export interface AppData {
  ev: PEvent[]; tasks: Task[]; workspaces: TaskWorkspace[]; fin: Finance[]; days: SpecialDay[]
  cats: Category[]; sleep: Sleep; name?: string; reset: string
}
