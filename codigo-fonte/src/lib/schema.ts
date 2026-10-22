import { z } from 'zod'
import type { AppData } from '../types'

export const DEFAULT_CATS = [
  { id: 'presencial', name: 'Estudo presencial', color: '#cf7f7f' },
  { id: 'autonomo', name: 'Estudo autónomo', color: '#d89d5f' },
  { id: 'projetos', name: 'Projetos', color: '#7f9fc9' },
  { id: 'desloc', name: 'Deslocações', color: '#8bb08b' },
  { id: 'rotina', name: 'Rotina e casa', color: '#d2bd62' },
  { id: 'exercicio', name: 'Exercício', color: '#a692cc' },
  { id: 'lazer', name: 'Lazer e social', color: '#c98fb3' },
]
export const DEFAULT_SLEEP = { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' }

const item = z.object({ id: z.string() }).passthrough()
const schema = z.object({
  ev: z.array(item).default([]),
  tasks: z.array(item).default([]),
  workspaces: z.array(z.object({ id: z.string(), name: z.string() })).default([{ id: 'geral', name: 'Geral' }]),
  fin: z.array(item).default([]),
  days: z.array(item).default([]),
  cats: z.array(z.object({ id: z.string(), name: z.string(), color: z.string().regex(/^#[0-9a-f]{6}$/i) })).default(DEFAULT_CATS),
  sleep: z.object({}).passthrough().default({}),
  name: z.string().optional(),
  reset: z.string().default(''),
}).passthrough()

export const emptyData = (): AppData => ({
  ev: [], tasks: [], workspaces: [{ id: 'geral', name: 'Geral' }], fin: [], days: [], cats: DEFAULT_CATS.map(c => ({ ...c })),
  sleep: { ...DEFAULT_SLEEP }, reset: '',
})

/** Aceita tanto o formato exportado pela versão HTML ({app,v,data}) como o objeto direto. */
export function parseAppData(raw: unknown): AppData | null {
  const o = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown }).data : raw
  const r = schema.safeParse(o)
  if (!r.success) return null
  const d = r.data
  const workspaces = d.workspaces.length ? [...d.workspaces] : [{ id: 'geral', name: 'Geral' }]
  if (!workspaces.some(w => w.id === 'geral')) workspaces.unshift({ id: 'geral', name: 'Geral' })
  const workspaceIds = new Set(workspaces.map(w => w.id))
  const tasks = (d.tasks as unknown as AppData['tasks']).map(task => {
    const { lv, ...rest } = task
    return { ...rest, effort: task.effort ?? lv ?? '', workspaceId: task.workspaceId && workspaceIds.has(task.workspaceId) ? task.workspaceId : 'geral' }
  })
  return {
    ...(d as unknown as AppData),
    workspaces,
    tasks,
    sleep: { ...DEFAULT_SLEEP, ...(d.sleep as object) },
  }
}
