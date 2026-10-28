import type { Category } from '../types/categories'
import { str, type Validation } from './records.ts'
import { tagColors } from './theme.ts'

// Agenda (`event_categories`) and Calendário (`day_categories`) categories. Pure.

export const CATEGORY_NAME_MAX = 40
/** Colours offered for categories: the shared tag palette. */
export const CATEGORY_COLORS: readonly string[] = [tagColors.gold, tagColors.sage, tagColors.slate, tagColors.clay, tagColors.neutral]

// Same ids, names and colours as the web app's defaults (codigo-fonte/src/lib/schema.ts).
const defaults = (list: { id: string; name: string; color: string; icon?: string }[]): Category[] =>
  list.map((c, position) => ({ icon: '', ...c, position }))
export const DEFAULT_EVENT_CATEGORIES: readonly Category[] = defaults([
  { id: 'presencial', name: 'Estudo presencial', color: tagColors.clay },
  { id: 'autonomo', name: 'Estudo autónomo', color: tagColors.gold },
  { id: 'projetos', name: 'Projetos', color: tagColors.slate },
  { id: 'desloc', name: 'Deslocações', color: tagColors.sage },
  { id: 'rotina', name: 'Rotina e casa', color: tagColors.gold },
  { id: 'exercicio', name: 'Exercício', color: tagColors.sage },
  { id: 'lazer', name: 'Lazer e social', color: tagColors.clay },
])
export const DEFAULT_DAY_CATEGORIES: readonly Category[] = defaults([
  { id: 'aniv', name: 'Aniversário', color: tagColors.clay, icon: '🎂' },
  { id: 'exame', name: 'Exame', color: tagColors.clay, icon: '📝' },
  { id: 'consulta', name: 'Consulta', color: tagColors.sage, icon: '🩺' },
  { id: 'viagem', name: 'Viagem', color: tagColors.slate, icon: '✈️' },
  { id: 'evento', name: 'Evento', color: tagColors.gold, icon: '⭐' },
  { id: 'outro', name: 'Outro', color: tagColors.neutral, icon: '📌' },
])

export const categoryFromRow = (row: Record<string, unknown>): Category =>
  ({ id: str(row.id), name: str(row.name), color: str(row.color) || tagColors.neutral, icon: str(row.icon), position: Number(row.position ?? 0) })

export const eventCategoryToRow = (c: Category) => ({ id: c.id, name: c.name, color: c.color, position: c.position })
export const dayCategoryToRow = (c: Category) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon || null, position: c.position })

export const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

/** First visible character (an emoji may span several code points). */
export function firstSymbol(v: string): string {
  const text = v.trim()
  if (!text) return ''
  const Segmenter = (Intl as { Segmenter?: new () => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter
  if (Segmenter) for (const part of new Segmenter().segment(text)) return part.segment
  return Array.from(text)[0]
}

export function validateCategory(c: Pick<Category, 'name' | 'color' | 'icon'>): Validation<Pick<Category, 'name' | 'color' | 'icon'>> {
  const name = c.name.trim()
  if (!name) return { ok: false, error: 'Indica o nome da categoria.' }
  if (name.length > CATEGORY_NAME_MAX) return { ok: false, error: `O nome pode ter até ${CATEGORY_NAME_MAX} caracteres.` }
  if (!isHexColor(c.color)) return { ok: false, error: 'Escolhe uma cor.' }
  return { ok: true, value: { name, color: c.color.toLowerCase(), icon: firstSymbol(c.icon) } }
}

/** Category to move items to when `id` is deleted (the first remaining one), like the web app. */
export const fallbackCategory = (list: readonly Category[], id: string) => list.find(c => c.id !== id)
