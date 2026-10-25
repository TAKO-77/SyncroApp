import { PALETTE, harmonizeDefaultColor } from './palette'
import { z } from 'zod'
import type { AppData } from '../types'

export const DEFAULT_CATS = [
  { id: 'presencial', name: 'Estudo presencial', color: PALETTE.clay },
  { id: 'autonomo', name: 'Estudo autónomo', color: PALETTE.gold },
  { id: 'projetos', name: 'Projetos', color: PALETTE.slate },
  { id: 'desloc', name: 'Deslocações', color: PALETTE.sage },
  { id: 'rotina', name: 'Rotina e casa', color: PALETTE.gold },
  { id: 'exercicio', name: 'Exercício', color: PALETTE.sage },
  { id: 'lazer', name: 'Lazer e social', color: PALETTE.clay },
]
export const DEFAULT_DAY_CATS = [
  { id: 'aniv', name: 'Aniversário', color: PALETTE.clay, icon: '🎂' },
  { id: 'exame', name: 'Exame', color: PALETTE.clay, icon: '📝' },
  { id: 'consulta', name: 'Consulta', color: PALETTE.sage, icon: '🩺' },
  { id: 'viagem', name: 'Viagem', color: PALETTE.slate, icon: '✈️' },
  { id: 'evento', name: 'Evento', color: PALETTE.gold, icon: '⭐' },
  { id: 'outro', name: 'Outro', color: PALETTE.neutral, icon: '📌' },
]
export const DEFAULT_SLEEP = { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' }

const item = z.object({ id: z.string() }).passthrough()
const category = z.object({ id: z.string(), name: z.string(), color: z.string().regex(/^#[0-9a-f]{6}$/i), icon: z.string().optional() })
const schema = z.object({
  ev: z.array(item).default([]),
  tasks: z.array(item).default([]),
  workspaces: z.array(z.object({ id: z.string(), name: z.string() })).default([{ id: 'geral', name: 'Geral' }]),
  fin: z.array(item).default([]),
  days: z.array(item).default([]),
  cats: z.array(category).default(DEFAULT_CATS),
  dayCats: z.array(category).default(DEFAULT_DAY_CATS),
  sleep: z.object({
    daily: z.array(z.object({
      bed: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      wake: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })).length(7).optional(),
  }).passthrough().default({}),
  name: z.string().optional(),
  photo: z.string().max(200000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).optional(),
  reset: z.string().default(''),
}).passthrough()

export const emptyData = (): AppData => ({
  ev: [], tasks: [], workspaces: [{ id: 'geral', name: 'Geral' }], fin: [], days: [], cats: DEFAULT_CATS.map(c => ({ ...c })),
  dayCats: DEFAULT_DAY_CATS.map(c => ({ ...c })),
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
    cats: d.cats.map(category => ({ ...category, color: harmonizeDefaultColor(category.id, category.color) })),
    tasks,
    sleep: { ...DEFAULT_SLEEP, ...(d.sleep as object) },
  }
}
