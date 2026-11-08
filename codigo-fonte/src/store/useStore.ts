import { create } from 'zustand'
import type { AppData } from '../types'
import { emptyData, parseAppData } from '../lib/schema'
import { readFlag, readItem, writeItem } from '../lib/storage'

// Data saved before accounts existed, kept under the key of the original HTML version.
export const LEGACY_KEY = 'wayne'
const THEME_KEY = 'syncro-theme'
const SIDEBAR_AUTO_OPEN_KEY = 'syncro-sidebar-auto-open'
const FOCUS_TIMER_KEY = 'syncro-focus-timer'
const NOTIFICATIONS_KEY = 'syncro-notifications'
export const cacheKey = (userId: string) => `syncro-data:${userId}`

export function readData(key: string): AppData | null {
  const raw = readItem(key)
  try { return raw ? parseAppData(JSON.parse(raw)) : null } catch { return null }
}
const persist = (userId: string | null, d: AppData) => { if (userId) writeItem(cacheKey(userId), JSON.stringify(d)) }

export type Theme = 'dark' | 'light'
// Sets the theme on <html> and the browser/PWA status bar colour (the --bg token of each theme).
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#e9e9e5' : '#0c0d0d')
}
const initialTheme: Theme = readItem(THEME_KEY) === 'light' ? 'light' : 'dark'
applyTheme(initialTheme)

// Set by the sync engine so local changes are queued for upload.
let onCommit: (prev: AppData, next: AppData) => void = () => {}
export const setCommitListener = (fn: typeof onCommit) => { onCommit = fn }

interface Store {
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarAutoOpen: boolean
  setSidebarAutoOpen: (enabled: boolean) => void
  focusTimer: boolean
  setFocusTimer: (enabled: boolean) => void
  notifications: boolean
  setNotifications: (enabled: boolean) => void
  userId: string | null
  data: AppData
  history: string[]
  /** Loads a user's data without queueing it for upload. */
  hydrate: (userId: string | null, d: AppData) => void
  /** Replaces the data with what came from the server, without queueing it for upload. */
  applyRemote: (d: AppData) => void
  update: (fn: (d: AppData) => void) => void
  replace: (d: AppData) => void
  undo: () => void
}

export const useStore = create<Store>((set, get) => {
  const flag = (key: string, field: 'sidebarAutoOpen' | 'focusTimer' | 'notifications') =>
    (enabled: boolean) => { writeItem(key, String(enabled)); set({ [field]: enabled }) }
  return {
    theme: initialTheme,
    setTheme: theme => { writeItem(THEME_KEY, theme); applyTheme(theme); set({ theme }) },
    sidebarAutoOpen: readFlag(SIDEBAR_AUTO_OPEN_KEY),
    setSidebarAutoOpen: flag(SIDEBAR_AUTO_OPEN_KEY, 'sidebarAutoOpen'),
    focusTimer: readFlag(FOCUS_TIMER_KEY),
    setFocusTimer: flag(FOCUS_TIMER_KEY, 'focusTimer'),
    notifications: readFlag(NOTIFICATIONS_KEY),
    setNotifications: flag(NOTIFICATIONS_KEY, 'notifications'),
    userId: null,
    data: emptyData(),
    history: [],
    hydrate: (userId, d) => { persist(userId, d); set({ userId, data: d, history: [] }) },
    applyRemote: d => { persist(get().userId, d); set({ data: d, history: [] }) },
    update: fn => {
      const { data, history, userId } = get()
      const next = structuredClone(data)
      fn(next)
      persist(userId, next)
      set({ data: next, history: [...history.slice(-29), JSON.stringify(data)] })
      onCommit(data, next)
    },
    replace: d => get().update(x => Object.assign(x, d)),
    undo: () => {
      const { history, data, userId } = get()
      if (!history.length) return
      const prev = JSON.parse(history[history.length - 1]) as AppData
      persist(userId, prev)
      set({ data: prev, history: history.slice(0, -1) })
      onCommit(data, prev)
    },
  }
})
