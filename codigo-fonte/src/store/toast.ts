import { create } from 'zustand'
interface T { id: number; msg: string; ms: number }
const SHOW_MS = 5000
let timer: number | undefined, ends = 0, left = 0
export const useToast = create<{ t: T | null; show: (msg: string) => void; hide: () => void; pause: () => void; resume: () => void }>((set, get) => {
  const arm = (ms: number) => { clearTimeout(timer); ends = Date.now() + ms; timer = window.setTimeout(() => set({ t: null }), ms) }
  return {
    t: null,
    show: msg => { set({ t: { id: Date.now(), msg, ms: SHOW_MS } }); arm(SHOW_MS) },
    hide: () => { clearTimeout(timer); set({ t: null }) },
    // Hovering the toast stops the countdown, so there is time to read it or reach its action.
    pause: () => { if (get().t) { clearTimeout(timer); left = Math.max(0, ends - Date.now()) } },
    resume: () => { if (get().t) arm(left) },
  }
})
