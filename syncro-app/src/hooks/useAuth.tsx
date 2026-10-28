import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'

export interface AuthUser { id: string; email: string }

interface AuthContextValue {
  /** False until the stored session has been read. */
  ready: boolean
  user: AuthUser | null
  configured: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const toUser = (s: Session | null): AuthUser | null => s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabaseConfigured)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    let active = true
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setUser(toUser(data.session)) })
      .catch(() => { /* no stored session */ })
      .finally(() => { if (active) setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep the same object while the account doesn't change, so screens don't reload on token refreshes.
      setUser(prev => { const next = toUser(session); return prev?.id === next?.id && prev?.email === next?.email ? prev : next })
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    user,
    configured: supabaseConfigured,
    signOut: async () => {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      setUser(null)
    },
  }), [ready, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}

/** The signed-in user; only for screens behind the sign-in guard. */
export function useUser(): AuthUser {
  const { user } = useAuth()
  if (!user) throw new Error('useUser needs a signed-in user')
  return user
}
