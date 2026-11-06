export type SortBy = 'priority' | 'effort' | 'due' | 'custom'
export type SortMap = Record<string, SortBy>

const isSort = (v: unknown): v is SortBy => v === 'priority' || v === 'effort' || v === 'due' || v === 'custom'

/** The single sort saved before each workspace had its own; used until a workspace gets a choice. */
export const parseSort = (raw: string | null): SortBy => isSort(raw) ? raw : 'priority'

/** The saved sort of each workspace, ignoring anything invalid. */
export function parseSortMap(raw: string | null): SortMap {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, SortBy] => isSort(entry[1])))
  } catch { return {} }
}

export const withSort = (map: SortMap, workspaceId: string, sort: SortBy): SortMap => ({ ...map, [workspaceId]: sort })

export function withoutSort(map: SortMap, workspaceId: string): SortMap {
  const { [workspaceId]: _removed, ...rest } = map
  return rest
}

/** A saved list of task ids, or null when there is none. */
export function parseOrder(raw: string | null): string[] | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : null
  } catch { return null }
}

/** Tasks in the order of the list. Those not in it (new tasks) go last, keeping their order. */
export function orderByIds<T extends { id: string }>(tasks: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return tasks.map((task, index) => ({ task, index, at: rank.get(task.id) ?? Infinity }))
    .sort((a, b) => a.at === b.at ? a.index - b.index : a.at - b.at)
    .map(x => x.task)
}

/** The full order after a drag: the rows shown take the places they already held, so hidden tasks stay where they are. */
export function movedOrder(all: string[], shown: string[]): string[] {
  const moved = new Set(shown)
  let next = 0
  return all.map(id => moved.has(id) ? shown[next++] : id)
}
