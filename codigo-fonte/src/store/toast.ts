import { create } from 'zustand'
export interface ToastAction { label: string; fn: () => void }
interface T { id: number; msg: string; actions: ToastAction[]; ms: number }
let timer: number | undefined, ends = 0, left = 0
export const useToast = create<{ t: T | null; show: (msg: string, actions?: ToastAction[]) => void; hide: () => void; pause: () => void; resume: () => void }>((set, get) => {
  const arm = (ms: number) => { clearTimeout(timer); ends = Date.now() + ms; timer = window.setTimeout(() => set({ t: null }), ms) }
  return {
    t: null,
    show: (msg, actions = []) => { const ms = actions.length > 1 ? 8000 : 5000; set({ t: { id: Date.now(), msg, actions, ms } }); arm(ms) },
    hide: () => { clearTimeout(timer); set({ t: null }) },
    // Hovering the toast stops the countdown, so there is time to read it or reach its action.
    pause: () => { if (get().t) { clearTimeout(timer); left = Math.max(0, ends - Date.now()) } },
    resume: () => { if (get().t) arm(left) },
  }
})
