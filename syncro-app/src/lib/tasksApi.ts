import { supabase } from '@/lib/supabase'
import { GENERAL_WORKSPACE_ID, taskFromRow, taskToRow, workspaceFromRow, workspaceToRow } from '@/lib/tasks'
import type { Task, Workspace } from '@/types/tasks'

// Supabase queries for the Tarefas section. Rows are scoped by row level security and
// soft-deleted (`deleted = true`) so the desktop app's sync also removes them.

const TASK_COLUMNS = 'id,title,due,priority,done,effort,workspace_id,notes,position'
const WORKSPACE_COLUMNS = 'id,name,position'

export interface TaskBoard { tasks: Task[]; workspaces: Workspace[] }

export async function fetchTaskBoard(): Promise<TaskBoard> {
  const [tasks, workspaces] = await Promise.all([
    supabase.from('tasks').select(TASK_COLUMNS).eq('deleted', false).order('position'),
    supabase.from('workspaces').select(WORKSPACE_COLUMNS).eq('deleted', false).order('position'),
  ])
  if (tasks.error) throw tasks.error
  if (workspaces.error) throw workspaces.error
  return { tasks: tasks.data.map(taskFromRow), workspaces: workspaces.data.map(workspaceFromRow) }
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
