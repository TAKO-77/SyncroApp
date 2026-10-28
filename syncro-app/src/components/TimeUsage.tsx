import { useState } from 'react'
import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { Donut } from '@/components/Donut'
import { SegmentedControl } from '@/components/SegmentedControl'
import { addDays, formatDuration, todayIso, weekStart } from '@/lib/dates'
import { timeUsage } from '@/lib/profile'
import type { Category } from '@/types/categories'
import type { AgendaEvent } from '@/types/events'
import type { Sleep } from '@/types/profile'

type Period = 'week' | 'month'

function period(p: Period, today: string): [string, string] {
  if (p === 'week') { const start = weekStart(today); return [start, addDays(start, 6)] }
  const [y, m] = today.split('-').map(Number)
  return [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`]
}

/** "Onde gasto o tempo": planned time per category, sleep and free time this week or month. */
export function TimeUsage({ events, categories, sleep }: { events: readonly AgendaEvent[]; categories: readonly Category[]; sleep: Sleep }) {
  const [p, setP] = useState<Period>('week')
  const [from, to] = period(p, todayIso())
  const usage = timeUsage(events, categories, sleep, from, to)
  return <Card>
    <AppText weight="semibold">Onde gasto o tempo</AppText>
    <SegmentedControl label="Período" value={p} onChange={setP} options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }]} />
    {usage.planned ? <Donut slices={usage.slices} total={usage.total} format={formatDuration} centre={formatDuration(usage.planned)} centreLabel="planeadas" />
      : <AppText variant="caption" tone="muted">Ainda não há eventos neste período.</AppText>}
  </Card>
}
