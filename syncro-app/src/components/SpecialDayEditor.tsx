import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { Chip } from '@/components/Chip'
import { ChipGroup } from '@/components/ChipGroup'
import { DateField } from '@/components/DateField'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { TimeField } from '@/components/TimeField'
import type { Validation } from '@/lib/records'
import { SPECIAL_DAY_NAME_MAX, SPECIAL_DAY_NOTES_MAX } from '@/lib/specialDays'
import { spacing } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { SpecialDayDraft } from '@/types/specialDays'

export function SpecialDayEditor({ initial, isNew, categories, onSave, onDelete, onClose }: {
  initial: SpecialDayDraft; isNew: boolean; categories: readonly Category[]
  onSave: (draft: SpecialDayDraft) => Validation<unknown>; onDelete: () => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const set = (change: Partial<SpecialDayDraft>) => { setDraft(d => ({ ...d, ...change })); setError('') }
  const save = () => { const r = onSave(draft); if (r.ok) onClose(); else setError(r.error) }
  // A new birthday repeats every year by default, like the web app.
  const pickCategory = (id: string) => set({ categoryId: id, yearly: isNew && id === 'aniv' ? true : draft.yearly })

  return <Dialog title={isNew ? 'Novo dia especial' : 'Editar dia especial'} onClose={onClose}>
    <TextField label="Título" value={draft.name} onChangeText={name => set({ name })} maxLength={SPECIAL_DAY_NAME_MAX} autoFocus={isNew} />
    <ChipGroup label="Categoria">
      {categories.map(c => <Chip key={c.id} label={`${c.icon ? `${c.icon} ` : ''}${c.name}`} color={c.color} selected={draft.categoryId === c.id} onPress={() => pickCategory(c.id)} />)}
    </ChipGroup>
    <View style={styles.row}>
      <View style={styles.field}><AppText variant="caption" tone="muted">Início</AppText><DateField label="Início" required value={draft.start} onChange={start => set({ start })} /></View>
      {!draft.yearly && <View style={styles.field}><AppText variant="caption" tone="muted">Fim (opcional)</AppText><DateField label="Fim" value={draft.end} min={draft.start} onChange={end => set({ end })} /></View>}
      <View style={styles.field}><AppText variant="caption" tone="muted">Hora (opcional)</AppText><TimeField label="Hora" value={draft.time} onChange={time => set({ time })} /></View>
    </View>
    <Checkbox label="Repete todos os anos" checked={draft.yearly} onChange={yearly => set({ yearly })} />
    <TextField label="Notas" value={draft.notes} onChangeText={notes => set({ notes })} maxLength={SPECIAL_DAY_NOTES_MAX} />
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
    <View style={styles.actions}>
      {!isNew && <Button label="Apagar" variant="danger" onPress={() => { onDelete(); onClose() }} />}
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
