import { create } from 'zustand'
export interface ToastAction { label: string; fn: () => void }
interface T { msg: string; actions: ToastAction[] }
let timer: number | undefined
export const useToast = create<{ t: T | null; show: (msg: string, actions?: ToastAction[]) => void; hide: () => void }>(set => ({
  t: null,
  show: (msg, actions = []) => { clearTimeout(timer); set({ t: { msg, actions } }); timer = window.setTimeout(() => set({ t: null }), actions.length > 1 ? 8000 : 5000) },
  hide: () => set({ t: null }),
}))
