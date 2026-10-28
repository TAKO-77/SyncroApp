import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SystemUI from 'expo-system-ui'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { palettes, type ColorScheme, type Palette } from '@/lib/theme'

export type ThemePreference = 'system' | ColorScheme

interface ThemeContextValue {
  scheme: ColorScheme
  colors: Palette
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

// Same key and values as the web app so the choice reads the same everywhere.
const STORAGE_KEY = 'syncro-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

const isPreference = (value: unknown): value is ThemePreference => value === 'system' || value === 'dark' || value === 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  // Dark is the default until the user chooses otherwise.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => { if (isPreference(saved)) setPreferenceState(saved) })
      .catch(() => { /* storage unavailable: keep the default */ })
  }, [])

  const scheme: ColorScheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference
  const colors = palettes[scheme]

  useEffect(() => { void SystemUI.setBackgroundColorAsync(colors.background) }, [colors.background])

  const value = useMemo<ThemeContextValue>(() => ({
    scheme,
    colors,
    preference,
    setPreference: next => {
      setPreferenceState(next)
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { /* storage unavailable */ })
    },
  }), [scheme, colors, preference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider')
  return theme
}
