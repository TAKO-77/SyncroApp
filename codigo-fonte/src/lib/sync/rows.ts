import type { AppData, Effort, Priority, Rep, Sleep } from '../../types'

// Maps the local AppData document to the Supabase tables and back.
// Kept free of runtime imports so scripts/test-sync.ts can run it with Node directly.

export const TABLES = ['profiles', 'workspaces', 'tasks', 'event_categories', 'day_categories', 'events', 'finances', 'special_days', 'workspace_notes'] as const
export type Table = typeof TABLES[number]
export type Row = Record<string, unknown>
export type Rows = Record<Table, Record<string, Row>>
/** Keys set and removed in an object column. */
export interface MapPatch { set: Record<string, unknown>; del: string[] }
/**
 * `fields` lists the columns changed locally; without it (new rows, deletes) the whole row is sent.
 * `maps` holds the key-level change of object columns, so edits to other keys elsewhere are kept.
 */
export interface SyncOp { table: Table; id: string; row: Row; deleted: boolean; fields?: string[]; maps?: Record<string, MapPatch> }

export const PROFILE_ID = 'profile'
const FIELDS: Record<Table, readonly string[]> = {
  profiles: ['name', 'photo', 'sleep', 'reset'],
  workspaces: ['id', 'name', 'notes', 'position'],
  tasks: ['id', 'title', 'due', 'priority', 'done', 'done_at', 'effort', 'workspace_id', 'notes', 'position'],
  event_categories: ['id', 'name', 'color', 'position'],
  day_categories: ['id', 'name', 'color', 'icon', 'position'],
  events: ['id', 'title', 'date', 'start_time', 'end_time', 'rep', 'days', 'category_id', 'color', 'done', 'exceptions', 'position'],
  finances: ['id', 'type', 'kind', 'name', 'amount', 'date', 'end_month', 'category_id', 'position'],
  special_days: ['id', 'name', 'category_id', 'start_date', 'end_date', 'time', 'notes', 'yearly', 'position'],
  workspace_notes: ['id', 'workspace_id', 'text', 'position'],
}

/** Keeps only the synced columns, in a fixed order, so rows can be compared as JSON. */
export function canonical(table: Table, row: Row): Row {
  const out: Row = {}
  for (const f of FIELDS[table]) out[f] = f === 'amount' || f === 'position' ? Number(row[f] ?? 0) : row[f] ?? null
  return out
}

const byId = <T extends { id: string }>(table: Table, items: T[], map: (item: T, position: number) => Row) =>
  Object.fromEntries(items.map((item, i) => [item.id, canonical(table, map(item, i))]))

export function toRows(d: AppData): Rows {
  return {
    profiles: { [PROFILE_ID]: canonical('profiles', { name: d.name ?? '', photo: d.photo ?? null, sleep: d.sleep, reset: d.reset ?? '' }) },
    workspaces: byId('workspaces', d.workspaces, (w, position) => ({ ...w, notes: d.taskNotes?.[w.id] ?? '', position })),
    tasks: byId('tasks', d.tasks, (t, position) => ({ id: t.id, title: t.t, due: t.due || null, priority: t.p, done: t.d, done_at: t.doneAt || null, effort: t.effort || null, workspace_id: t.workspaceId ?? 'geral', notes: t.n ?? '', position })),
    event_categories: byId('event_categories', d.cats, (c, position) => ({ ...c, position })),
    day_categories: byId('day_categories', d.dayCats, (c, position) => ({ ...c, icon: c.icon ?? null, position })),
    events: byId('events', d.ev, (e, position) => ({ id: e.id, title: e.title, date: e.date, start_time: e.start, end_time: e.end, rep: e.rep, days: e.days ?? null, category_id: e.cat, color: e.color ?? null, done: e.done ?? {}, exceptions: e.ex ?? null, position })),
    finances: byId('finances', d.fin, (f, position) => ({ id: f.id, type: f.t, kind: f.k, name: f.n, amount: f.a, date: f.date, end_month: f.end ?? '', category_id: f.c ?? '', position })),
    special_days: byId('special_days', d.days, (x, position) => ({ id: x.id, name: x.n, category_id: x.ty, start_date: x.s, end_date: x.e || null, time: x.h ?? '', notes: x.o ?? '', yearly: x.y, position })),
    workspace_notes: byId('workspace_notes', d.notes ?? [], (n, position) => ({ id: n.id, workspace_id: n.workspaceId, text: n.text, position })),
  }
}

const ordered = (rows: Record<string, Row>) => Object.values(rows).sort((a, b) => Number(a.position) - Number(b.position))
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const opt = <T>(v: unknown) => (v === null || v === undefined ? undefined : v as T)

/** Rebuilds the AppData fields that are stored in the cloud; `base` supplies anything else. */
export function fromRows(rows: Rows, base: AppData): AppData {
  const p = rows.profiles[PROFILE_ID]
  const workspaces = ordered(rows.workspaces)
  return {
    ...base,
    name: p ? str(p.name) || undefined : base.name,
    photo: p ? opt<string>(p.photo) : base.photo,
    sleep: p?.sleep ? p.sleep as Sleep : base.sleep,
    reset: p ? str(p.reset) : base.reset,
    workspaces: workspaces.map(w => ({ id: str(w.id), name: str(w.name) })),
    taskNotes: Object.fromEntries(workspaces.filter(w => w.notes).map(w => [str(w.id), str(w.notes)])),
    tasks: ordered(rows.tasks).map(t => ({ id: str(t.id), t: str(t.title), due: str(t.due), p: t.priority as Priority, d: Boolean(t.done), effort: (t.effort ?? '') as Effort | '', workspaceId: str(t.workspace_id) || 'geral', ...(t.done_at ? { doneAt: str(t.done_at) } : {}), ...(t.notes ? { n: str(t.notes) } : {}) })),
    cats: ordered(rows.event_categories).map(c => ({ id: str(c.id), name: str(c.name), color: str(c.color) })),
    dayCats: ordered(rows.day_categories).map(c => ({ id: str(c.id), name: str(c.name), color: str(c.color), ...(c.icon ? { icon: str(c.icon) } : {}) })),
    ev: ordered(rows.events).map(e => ({ id: str(e.id), title: str(e.title), date: str(e.date), start: str(e.start_time), end: str(e.end_time), rep: e.rep as Rep, cat: str(e.category_id), done: (e.done ?? {}) as Record<string, boolean>, ...(e.days ? { days: e.days as number[] } : {}), ...(e.color ? { color: str(e.color) } : {}), ...(e.exceptions ? { ex: e.exceptions as AppData['ev'][number]['ex'] } : {}) })),
    fin: ordered(rows.finances).map(f => ({ id: str(f.id), t: f.type as 'in' | 'out', k: f.kind as 'rec' | 'one', n: str(f.name), a: Number(f.amount), date: str(f.date), end: str(f.end_month), c: str(f.category_id) })),
    days: ordered(rows.special_days).map(x => ({ id: str(x.id), n: str(x.name), ty: str(x.category_id), s: str(x.start_date), e: str(x.end_date), h: str(x.time), o: str(x.notes), y: Boolean(x.yearly) })),
    notes: ordered(rows.workspace_notes).map(n => ({ id: str(n.id), workspaceId: str(n.workspace_id), text: str(n.text) })),
  }
}

/** Row-level changes needed to turn `prev` into `next`. Removed rows become soft deletes. */
export function diffRows(prev: Rows, next: Rows): SyncOp[] {
  const ops: SyncOp[] = []
  for (const table of TABLES) {
    const a = prev[table], b = next[table]
    for (const [id, row] of Object.entries(b)) {
      if (!a[id]) { ops.push({ table, id, row, deleted: false }); continue }
      const fields = FIELDS[table].filter(f => JSON.stringify(a[id][f]) !== JSON.stringify(row[f]))
      if (!fields.length) continue
      const maps: Record<string, MapPatch> = {}
      for (const f of fields) { const p = mapPatch(a[id][f], row[f]); if (p) maps[f] = p }
      ops.push({ table, id, row, deleted: false, fields, ...(Object.keys(maps).length ? { maps } : {}) })
    }
    for (const [id, row] of Object.entries(a)) if (!b[id]) ops.push({ table, id, row, deleted: true })
  }
  return ops
}

const isMap = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
/** Key-level change of an object column (e.g. events.done by date), or undefined when the column is not an object. */
function mapPatch(prev: unknown, next: unknown): MapPatch | undefined {
  if (!isMap(next) || (prev != null && !isMap(prev))) return undefined
  const before = (prev ?? {}) as Record<string, unknown>
  const set: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(next)) if (JSON.stringify(before[k]) !== JSON.stringify(v)) set[k] = v
  return { set, del: Object.keys(before).filter(k => !(k in next)) }
}

/** Combines a queued operation with a newer one for the same row, keeping every changed column. */
export function coalesce(prev: SyncOp | undefined, next: SyncOp): SyncOp {
  if (!prev || !next.fields) return next
  // A row created (or deleted) locally and not yet sent must still be sent whole.
  if (!prev.fields || prev.deleted) return { table: next.table, id: next.id, row: next.row, deleted: false }
  const fields = [...new Set([...prev.fields, ...next.fields])]
  const maps: Record<string, MapPatch> = {}
  for (const f of fields) {
    // undefined: the operation did not touch the column; null: it replaced the whole value.
    const a = prev.fields.includes(f) ? prev.maps?.[f] ?? null : undefined
    const b = next.fields.includes(f) ? next.maps?.[f] ?? null : undefined
    if (a === null || b === null) continue
    if (!a || !b) { maps[f] = (a ?? b)!; continue }
    const set = { ...a.set, ...b.set }
    for (const k of b.del) delete set[k]
    maps[f] = { set, del: [...new Set([...a.del.filter(k => !(k in b.set)), ...b.del])] }
  }
  return { table: next.table, id: next.id, row: next.row, deleted: false, fields, ...(Object.keys(maps).length ? { maps } : {}) }
}

/**
 * Row to upload: the current server values with only the locally changed columns replaced,
 * so edits made on another device to other columns of the same row are kept. Object columns
 * only change the keys edited locally.
 */
export function mergeWithServer(op: SyncOp, server: Row | undefined): Row {
  if (!op.fields || !server) return op.row
  const out = canonical(op.table, server)
  for (const f of op.fields) {
    const patch = op.maps?.[f]
    if (!patch) { out[f] = op.row[f]; continue }
    const merged: Record<string, unknown> = isMap(out[f]) ? { ...out[f] } : {}
    for (const k of patch.del) delete merged[k]
    out[f] = Object.assign(merged, patch.set)
  }
  return out
}

export const emptyRows = (): Rows => Object.fromEntries(TABLES.map(t => [t, {}])) as unknown as Rows

/** Applies rows pulled from the server, skipping rows with local changes still waiting to be sent. */
export function applyRemote(local: Rows, remote: { table: Table; row: Row }[], pending: Set<string>): Rows {
  const next = Object.fromEntries(TABLES.map(t => [t, { ...local[t] }])) as unknown as Rows
  for (const { table, row } of remote) {
    const id = table === 'profiles' ? PROFILE_ID : String(row.id)
    if (pending.has(`${table}:${id}`)) continue
    if (row.deleted) delete next[table][id]
    else next[table][id] = canonical(table, row)
  }
  return next
}
