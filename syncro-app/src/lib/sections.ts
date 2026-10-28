import { CalendarClock, CalendarDays, ListTodo, Settings, UserRound, Wallet, type LucideIcon } from 'lucide-react-native'
import type { Href } from 'expo-router'

export interface Section {
  name: string
  href: Href
  label: string
  icon: LucideIcon
  /** Shown apart from the main sections (bottom of the sidebar, last on the phone bar). */
  secondary?: boolean
}

// Same sections and order as the current web app.
export const SECTIONS: Section[] = [
  { name: 'index', href: '/', label: 'Agenda', icon: CalendarClock },
  { name: 'calendario', href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { name: 'tarefas', href: '/tarefas', label: 'Tarefas', icon: ListTodo },
  { name: 'financas', href: '/financas', label: 'Finanças', icon: Wallet },
  { name: 'perfil', href: '/perfil', label: 'Perfil', icon: UserRound },
  { name: 'definicoes', href: '/definicoes', label: 'Definições', icon: Settings, secondary: true },
]
