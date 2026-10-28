import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useUser } from '@/hooks/useAuth'
import { GENERAL_WORKSPACE_ID, newId, nextPosition, nextPriority, validateTaskDraft, validateWorkspaceName, withGeneralWorkspace, type Validation } from '@/lib/tasks'
import { fetchTaskBoard, softDeleteTask, softDeleteWorkspace, upsertTask, upsertWorkspace, type TaskBoard } from '@/lib/tasksApi'
import type { Task, TaskDraft } from '@/types/tasks'

export type LoadState = 'loading' | 'ready' | 'error'
const REFRESH_MS = 60 * 1000
const EMPTY: TaskBoard = { tasks: [], workspaces: [] }

/**
 * Tasks and workspaces of the signed-in user, read from and written to Supabase.
 * Changes show immediately; if the server rejects one, the board is reloaded and `error` explains why.
 */
export function useTasks() {
  const user = useUser()
  const [board, setBoard] = useState<TaskBoard>(EMPTY)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const boardRef = useRef(board)
  boardRef.current = board
  // A refresh that started before a local change must not overwrite it.
  const pending = useRef(0)
  const version = useRef(0)

  const reload = useCallback(async () => {
    const started = version.current
    try {
      const next = await fetchTaskBoard()
      if (pending.current === 0 && started === version.current) { setBoard(next); setState('ready') }
    } catch {
      setState(s => (s === 'ready' ? s : 'error'))
      if (boardRef.current !== EMPTY) setError('Sem ligação ao servidor. As tarefas podem não estar atualizadas.')
    }
  }, [])

  useEffect(() => {
    void reload()
    const timer = setInterval(() => void reload(), REFRESH_MS)
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void reload() })
    return () => { clearInterval(timer); sub.remove() }
  }, [reload, user.id])

  const mutate = useCallback(async (apply: (b: TaskBoard) => TaskBoard, send: () => Promise<void>, failure: string) => {
    version.current++
    pending.current++
    setError('')
    setBoard(apply)
    try {
      await send()
    } catch {
      setError(failure)
      pending.current--
      await reload()
      return
    }
    pending.current--
  }, [reload])

  const patchTask = (id: string, change: (t: Task) => Task, failure: string) => {
    const current = boardRef.current.tasks.find(t => t.id === id)
    if (!current) return
    const next = change(current)
    void mutate(b => ({ ...b, tasks: b.tasks.map(t => (t.id === id ? next : t)) }), () => upsertTask(user.id, next), failure)
  }

  const addTask = (draft: TaskDraft): Validation<Task> => {
    const valid = validateTaskDraft(draft)
    if (!valid.ok) return valid
    const task: Task = { ...valid.value, id: newId('t'), position: nextPosition(boardRef.current.tasks) }
    void mutate(b => ({ ...b, tasks: [...b.tasks, task] }), () => upsertTask(user.id, task), 'Não foi possível guardar a tarefa.')
    return { ok: true, value: task }
  }

  const updateTask = (id: string, draft: TaskDraft): Validation<TaskDraft> => {
    const valid = validateTaskDraft(draft)
    if (valid.ok) patchTask(id, t => ({ ...t, ...valid.value }), 'Não foi possível guardar as alterações.')
    return valid
  }

  const setDone = (id: string, done: boolean) => patchTask(id, t => ({ ...t, done }), 'Não foi possível atualizar a tarefa.')
  const cyclePriority = (id: string) => patchTask(id, t => ({ ...t, priority: nextPriority(t.priority) }), 'Não foi possível mudar a prioridade.')

  const deleteTask = (id: string) => void mutate(b => ({ ...b, tasks: b.tasks.filter(t => t.id !== id) }),
    () => softDeleteTask(user.id, id), 'Não foi possível apagar a tarefa.')

  const addWorkspace = (name: string): Validation<string> => {
    const valid = validateWorkspaceName(name)
    if (!valid.ok) return valid
    const workspace = { id: newId('w'), name: valid.value, position: nextPosition(boardRef.current.workspaces) }
    void mutate(b => ({ ...b, workspaces: [...b.workspaces, workspace] }), () => upsertWorkspace(user.id, workspace), 'Não foi possível criar o espaço.')
    return { ok: true, value: workspace.id }
  }

  const deleteWorkspace = (id: string) => {
    if (id === GENERAL_WORKSPACE_ID) return
    void mutate(b => ({
      tasks: b.tasks.map(t => (t.workspaceId === id ? { ...t, workspaceId: GENERAL_WORKSPACE_ID } : t)),
      workspaces: b.workspaces.filter(w => w.id !== id),
    }), () => softDeleteWorkspace(user.id, id), 'Não foi possível eliminar o espaço.')
  }

  return {
    state,
    error,
    dismissError: () => setError(''),
    retry: () => { setState('loading'); void reload() },
    tasks: board.tasks,
    workspaces: withGeneralWorkspace(board.workspaces),
    addTask, updateTask, setDone, cyclePriority, deleteTask, addWorkspace, deleteWorkspace,
  }
}
