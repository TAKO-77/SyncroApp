import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { cacheKey } from './useStore'
import { disablePush } from '../lib/push'
import { clearLocalCopy, flush, pendingOps, rejectedOps, stopSync } from '../lib/sync/engine'
import { readItem, readJson, removeItem, writeJson } from '../lib/storage'

interface AuthUser { id: string; email: string }
interface AuthState {
  ready: boolean
  user: AuthUser | null
  /** True when the session could not be refreshed and the app runs from the local cache. */
  offline: boolean
}

const LAST_USER_KEY = 'syncro-last-user'
export const useAuth = create<AuthState>(() => ({ ready: !supabaseConfigured, user: null, offline: false }))

const toUser = (s: Session | null): AuthUser | null => s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null
function remember(user: AuthUser | null) {
  if (user) writeJson(LAST_USER_KEY, user); else removeItem(LAST_USER_KEY)
}
function lastUserWithCache(): AuthUser | null {
  const user = readJson<AuthUser | null>(LAST_USER_KEY, null)
  return user && readItem(cacheKey(user.id)) ? user : null
}

let started = false
export function initAuth() {
  if (started || !supabaseConfigured) return
  started = true
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return
    const user = toUser(session)
    if (event === 'SIGNED_OUT') remember(null)
    else if (user) remember(user)
    useAuth.setState({ ready: true, user, offline: false })
  })
  void supabase.auth.getSession().then(({ data, error }) => {
    const user = toUser(data.session)
    if (user) { remember(user); useAuth.setState({ ready: true, user, offline: false }); return }
    // Without a connection the stored session cannot be refreshed; keep working from the cache.
    const last = error ? lastUserWithCache() : null
    useAuth.setState({ ready: true, user: last, offline: !!last })
  })
}

export async function signOut() {
  // While the session still allows it: this device must stop receiving this account's reminders.
  const id = useAuth.getState().user?.id
  // Still signed in here, so queued changes can be sent first.
  await flush().catch(() => undefined)
  await disablePush().catch(() => undefined)
  remember(null)
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  useAuth.setState({ user: null, offline: false })
  if (!id) return
  const keep = pendingOps(id) > 0 || rejectedOps(id) > 0
  // Stop the engine first so a running pull or check cannot write the keys again.
  stopSync()
  if (!keep) clearLocalCopy(id)
}
