import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountGate } from './features/auth/AccountGate'
import './styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><AccountGate><App /></AccountGate></StrictMode>)
