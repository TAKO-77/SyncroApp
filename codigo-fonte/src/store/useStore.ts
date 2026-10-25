import { create } from 'zustand'
import type { AppData } from '../types'
import { emptyData, parseAppData } from '../lib/schema'

// Mesma chave da versão HTML: se a origem (planner.local) for a mesma, os dados atuais são reaproveitados.
const KEY = 'wayne'
const SIDEBAR_AUTO_OPEN_KEY = 'syncro-sidebar-auto-open'
const FOCUS_TIMER_KEY = 'syncro-focus-timer'

function loadSidebarAutoOpen(): boolean {
  try { return localStorage.getItem(SIDEBAR_AUTO_OPEN_KEY) !== 'false' } catch { return true }
}

function loadFocusTimer(): boolean {
  try { return localStorage.getItem(FOCUS_TIMER_KEY) !== 'false' } catch { return true }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const d = parseAppData(JSON.parse(raw)); if (d) return d }
  } catch { /* dados corrompidos: começa vazio */ }
  return emptyData()
}
const persist = (d: AppData) => { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* quota */ } }

type Theme = 'dark' | 'light'
function loadTheme(): Theme {
  try { return localStorage.getItem('syncro-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

interface Store {
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarAutoOpen: boolean
  setSidebarAutoOpen: (enabled: boolean) => void
  focusTimer: boolean
  setFocusTimer: (enabled: boolean) => void
  data: AppData
  history: string[]
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
  data: load(),
  history: [],
  update: fn => {
    const { data, history } = get()
    const next = structuredClone(data)
    fn(next)
    persist(next)
    set({ data: next, history: [...history.slice(-29), JSON.stringify(data)] })
  },
  replace: d => get().update(x => Object.assign(x, d)),
  undo: () => {
    const { history } = get()
    if (!history.length) return
    const prev = JSON.parse(history[history.length - 1]) as AppData
    persist(prev)
    set({ data: prev, history: history.slice(0, -1) })
  },
}))
