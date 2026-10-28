import { ChevronLeft, ChevronRight, Zap } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { AgendaGrid } from '@/components/AgendaGrid'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { CategoryManager } from '@/components/CategoryManager'
import { Chip } from '@/components/Chip'
import { EventEditor } from '@/components/EventEditor'
import { LoadState } from '@/components/LoadState'
import { Notice } from '@/components/Notice'
import { QuickAddDialog } from '@/components/QuickAddDialog'
import { Screen } from '@/components/Screen'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useAgendaDate } from '@/hooks/useAgendaDate'
import { useUser } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { useCloudData } from '@/hooks/useCloudData'
import { useNow } from '@/hooks/useNow'
import { useTheme } from '@/hooks/useTheme'
import { addDays, formatDuration, hm, longDate, parseIso, shortDate, toIso, weekStart } from '@/lib/dates'
import { applyEventDraft, durationOf, eventsOn, validateEventDraft, withoutOccurrence } from '@/lib/events'
import { guessCategory, type QuickEntry } from '@/lib/quickAdd'
import { newId, nextPosition } from '@/lib/records'
import { nextTaskPosition, upsertTask } from '@/lib/tasksApi'
import { spacing } from '@/lib/theme'
import type { AgendaEvent, EventDraft } from '@/types/events'

interface Editing { draft: EventDraft; event?: AgendaEvent; day: string }

const greeting = (hour: number) => (hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite')

export default function Agenda() {
  const { colors } = useTheme()
  const user = useUser()
  const cloud = useCloudData()
  const { events, profile, specialDays } = cloud.data
  const categories = useCategories('eventCategories')
  const { date, setDate, view, setView } = useAgendaDate()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [managing, setManaging] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [notice, setNotice] = useState('')
  const now = useNow()
  const today = toIso(now), nowMinute = now.getHours() * 60 + now.getMinutes()

  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i)) : [date]
  const first = days[0], last = days[days.length - 1]
  const label = view === 'week' ? `${shortDate(first)} – ${shortDate(last)} ${parseIso(last).getFullYear()}` : longDate(date)
  const planned = days.reduce((sum, d) => sum + eventsOn(events, d).filter(o => !categoryFilter || o.categoryId === categoryFilter).reduce((s, o) => s + durationOf(o), 0), 0)

  const openNew = (day: string, minute: number) => setEditing({
    day, draft: { title: '', date: day, start: hm(minute), end: hm(Math.min(minute + 60, 1439)), repeat: 'none', days: [], categoryId: categories.categories[0]?.id ?? '' },
  })
  const openEdit = (id: string, day: string) => {
    const e = events.find(x => x.id === id)
    if (e) setEditing({ day, event: e, draft: { title: e.title, date: e.date, start: e.start, end: e.end, repeat: e.repeat, days: e.days, categoryId: e.categoryId } })
  }
  const save = (base: AgendaEvent | undefined, draft: EventDraft) => {
    const result = validateEventDraft(draft)
    if (!result.ok) return result
    const color = categories.categories.find(c => c.id === result.value.categoryId)?.color ?? ''
    cloud.save('events', applyEventDraft(base, result.value, color, nextPosition(events)), 'Não foi possível guardar o evento.')
    setDate(result.value.date)
    return result
  }
  const addQuick = (entry: QuickEntry) => {
    if ('task' in entry) {
      nextTaskPosition()
        .then(position => upsertTask(user.id, { id: newId('t'), title: entry.task.slice(0, 90), due: '', priority: 'media', done: false, effort: '', workspaceId: 'geral', notes: '', position }))
        .then(() => setNotice(`Tarefa “${entry.task}” criada.`))
        .catch(() => setNotice('Não foi possível criar a tarefa. Verifica a ligação e tenta novamente.'))
      return
    }
    const categoryId = guessCategory(entry.title, categories.categories)
    save(undefined, { title: entry.title, date: entry.date, start: entry.start, end: entry.end, repeat: entry.repeat, days: [], categoryId })
    setNotice(`Evento “${entry.title}” criado.`)
  }

  return <Screen scroll={false} title={`${greeting(now.getHours())}${profile.name ? `, ${profile.name}` : '.'}`} subtitle={`${longDate(today)} · ${hm(nowMinute)}`}
    actions={<Button label="⚡ Adição rápida" onPress={() => setQuickAdd(true)} />}>
    <View style={styles.toolbar}>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Anterior" hitSlop={8} onPress={() => setDate(addDays(date, -days.length))}><ChevronLeft size={22} color={colors.text} strokeWidth={1.5} /></Pressable>
        <AppText weight="semibold" style={styles.label}>{label}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Seguinte" hitSlop={8} onPress={() => setDate(addDays(date, days.length))}><ChevronRight size={22} color={colors.text} strokeWidth={1.5} /></Pressable>
        <Button label="Hoje" variant="ghost" onPress={() => setDate(today)} />
      </View>
      <View style={styles.nav}>
        <SegmentedControl label="Vista" value={view} onChange={setView} options={[{ value: 'week', label: 'Semana' }, { value: 'day', label: 'Dia' }]} />
        <Button label="Categorias" onPress={() => setManaging(true)} />
        <Button label="Novo evento" variant="primary" onPress={() => openNew(date, date === today ? Math.min(nowMinute + 1, 1439) : 540)} />
      </View>
    </View>
    {categories.categories.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterBar}>
      <Chip label="Todas" selected={!categoryFilter} onPress={() => setCategoryFilter('')} />
      {categories.categories.map(c => <Chip key={c.id} label={c.name} color={c.color} selected={categoryFilter === c.id} onPress={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)} />)}
    </ScrollView>}
    <Notice message={cloud.error} onDismiss={cloud.dismissError} />
    <Notice message={notice} tone="info" onDismiss={() => setNotice('')} />
    {cloud.state !== 'ready' ? <LoadState state={cloud.state} what="a agenda" onRetry={cloud.retry} /> : <>
      <AgendaGrid days={days} today={today} nowMinute={nowMinute} events={events} categories={categories.categories} sleep={profile.sleep} specialDays={specialDays}
        categoryFilter={categoryFilter} onCreate={openNew} onOpen={o => openEdit(o.id, o.day)} />
      <AppText variant="caption" tone="muted">{planned ? `${formatDuration(planned)} planeadas ${view === 'week' ? 'esta semana' : 'neste dia'}` : 'Toca numa hora para criar um evento.'}</AppText>
    </>}

    {editing && <EventEditor initial={editing.draft} isNew={!editing.event} repeating={editing.event ? editing.event.repeat !== 'none' : false} categories={categories.categories}
      onSave={draft => save(editing.event, draft)}
      onDeleteDay={() => { if (editing.event) cloud.save('events', withoutOccurrence(editing.event, editing.day), 'Não foi possível apagar o evento.') }}
      onDeleteSeries={() => { if (editing.event) cloud.remove('events', editing.event.id, 'Não foi possível apagar o evento.') }}
      onClose={() => setEditing(null)} />}
    {managing && <CategoryManager title="Categorias da Agenda" description="Define o nome e a cor usadas nos eventos." categories={categories.categories} withIcon={false}
      onSave={categories.save} onCreate={categories.create} onDelete={categories.remove} onClose={() => setManaging(false)} />}
    {quickAdd && <QuickAddDialog onSubmit={addQuick} onClose={() => setQuickAdd(false)} />}
  </Screen>
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  nav: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  label: { minWidth: 150, textAlign: 'center' },
  filterBar: { flexGrow: 0 },
  filters: { gap: spacing.sm },
})
