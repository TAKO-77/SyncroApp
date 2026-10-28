import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ''
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

export const supabaseConfigured = /^https:\/\/\S+$/.test(url) && anonKey.length > 20

// The anon key is public by design; access is restricted by row level security.
export const supabase = createClient(supabaseConfigured ? url : 'https://not-configured.invalid', supabaseConfigured ? anonKey : 'not-configured', {
  auth: {
    storage: AsyncStorage,
    storageKey: 'syncro-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

// On phones, refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') void supabase.auth.startAutoRefresh()
    else void supabase.auth.stopAutoRefresh()
  })
}
