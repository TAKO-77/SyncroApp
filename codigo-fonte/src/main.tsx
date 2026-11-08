import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountGate } from './features/auth/AccountGate'
import './styles.css'
import { ConfirmDialog } from './components/ConfirmDialog'
import { UpdateBanner } from './components/UpdateBanner'
import { initPwa } from './lib/pwa'
import { blockPhoneZoom } from './lib/phoneZoom'
import { shareBackgroundChoice } from './lib/notifications'
initPwa()
blockPhoneZoom()
shareBackgroundChoice()
createRoot(document.getElementById('root')!).render(<StrictMode><AccountGate><App /></AccountGate><ConfirmDialog /><UpdateBanner /></StrictMode>)
