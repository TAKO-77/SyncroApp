import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'
import { desktop } from './desktop'

// Service worker for the web/PWA build. A new version waits until the user chooses to reload, so an open form is never interrupted.
export const usePwa = create<{ needRefresh: boolean; reload: () => void; dismiss: () => void }>(set => ({
  needRefresh: false,
  reload: () => {},
  dismiss: () => set({ needRefresh: false }),
}))

export function initPwa() {
  if (desktop || import.meta.env.DEV || !('serviceWorker' in navigator)) return
  const update = registerSW({
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    // Installed apps can stay open for days; check for a new version every hour.
    onRegisteredSW: (_url, reg) => { if (reg) setInterval(() => { void reg.update() }, 60 * 60 * 1000) },
  })
  usePwa.setState({ reload: () => { void update(true) } })
}
