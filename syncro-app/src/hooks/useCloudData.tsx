import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useUser } from '@/hooks/useAuth'
import { DEFAULT_DAY_CATEGORIES, DEFAULT_EVENT_CATEGORIES, categoryFromRow, dayCategoryToRow, eventCategoryToRow } from '@/lib/categories'
import { selectProfile, selectRows, softDeleteRow, upsertProfile, upsertRows, type Row, type SyncedTable } from '@/lib/cloud'
import { eventFromRow, eventToRow } from '@/lib/events'
import { financeFromRow, financeToRow } from '@/lib/finances'
import { EMPTY_PROFILE, profileFromRow, profileToRow } from '@/lib/profile'
import { specialDayFromRow, specialDayToRow } from '@/lib/specialDays'
import type { Category } from '@/types/categories'
import type { AgendaEvent } from '@/types/events'
import type { Finance } from '@/types/finances'
import type { Profile } from '@/types/profile'
import type { SpecialDay } from '@/types/specialDays'

/** Everything but the tasks (see `useTasks`), read from and written to Supabase. */
export interface CloudData {
  events: AgendaEvent[]
  eventCategories: Category[]
  dayCategories: Category[]
  finances: Finance[]
  specialDays: SpecialDay[]
  profile: Profile
}
export type CollectionKey = Exclude<keyof CloudData, 'profile'>
type Item<K extends CollectionKey> = CloudData[K][number]
interface Spec<T> { table: SyncedTable; columns: string; fromRow: (row: Row) => T; toRow: (item: T) => Row }

const COLLECTIONS: { [K in CollectionKey]: Spec<Item<K>> } = {
  events: { table: 'events', columns: 'id,title,date,start_time,end_time,rep,days,category_id,color,done,exceptions,position', fromRow: eventFromRow, toRow: eventToRow },
  eventCategories: { table: 'event_categories', columns: 'id,name,color,position', fromRow: categoryFromRow, toRow: eventCategoryToRow },
  dayCategories: { table: 'day_categories', columns: 'id,name,color,icon,position', fromRow: categoryFromRow, toRow: dayCategoryToRow },
  finances: { table: 'finances', columns: 'id,type,kind,name,amount,date,end_month,category_id,position', fromRow: financeFromRow, toRow: financeToRow },
  specialDays: { table: 'special_days', columns: 'id,name,category_id,start_date,end_date,time,notes,yearly,position', fromRow: specialDayFromRow, toRow: specialDayToRow },
}
const KEYS = Object.keys(COLLECTIONS) as CollectionKey[]
const EMPTY: CloudData = { events: [], eventCategories: [], dayCategories: [], finances: [], specialDays: [], profile: EMPTY_PROFILE }
const REFRESH_MS = 60 * 1000

export const toRows = <K extends CollectionKey>(key: K, items: readonly Item<K>[]) => items.map(i => COLLECTIONS[key].toRow(i))
export const sendItems = <K extends CollectionKey>(userId: string, key: K, items: readonly Item<K>[]) => upsertRows(COLLECTIONS[key].table, userId, toRows(key, items))
export const sendRemoval = (userId: string, key: CollectionKey, id: string) => softDeleteRow(COLLECTIONS[key].table, userId, id)

/** Replaces items with the same id and appends new ones. */
export const upsertById = <T extends { id: string }>(list: readonly T[], items: readonly T[]) =>
  [...list.map(x => items.find(i => i.id === x.id) ?? x), ...items.filter(i => !list.some(x => x.id === i.id))]

async function fetchAll(): Promise<{ data: CloudData; isNew: boolean }> {
  const [profile, ...lists] = await Promise.all([selectProfile(), ...KEYS.map(k => selectRows(COLLECTIONS[k].table, COLLECTIONS[k].columns))])
  const data = { ...EMPTY, profile: profileFromRow(profile) } as CloudData
  KEYS.forEach((k, i) => { const fromRow = COLLECTIONS[k].fromRow as (row: Row) => unknown; (data[k] as unknown[]) = lists[i].map(row => fromRow(row)) })
  return { data, isNew: !profile }
}

/** An account created here has no rows yet: give it the same defaults the web app creates. */
async function seedAccount(userId: string, data: CloudData): Promise<CloudData> {
  const seeded: CloudData = {
    ...data,
    eventCategories: data.eventCategories.length ? data.eventCategories : [...DEFAULT_EVENT_CATEGORIES],
    dayCategories: data.dayCategories.length ? data.dayCategories : [...DEFAULT_DAY_CATEGORIES],
  }
  await upsertProfile(userId, profileToRow(seeded.profile))
  await upsertRows('workspaces', userId, [{ id: 'geral', name: 'Geral', notes: '', position: 0 }])
  if (!data.eventCategories.length) await sendItems(userId, 'eventCategories', seeded.eventCategories)
  if (!data.dayCategories.length) await sendItems(userId, 'dayCategories', seeded.dayCategories)
  return seeded
}

interface CloudDataValue {
  state: 'loading' | 'ready' | 'error'
  error: string
  dismissError: () => void
  retry: () => void
  data: CloudData
  userId: string
  /** Shows `apply` at once and runs `send`; if it fails, reloads from the server and shows `failure`. */
  commit: (apply: (d: CloudData) => CloudData, send: () => Promise<void>, failure: string) => void
  save: <K extends CollectionKey>(key: K, items: Item<K> | Item<K>[], failure: string) => void
  remove: (key: CollectionKey, id: string, failure: string) => void
  saveProfile: (profile: Profile, failure: string) => void
}

const CloudDataContext = createContext<CloudDataValue | null>(null)

export function CloudDataProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const [data, setData] = useState<CloudData>(EMPTY)
  const [state, setState] = useState<CloudDataValue['state']>('loading')
  const [error, setError] = useState('')
  const loaded = useRef(false)
  // A refresh that started before a local change must not overwrite it.
  const pending = useRef(0)
  const version = useRef(0)

  const reload = useCallback(async () => {
    const started = version.current
    try {
      let { data: next, isNew } = await fetchAll()
      if (isNew) next = await seedAccount(user.id, next)
      if (pending.current === 0 && started === version.current) { setData(next); setState('ready'); loaded.current = true }
    } catch {
      if (loaded.current) setError('Sem ligação ao servidor. Os dados podem não estar atualizados.')
      else setState('error')
    }
  }, [user.id])

  useEffect(() => {
    void reload()
    const timer = setInterval(() => void reload(), REFRESH_MS)
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void reload() })
    return () => { clearInterval(timer); sub.remove() }
  }, [reload])

  const commit = useCallback((apply: (d: CloudData) => CloudData, send: () => Promise<void>, failure: string) => {
    version.current++
    pending.current++
    setError('')
    setData(apply)
    send()
      .then(() => { pending.current-- })
      .catch(() => { pending.current--; setError(failure); void reload() })
  }, [reload])

  const value = useMemo<CloudDataValue>(() => ({
    state, error, data, userId: user.id, commit,
    dismissError: () => setError(''),
    retry: () => { setState('loading'); void reload() },
    save: (key, items, failure) => {
      const list = Array.isArray(items) ? items : [items]
      commit(d => ({ ...d, [key]: upsertById(d[key] as { id: string }[], list) }), () => sendItems(user.id, key, list), failure)
    },
    remove: (key, id, failure) =>
      commit(d => ({ ...d, [key]: (d[key] as { id: string }[]).filter(x => x.id !== id) }), () => sendRemoval(user.id, key, id), failure),
    saveProfile: (profile, failure) =>
      commit(d => ({ ...d, profile }), () => upsertProfile(user.id, profileToRow(profile)), failure),
  }), [state, error, data, user.id, commit, reload])

  return <CloudDataContext.Provider value={value}>{children}</CloudDataContext.Provider>
}

export function useCloudData() {
  const value = useContext(CloudDataContext)
  if (!value) throw new Error('useCloudData must be used inside CloudDataProvider')
  return value
}
