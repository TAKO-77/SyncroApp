import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { cacheKey } from './useStore'

export interface AuthUser { id: string; email: string }
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
  try { if (user) localStorage.setItem(LAST_USER_KEY, JSON.stringify(user)); else localStorage.removeItem(LAST_USER_KEY) } catch { /* armazenamento indisponível */ }
}
function lastUserWithCache(): AuthUser | null {
  try {
    const user = JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? 'null') as AuthUser | null
    return user && localStorage.getItem(cacheKey(user.id)) ? user : null
  } catch { return null }
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
  remember(null)
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  useAuth.setState({ user: null, offline: false })
}
