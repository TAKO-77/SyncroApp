import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { todayIso } from '@/lib/dates'

export type AgendaView = 'week' | 'day'

interface AgendaDateValue {
  date: string
  setDate: (date: string) => void
  view: AgendaView
  setView: (view: AgendaView) => void
  /** Shows a single day, e.g. when a day is picked in the Calendário. */
  openDay: (date: string) => void
}
const AgendaDateContext = createContext<AgendaDateValue | null>(null)

/** Day and view shown by the Agenda; other sections (Calendário, adição rápida) set them before opening the Agenda. */
export function AgendaDateProvider({ children }: { children: ReactNode }) {
  const mobile = useBreakpoint() === 'mobile'
  const [date, setDate] = useState(todayIso)
  // Phones start on the day view, wider screens on the week.
  const [view, setView] = useState<AgendaView>(() => (mobile ? 'day' : 'week'))
  const value = useMemo<AgendaDateValue>(() => ({
    date, setDate, view, setView,
    openDay: day => { setDate(day); setView('day') },
  }), [date, view])
  return <AgendaDateContext.Provider value={value}>{children}</AgendaDateContext.Provider>
}

export function useAgendaDate() {
  const value = useContext(AgendaDateContext)
  if (!value) throw new Error('useAgendaDate must be used inside AgendaDateProvider')
  return value
}
