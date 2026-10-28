import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountGate } from './features/auth/AccountGate'
import './styles.css'
import { ConfirmDialog } from './components/ConfirmDialog'
createRoot(document.getElementById('root')!).render(<StrictMode><AccountGate><App /></AccountGate><ConfirmDialog /></StrictMode>)
