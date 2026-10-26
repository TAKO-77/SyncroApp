import { createClient } from '@supabase/supabase-js'

export const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
export const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const supabaseConfigured = /^https:\/\/\S+$/.test(url) && anonKey.length > 20

// The anon key is public by design; access is restricted by row level security.
export const supabase = createClient(supabaseConfigured ? url : 'https://not-configured.invalid', supabaseConfigured ? anonKey : 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'syncro-auth' },
})
