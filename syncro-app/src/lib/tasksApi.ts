import { supabase } from '@/lib/supabase'
import { noteFromRow, noteToRow } from '@/lib/notes'
import { GENERAL_WORKSPACE_ID, taskFromRow, taskToRow, workspaceFromRow, workspaceToRow } from '@/lib/tasks'
import type { Task, Workspace, WorkspaceNote } from '@/types/tasks'

// Supabase queries for the Tarefas section. Rows are scoped by row level security and
// soft-deleted (`deleted = true`) so the desktop app's sync also removes them.

const TASK_COLUMNS = 'id,title,due,priority,done,effort,workspace_id,notes,position'
const WORKSPACE_COLUMNS = 'id,name,position'
const NOTE_COLUMNS = 'id,workspace_id,text,position'

export interface TaskBoard { tasks: Task[]; workspaces: Workspace[]; notes: WorkspaceNote[] }

export async function fetchTaskBoard(): Promise<TaskBoard> {
  const [tasks, workspaces, notes] = await Promise.all([
    supabase.from('tasks').select(TASK_COLUMNS).eq('deleted', false).order('position'),
    supabase.from('workspaces').select(WORKSPACE_COLUMNS).eq('deleted', false).order('position'),
    supabase.from('workspace_notes').select(NOTE_COLUMNS).eq('deleted', false).order('position'),
  ])
  if (tasks.error) throw tasks.error
  if (workspaces.error) throw workspaces.error
  if (notes.error) throw notes.error
  return { tasks: tasks.data.map(taskFromRow), workspaces: workspaces.data.map(workspaceFromRow), notes: notes.data.map(noteFromRow) }
}

/** Position after the last task, for tasks created outside the Tarefas screen (adição rápida). */
export async function nextTaskPosition(): Promise<number> {
  const { data, error } = await supabase.from('tasks').select('position').eq('deleted', false).order('position', { ascending: false }).limit(1)
  if (error) throw error
  return data.length ? Number(data[0].position) + 1 : 0
}

export async function upsertTask(userId: string, task: Task) {
  const { error } = await supabase.from('tasks')
    .upsert({ ...taskToRow(task), user_id: userId, deleted: false }, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function softDeleteTask(userId: string, id: string) {
  const { error } = await supabase.from('tasks').update({ deleted: true }).eq('user_id', userId).eq('id', id)
  if (error) throw error
}

export async function upsertWorkspace(userId: string, workspace: Workspace) {
  const { error } = await supabase.from('workspaces')
    .upsert({ ...workspaceToRow(workspace), user_id: userId, deleted: false }, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function upsertNote(userId: string, note: WorkspaceNote) {
  const { error } = await supabase.from('workspace_notes')
    .upsert({ ...noteToRow(note), user_id: userId, deleted: false }, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function softDeleteNote(userId: string, id: string) {
  const { error } = await supabase.from('workspace_notes').update({ deleted: true }).eq('user_id', userId).eq('id', id)
  if (error) throw error
}

/** Moves the workspace's tasks to "Geral", removes its notes and then the workspace itself. */
export async function softDeleteWorkspace(userId: string, id: string) {
  const moved = await supabase.from('tasks').update({ workspace_id: GENERAL_WORKSPACE_ID })
    .eq('user_id', userId).eq('workspace_id', id)
  if (moved.error) throw moved.error
  const notes = await supabase.from('workspace_notes').update({ deleted: true })
    .eq('user_id', userId).eq('workspace_id', id)
  if (notes.error) throw notes.error
  const removed = await supabase.from('workspaces').update({ deleted: true }).eq('user_id', userId).eq('id', id)
  if (removed.error) throw removed.error
}
