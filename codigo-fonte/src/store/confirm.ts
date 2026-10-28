import { create } from 'zustand'
export interface ConfirmRequest { title: string; message?: string; confirmLabel?: string; danger?: boolean }
interface State { request: (ConfirmRequest & { resolve: (ok: boolean) => void }) | null }
export const useConfirm = create<State>(() => ({ request: null }))

/** Themed replacement for `window.confirm`; resolves to true when the user confirms. */
export function confirmDialog(request: ConfirmRequest): Promise<boolean> {
  useConfirm.getState().request?.resolve(false)
  return new Promise(resolve => useConfirm.setState({ request: { ...request, resolve } }))
}
