import { create } from 'zustand'
import type { AppData } from '../types'
import { emptyData, parseAppData } from '../lib/schema'

// Data saved before accounts existed, kept under the key of the original HTML version.
export const LEGACY_KEY = 'wayne'
const SIDEBAR_AUTO_OPEN_KEY = 'syncro-sidebar-auto-open'
const FOCUS_TIMER_KEY = 'syncro-focus-timer'
export const cacheKey = (userId: string) => `syncro-data:${userId}`

function loadSidebarAutoOpen(): boolean {
  try { return localStorage.getItem(SIDEBAR_AUTO_OPEN_KEY) !== 'false' } catch { return true }
}

function loadFocusTimer(): boolean {
  try { return localStorage.getItem(FOCUS_TIMER_KEY) !== 'false' } catch { return true }
}

export function readData(key: string): AppData | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return parseAppData(JSON.parse(raw))
  } catch { /* dados corrompidos */ }
  return null
}
const persist = (userId: string | null, d: AppData) => {
  if (!userId) return
  try { localStorage.setItem(cacheKey(userId), JSON.stringify(d)) } catch { /* quota */ }
}

type Theme = 'dark' | 'light'
// Applies the theme to <html> and to the browser/PWA status bar colour (the --bg token of each theme).
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#e9e9e5' : '#0c0d0d')
}
function loadTheme(): Theme {
  try { return localStorage.getItem('syncro-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

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

export const useStore = create<Store>((set, get) => ({
  theme: loadTheme(),
  setTheme: theme => {
    try { localStorage.setItem('syncro-theme', theme) } catch { /* armazenamento indisponível */ }
    set({ theme })
  },
  sidebarAutoOpen: loadSidebarAutoOpen(),
  setSidebarAutoOpen: enabled => {
    try { localStorage.setItem(SIDEBAR_AUTO_OPEN_KEY, String(enabled)) } catch { /* armazenamento indisponível */ }
    set({ sidebarAutoOpen: enabled })
  },
  focusTimer: loadFocusTimer(),
  setFocusTimer: enabled => {
    try { localStorage.setItem(FOCUS_TIMER_KEY, String(enabled)) } catch { /* armazenamento indisponível */ }
    set({ focusTimer: enabled })
  },
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
}))
