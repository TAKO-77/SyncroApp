import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { ChipGroup } from '@/components/ChipGroup'
import { DateField } from '@/components/DateField'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { TimeField } from '@/components/TimeField'
import { WEEKDAYS } from '@/lib/dates'
import { EVENT_TITLE_MAX, REPEAT_OPTIONS } from '@/lib/events'
import type { Validation } from '@/lib/records'
import { spacing } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { EventDraft } from '@/types/events'

/**
 * New or existing event. For an existing repeating event, `onDeleteDay` removes only the
 * occurrence that was opened and `onDeleteSeries` the whole series.
 */
export function EventEditor({ initial, isNew, repeating, categories, onSave, onDeleteDay, onDeleteSeries, onClose }: {
  initial: EventDraft; isNew: boolean; repeating: boolean; categories: readonly Category[]
  onSave: (draft: EventDraft) => Validation<unknown>; onDeleteDay: () => void; onDeleteSeries: () => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const set = (change: Partial<EventDraft>) => { setDraft(d => ({ ...d, ...change })); setError('') }
  const save = () => { const r = onSave(draft); if (r.ok) onClose(); else setError(r.error) }
  const toggleDay = (i: number) => set({ days: draft.days.includes(i) ? draft.days.filter(x => x !== i) : [...draft.days, i] })

  return <Dialog title={isNew ? 'Novo evento' : 'Editar evento'} onClose={onClose}>
    <TextField label="Título" value={draft.title} onChangeText={title => set({ title })} maxLength={EVENT_TITLE_MAX} autoFocus={isNew} />
    <View style={styles.row}>
      <View style={styles.field}><AppText variant="caption" tone="muted">Início</AppText><TimeField label="Início" required value={draft.start} onChange={start => set({ start })} /></View>
      <View style={styles.field}><AppText variant="caption" tone="muted">Fim</AppText><TimeField label="Fim" required value={draft.end} onChange={end => set({ end })} /></View>
      <View style={styles.field}><AppText variant="caption" tone="muted">Dia</AppText><DateField label="Dia" required value={draft.date} onChange={date => set({ date })} /></View>
    </View>
    <ChipGroup label="Repetir">
      {REPEAT_OPTIONS.map(o => <Chip key={o.value} label={o.label} selected={draft.repeat === o.value} onPress={() => set({ repeat: o.value })} />)}
    </ChipGroup>
    {draft.repeat === 'custom' && <ChipGroup label="Dias da semana">
      {WEEKDAYS.map((name, i) => <Chip key={name} label={name} selected={draft.days.includes(i)} onPress={() => toggleDay(i)} />)}
    </ChipGroup>}
    <ChipGroup label="Categoria">
      {categories.map(c => <Chip key={c.id} label={c.name} color={c.color} selected={draft.categoryId === c.id} onPress={() => set({ categoryId: c.id })} />)}
    </ChipGroup>
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
    <View style={styles.actions}>
      {!isNew && (repeating
        ? <><Button label="Apagar só este dia" variant="danger" onPress={() => { onDeleteDay(); onClose() }} /><Button label="Apagar série" variant="danger" onPress={() => { onDeleteSeries(); onClose() }} /></>
        : <Button label="Apagar" variant="danger" onPress={() => { onDeleteSeries(); onClose() }} />)}
      <View style={styles.spacer} />
      <Button label="Cancelar" onPress={onClose} />
      <Button label="Guardar" variant="primary" onPress={save} />
    </View>
  </Dialog>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  spacer: { flex: 1 },
})
