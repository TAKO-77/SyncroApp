import { PALETTE, harmonizeDefaultColor } from './palette.ts'
import { NOTE_TEXT_MAX } from './taskNotes.ts'
import { DEFAULT_LANGUAGE, LANGUAGES } from './i18n/languages.ts'
import { z } from 'zod'
import type { AppData } from '../types'

const DEFAULT_CATS = [
  { id: 'presencial', name: 'Estudo presencial', color: PALETTE.clay },
  { id: 'autonomo', name: 'Estudo autónomo', color: PALETTE.gold },
  { id: 'projetos', name: 'Projetos', color: PALETTE.slate },
  { id: 'desloc', name: 'Deslocações', color: PALETTE.sage },
  { id: 'rotina', name: 'Rotina e casa', color: PALETTE.gold },
  { id: 'exercicio', name: 'Exercício', color: PALETTE.sage },
  { id: 'lazer', name: 'Lazer e social', color: PALETTE.clay },
]
const DEFAULT_DAY_CATS = [
  { id: 'aniv', name: 'Aniversário', color: PALETTE.clay, icon: '🎂' },
  { id: 'exame', name: 'Exame', color: PALETTE.clay, icon: '📝' },
  { id: 'consulta', name: 'Consulta', color: PALETTE.sage, icon: '🩺' },
  { id: 'viagem', name: 'Viagem', color: PALETTE.slate, icon: '✈️' },
  { id: 'evento', name: 'Evento', color: PALETTE.gold, icon: '⭐' },
  { id: 'outro', name: 'Outro', color: PALETTE.neutral, icon: '📌' },
]
const DEFAULT_SLEEP = { bed: '23:30', wake: '07:30', wk: false, bed2: '00:30', wake2: '09:30' }

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
  reset: z.string().max(32).catch(''),
  notes: z.array(z.object({ id: z.string(), workspaceId: z.string(), text: z.string().max(NOTE_TEXT_MAX) })).default([]),
  taskNotes: z.record(z.string()).optional(),
  reminders: z.array(item).default([]),
  notifyTasks: z.boolean().default(true),
  language: z.enum(LANGUAGES).catch(DEFAULT_LANGUAGE),
}).passthrough()

export const emptyData = (): AppData => ({
  ev: [], tasks: [], workspaces: [{ id: 'geral', name: 'Geral' }], fin: [], days: [], cats: DEFAULT_CATS.map(c => ({ ...c })),
  dayCats: DEFAULT_DAY_CATS.map(c => ({ ...c })),
  sleep: { ...DEFAULT_SLEEP }, reset: '', notes: [], reminders: [], notifyTasks: true, language: DEFAULT_LANGUAGE,
})

/** Accepts an export file ({app, v, data}, also from the old HTML version) or the data object itself. */
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
  // The single legacy note per workspace becomes a note with a fixed id, the same one the database migration uses.
  const notes = d.notes.filter(n => workspaceIds.has(n.workspaceId))
  for (const [workspaceId, text] of Object.entries(d.taskNotes ?? {})) {
    if (text && workspaceIds.has(workspaceId) && !notes.some(n => n.id === `n-${workspaceId}`)) notes.unshift({ id: `n-${workspaceId}`, workspaceId, text })
  }
  return {
    ...(d as unknown as AppData),
    workspaces,
    notes,
    taskNotes: {},
    cats: d.cats.map(category => ({ ...category, color: harmonizeDefaultColor(category.id, category.color) })),
    tasks,
    sleep: { ...DEFAULT_SLEEP, ...(d.sleep as object) },
  }
}
