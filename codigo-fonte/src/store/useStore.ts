import { create } from 'zustand'
import type { AppData } from '../types'
import { emptyData, parseAppData } from '../lib/schema'

// Mesma chave da versão HTML: se a origem (planner.local) for a mesma, os dados atuais são reaproveitados.
const KEY = 'wayne'

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const d = parseAppData(JSON.parse(raw)); if (d) return d }
  } catch { /* dados corrompidos: começa vazio */ }
  return emptyData()
}
const persist = (d: AppData) => { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* quota */ } }

interface Store {
  data: AppData
  history: string[]
  update: (fn: (d: AppData) => void) => void
  replace: (d: AppData) => void
  undo: () => void
}

export const useStore = create<Store>((set, get) => ({
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
