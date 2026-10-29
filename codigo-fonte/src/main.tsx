import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountGate } from './features/auth/AccountGate'
import { DesktopOnly } from './features/auth/DesktopOnly'
import { desktop } from './lib/desktop'
import './styles.css'
import { ConfirmDialog } from './components/ConfirmDialog'
// The Vite dev server keeps working in a normal browser; production builds only run inside the Windows host.
const allowed = Boolean(desktop) || import.meta.env.DEV
createRoot(document.getElementById('root')!).render(<StrictMode>{allowed ? <><AccountGate><App /></AccountGate><ConfirmDialog /></> : <DesktopOnly />}</StrictMode>)
