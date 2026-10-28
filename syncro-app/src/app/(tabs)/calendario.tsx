import { router } from 'expo-router'
import { ChevronLeft, ChevronRight, Plus, Tags } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { CategoryManager } from '@/components/CategoryManager'
import { IconButton } from '@/components/IconButton'
import { LoadState } from '@/components/LoadState'
import { MonthCalendar } from '@/components/MonthCalendar'
import { Notice } from '@/components/Notice'
import { Screen } from '@/components/Screen'
import { SpecialDayEditor } from '@/components/SpecialDayEditor'
import { UpcomingDays } from '@/components/UpcomingDays'
import { useAgendaDate } from '@/hooks/useAgendaDate'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useCategories } from '@/hooks/useCategories'
import { useCloudData } from '@/hooks/useCloudData'
import { useTheme } from '@/hooks/useTheme'
import { addMonths, monthLabel, todayIso } from '@/lib/dates'
import { newId, nextPosition } from '@/lib/records'
import { validateSpecialDay } from '@/lib/specialDays'
import { spacing } from '@/lib/theme'
import type { SpecialDay, SpecialDayDraft } from '@/types/specialDays'

interface Editing { draft: SpecialDayDraft; item?: SpecialDay }

export default function Calendario() {
  const { colors } = useTheme()
  const cloud = useCloudData()
  const { specialDays } = cloud.data
  const categories = useCategories('dayCategories')
  const { openDay: showInAgenda } = useAgendaDate()
  const mobile = useBreakpoint() === 'mobile'
  const today = todayIso()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [editing, setEditing] = useState<Editing | null>(null)
  const [managing, setManaging] = useState(false)

  const openNew = () => {
    const list = categories.categories
    setEditing({ draft: { name: '', categoryId: list.some(c => c.id === 'evento') ? 'evento' : list[0]?.id ?? '', start: month === today.slice(0, 7) ? today : `${month}-01`, end: '', time: '', notes: '', yearly: false } })
  }
  const openEdit = (item: SpecialDay) => setEditing({ item, draft: { name: item.name, categoryId: item.categoryId, start: item.start, end: item.end, time: item.time, notes: item.notes, yearly: item.yearly } })
  const openDay = (day: string) => { showInAgenda(day); router.navigate('/') }
  const save = (item: SpecialDay | undefined, draft: SpecialDayDraft) => {
    const result = validateSpecialDay(draft)
    if (!result.ok) return result
    cloud.save('specialDays', item ? { ...item, ...result.value } : { ...result.value, id: newId('d'), position: nextPosition(specialDays) }, 'Não foi possível guardar o dia especial.')
    setMonth(result.value.start.slice(0, 7))
    return result
  }

  return <Screen title="Calendário" primaryAction={{ label: 'Novo dia especial', icon: Plus, onPress: openNew }}
    actions={mobile ? <IconButton icon={Tags} label="Categorias" onPress={() => setManaging(true)} /> : <Button label="Categorias" onPress={() => setManaging(true)} />}>
    <Notice message={cloud.error} onDismiss={cloud.dismissError} />
    {cloud.state !== 'ready' ? <LoadState state={cloud.state} what="o calendário" onRetry={cloud.retry} /> : <>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={10} onPress={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={24} color={colors.text} strokeWidth={1.5} /></Pressable>
        <AppText weight="semibold" style={styles.label}>{monthLabel(month)}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={10} onPress={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={24} color={colors.text} strokeWidth={1.5} /></Pressable>
        <Button label="Hoje" variant={month === today.slice(0, 7) ? 'ghost' : 'secondary'} onPress={() => setMonth(today.slice(0, 7))} />
      </View>
      <MonthCalendar month={month} today={today} specialDays={specialDays} categories={categories.categories} onOpenDay={openDay} onEdit={openEdit} />
      <AppText variant="caption" tone="muted">Toca num dia para o abrir na agenda, ou num dia especial para o editar.</AppText>
      <UpcomingDays today={today} specialDays={specialDays} categories={categories.categories} onEdit={openEdit} />
    </>}

    {editing && <SpecialDayEditor initial={editing.draft} isNew={!editing.item} categories={categories.categories}
      onSave={draft => save(editing.item, draft)}
      onDelete={() => { if (editing.item) cloud.remove('specialDays', editing.item.id, 'Não foi possível apagar o dia especial.') }}
      onClose={() => setEditing(null)} />}
    {managing && <CategoryManager title="Categorias do Calendário" description="Define o nome, o emoji e a cor usados nos dias especiais." categories={categories.categories} withIcon
      onSave={categories.save} onCreate={categories.create} onDelete={categories.remove} onClose={() => setManaging(false)} />}
  </Screen>
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, maxWidth: 220, textAlign: 'center' },
})
