import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Device preferences other than the theme (see useTheme). Same keys and defaults as the web app.
const FOCUS_TIMER_KEY = 'syncro-focus-timer'

interface PreferencesValue { focusTimer: boolean; setFocusTimer: (enabled: boolean) => void }
const PreferencesContext = createContext<PreferencesValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [focusTimer, setFocusTimerState] = useState(true)
  useEffect(() => {
    AsyncStorage.getItem(FOCUS_TIMER_KEY).then(v => { if (v === 'false') setFocusTimerState(false) }).catch(() => { /* storage unavailable */ })
  }, [])
  const value = useMemo<PreferencesValue>(() => ({
    focusTimer,
    setFocusTimer: enabled => {
      setFocusTimerState(enabled)
      AsyncStorage.setItem(FOCUS_TIMER_KEY, String(enabled)).catch(() => { /* storage unavailable */ })
    },
  }), [focusTimer])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}
