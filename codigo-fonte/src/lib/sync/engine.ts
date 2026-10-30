import { create } from 'zustand'
import { supabase } from '../supabase'
import { emptyData, parseAppData } from '../schema'
import { LEGACY_KEY, cacheKey, readData, setCommitListener, useStore } from '../../store/useStore'
import type { AppData } from '../../types'
import { PROFILE_ID, TABLES, applyRemote, coalesce, diffRows, emptyRows, fromRows, mergeWithServer, toRows, type Row, type Rows, type SyncOp, type Table } from './rows'

// Local-first sync: every change is applied to the local cache immediately and queued in
// an outbox that is uploaded in the background. Remote changes are pulled by updated_at.

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
interface SyncState { status: SyncStatus; pending: number; rejected: number; lastSync: string | null }
export const useSync = create<SyncState>(() => ({ status: 'idle', pending: 0, rejected: 0, lastSync: null }))

type QueuedOp = SyncOp & { seq: number }
const PULL_OVERLAP_MS = 2 * 60 * 1000
const PULL_INTERVAL_MS = 60 * 1000
const PAGE = 1000

let userId: string | null = null
// Incremented on every start/stop so work from a previous session is discarded.
let generation = 0
let outbox: Record<string, QueuedOp> = {}
let seq = 0
let flushing: Promise<void> | null = null
let pulling: Promise<void> | null = null
// Set when a pull is requested (or discarded) while another runs, so a newer change is not missed.
let pullAgain = false
// Bumped after every upload so a pull that overlapped one does not apply rows older than the upload.
let uploads = 0
let flushTimer: number | undefined
let retryTimer: number | undefined
let retryDelay = 5000
let pullTimer: number | undefined
const keys = (id: string) => ({ outbox: `syncro-outbox:${id}`, pulled: `syncro-pulled:${id}`, rejected: `syncro-rejected:${id}` })
const opKey = (op: { table: Table; id: string }) => `${op.table}:${op.id}`

function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}
function saveOutbox() {
  if (!userId) return
  write(keys(userId).outbox, outbox)
  useSync.setState({ pending: Object.keys(outbox).length })
}

function enqueue(ops: SyncOp[]) {
  if (!ops.length) return
  for (const op of ops) outbox[opKey(op)] = { ...coalesce(outbox[opKey(op)], op), seq: ++seq }
  saveOutbox()
  clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => void flush(), 600)
}

setCommitListener((prev, next) => { if (userId) enqueue(diffRows(toRows(prev), toRows(next))) })

const toServer = (op: QueuedOp, uid: string): Row =>
  op.table === 'profiles' ? { ...op.row, user_id: uid } : { ...op.row, user_id: uid, deleted: op.deleted }
const conflictTarget = (table: Table) => (table === 'profiles' ? 'user_id' : 'user_id,id')
// Invalid data (constraint or type errors) will never succeed; anything else is retried later.
const isPermanent = (code?: string) => !!code && /^(22|23)/.test(code)

/** Current server rows for the operations that change only some columns; null when they cannot be read. */
async function serverRows(table: Table, ops: QueuedOp[], uid: string): Promise<Map<string, Row> | null> {
  const ids = ops.filter(op => op.fields).map(op => op.id)
  const out = new Map<string, Row>()
  for (let i = 0; i < ids.length; i += 100) {
    const q = supabase.from(table).select('*').eq('user_id', uid)
    const { data, error } = await (table === 'profiles' ? q : q.in('id', ids.slice(i, i + 100)))
    if (error) return null
    for (const row of data as Row[]) out.set(table === 'profiles' ? PROFILE_ID : String(row.id), row)
  }
  return out
}

async function upload(table: Table, ops: QueuedOp[], uid: string): Promise<{ done: QueuedOp[]; rejected: QueuedOp[]; retry: boolean }> {
  const server = await serverRows(table, ops, uid)
  if (!server) return { done: [], rejected: [], retry: true }
  const rows = ops.map(op => toServer({ ...op, row: mergeWithServer(op, server.get(op.id)) }, uid))
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictTarget(table) })
  uploads++
  if (!error) return { done: ops, rejected: [], retry: false }
  if (!isPermanent(error.code) || ops.length === 1) return isPermanent(error.code) ? { done: [], rejected: ops, retry: false } : { done: [], rejected: [], retry: true }
  // One bad row should not block the rest of the batch.
  const results = await Promise.all(ops.map(op => upload(table, [op], uid)))
  return { done: results.flatMap(r => r.done), rejected: results.flatMap(r => r.rejected), retry: results.some(r => r.retry) }
}

async function runFlush() {
  const uid = userId, gen = generation
  const batch = Object.values(outbox)
  if (!uid || !batch.length) return
  useSync.setState({ status: 'syncing' })
  let retry = false
  const rejected: QueuedOp[] = []
  // Profiles first so a new account exists before its rows; deletes after upserts.
  for (const table of TABLES) {
    const ops = batch.filter(op => op.table === table).sort((a, b) => Number(a.deleted) - Number(b.deleted))
    if (!ops.length) continue
    const r = await upload(table, ops, uid)
    if (gen !== generation) return
    for (const op of [...r.done, ...r.rejected]) if (outbox[opKey(op)]?.seq === op.seq) delete outbox[opKey(op)]
    rejected.push(...r.rejected)
    retry ||= r.retry
  }
  saveOutbox()
  if (rejected.length) {
    const log = [...read<QueuedOp[]>(keys(uid).rejected, []), ...rejected].slice(-50)
    write(keys(uid).rejected, log)
    useSync.setState({ rejected: log.length })
  }
  clearTimeout(retryTimer)
  if (retry) {
    useSync.setState({ status: navigator.onLine ? 'error' : 'offline' })
    retryTimer = window.setTimeout(() => void flush(), retryDelay)
    retryDelay = Math.min(retryDelay * 2, 5 * 60 * 1000)
    return
  }
  retryDelay = 5000
  useSync.setState({ status: useSync.getState().rejected ? 'error' : 'synced', lastSync: new Date().toISOString() })
  // Changes made while this flush was running.
  if (Object.keys(outbox).length) window.setTimeout(() => void flush(), 0)
  // Merged rows may carry columns changed on another device; fetch them now instead of waiting for the next pull.
  else if (batch.some(op => op.fields)) window.setTimeout(() => void pull(), 0)
}

export function flush(): Promise<void> {
  if (!flushing) flushing = runFlush().catch(() => { useSync.setState({ status: 'offline' }) }).finally(() => { flushing = null })
  return flushing
}

/** Fetches every row changed after `since` (all rows when null). Throws when offline. */
async function fetchChanges(since: string | null): Promise<{ table: Table; row: Row }[]> {
  const out: { table: Table; row: Row }[] = []
  for (const table of TABLES) {
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from(table).select('*').order('updated_at').range(from, from + PAGE - 1)
      if (since) q = q.gt('updated_at', since)
      const { data, error } = await q
      if (error) throw error
      out.push(...(data as Row[]).map(row => ({ table, row })))
      if (data.length < PAGE) break
    }
  }
  return out
}

const latest = (changes: { row: Row }[], fallback: string | null) =>
  changes.reduce<string | null>((max, { row }) => { const t = String(row.updated_at ?? ''); return !max || t > max ? t : max }, fallback)

export function pull(): Promise<void> {
  if (pulling) { pullAgain = true; return pulling }
  pulling = runPull().finally(() => {
    pulling = null
    if (pullAgain) { pullAgain = false; void pull() }
  })
  return pulling
}

async function runPull() {
  const uid = userId, gen = generation
  if (!uid) return
  if (flushing) await flushing
  const uploadsBefore = uploads
  const since = read<string | null>(keys(uid).pulled, null)
  const from = since ? new Date(new Date(since).getTime() - PULL_OVERLAP_MS).toISOString() : null
  try {
    const changes = await fetchChanges(from)
    if (gen !== generation) return
    if (uploads !== uploadsBefore) { pullAgain = true; return }
    write(keys(uid).pulled, latest(changes, since))
    if (!Object.keys(outbox).length && !useSync.getState().rejected) useSync.setState({ status: 'synced', lastSync: new Date().toISOString() })
    if (!changes.length) return
    const { data } = useStore.getState()
    const local = toRows(data)
    const merged = applyRemote(local, changes, new Set(Object.keys(outbox)))
    if (JSON.stringify(merged) === JSON.stringify(local)) return
    useStore.getState().applyRemote(parseAppData(fromRows(merged, data)) ?? data)
  } catch {
    useSync.setState({ status: navigator.onLine ? 'error' : 'offline' })
  }
}

const sync = () => { void flush().then(pull) }
const onFocus = () => sync()
const onOnline = () => { retryDelay = 5000; sync() }
// Phones rarely fire focus when an installed app returns from the background, and timers pause meanwhile.
const onVisible = () => { if (document.visibilityState === 'visible') sync() }

function startLoops() {
  addEventListener('focus', onFocus)
  addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  pullTimer = window.setInterval(sync, PULL_INTERVAL_MS)
  sync()
}

export function stopSync() {
  removeEventListener('focus', onFocus)
  removeEventListener('online', onOnline)
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(pullTimer); clearTimeout(flushTimer); clearTimeout(retryTimer)
  generation++
  userId = null; outbox = {}
  useStore.getState().hydrate(null, emptyData())
  useSync.setState({ status: 'idle', pending: 0, rejected: 0, lastSync: null })
}

function hasContent(d: AppData) {
  return d.ev.length > 0 || d.tasks.length > 0 || d.fin.length > 0 || d.days.length > 0 || !!d.name || !!d.photo || d.notes.some(n => n.text) || Object.values(d.taskNotes ?? {}).some(Boolean)
}
/** Keeps the pre-account data under another key so it is not offered again. */
function archiveLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw === null) return
    localStorage.setItem(`${LEGACY_KEY}-migrated`, raw)
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* armazenamento indisponível */ }
}

export type LegacyChoice = 'cloud' | 'local' | 'merge'
export type StartResult = { kind: 'ready' } | { kind: 'choose'; resolve: (choice: LegacyChoice) => void }

function begin(id: string) {
  generation++
  userId = id
  outbox = read<Record<string, QueuedOp>>(keys(id).outbox, {})
  seq = Math.max(0, ...Object.values(outbox).map(op => op.seq))
  useSync.setState({ status: 'idle', pending: Object.keys(outbox).length, rejected: read<QueuedOp[]>(keys(id).rejected, []).length })
}

/**
 * Loads the user's data. With a local cache the app opens immediately and syncs in the background.
 * Otherwise the account is downloaded (requires a connection); data saved on this computer before
 * accounts existed is uploaded when the account is empty, or the user chooses what to keep.
 */
export async function startSync(id: string): Promise<StartResult> {
  begin(id)
  const gen = generation
  const cached = readData(cacheKey(id))
  if (cached) {
    useStore.getState().hydrate(id, cached)
    startLoops()
    return { kind: 'ready' }
  }
  const changes = await fetchChanges(null)
  if (gen !== generation) return { kind: 'ready' }
  write(keys(id).pulled, latest(changes, null))
  const cloudRows = applyRemote(emptyRows(), changes, new Set())
  const cloudEmpty = changes.every(c => c.row.deleted)
  const legacy = readData(LEGACY_KEY)
  const finish = (data: AppData, from: Rows) => {
    useStore.getState().hydrate(id, data)
    enqueue(diffRows(from, toRows(data)))
    startLoops()
  }
  if (cloudEmpty) {
    finish(legacy ?? emptyData(), emptyRows())
    archiveLegacy()
    return { kind: 'ready' }
  }
  const cloud = parseAppData(fromRows(cloudRows, emptyData())) ?? emptyData()
  if (!legacy || !hasContent(legacy)) {
    finish(cloud, cloudRows)
    return { kind: 'ready' }
  }
  return {
    kind: 'choose',
    resolve: choice => {
      if (choice === 'cloud') finish(cloud, cloudRows)
      else if (choice === 'local') finish(legacy, cloudRows)
      else {
        // Union by id; when both sides have the same item the account's version is kept.
        const local = toRows(legacy), merged = emptyRows()
        for (const t of TABLES) merged[t] = { ...local[t], ...cloudRows[t] }
        finish(parseAppData(fromRows(merged, legacy)) ?? cloud, cloudRows)
      }
      archiveLegacy()
    },
  }
}
