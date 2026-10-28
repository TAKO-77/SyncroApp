import { supabase } from '@/lib/supabase'

// Generic Supabase queries for the per-user tables. Every table has primary key (user_id, id),
// row level security and soft deletes (`deleted`), so the desktop app's sync sees removals too.

export type Row = Record<string, unknown>
export type SyncedTable = 'events' | 'event_categories' | 'day_categories' | 'finances' | 'special_days' | 'workspaces'
const PAGE = 1000

/** Every live row of a table, ordered by `position`. */
export async function selectRows(table: SyncedTable, columns: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).eq('deleted', false).order('position').range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data as unknown as Row[]))
    if (data.length < PAGE) return out
  }
}

export async function upsertRows(table: SyncedTable, userId: string, rows: readonly Row[]) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows.map(r => ({ ...r, user_id: userId, deleted: false })), { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function softDeleteRow(table: SyncedTable, userId: string, id: string) {
  const { error } = await supabase.from(table).update({ deleted: true }).eq('user_id', userId).eq('id', id)
  if (error) throw error
}

/** The profile row, or null for an account that has never been synced. */
export async function selectProfile(): Promise<Row | null> {
  const { data, error } = await supabase.from('profiles').select('name,photo,sleep,reset').maybeSingle()
  if (error) throw error
  return data as Row | null
}

export async function upsertProfile(userId: string, row: Row) {
  const { error } = await supabase.from('profiles').upsert({ ...row, user_id: userId }, { onConflict: 'user_id' })
  if (error) throw error
}
