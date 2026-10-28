import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { ChipGroup } from '@/components/ChipGroup'
import { DateField } from '@/components/DateField'
import { Dialog } from '@/components/Dialog'
import { MonthField } from '@/components/MonthField'
import { SegmentedControl } from '@/components/SegmentedControl'
import { TextField } from '@/components/TextField'
import { FINANCE_CATEGORIES, FINANCE_NAME_MAX } from '@/lib/finances'
import type { Validation } from '@/lib/records'
import { spacing } from '@/lib/theme'
import type { FinanceDraft } from '@/types/finances'

export function FinanceEditor({ initial, isNew, onSave, onDelete, onClose }: {
  initial: FinanceDraft; isNew: boolean; onSave: (draft: FinanceDraft) => Validation<unknown>; onDelete: () => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const set = (change: Partial<FinanceDraft>) => { setDraft(d => ({ ...d, ...change })); setError('') }
  const save = () => { const r = onSave(draft); if (r.ok) onClose(); else setError(r.error) }
  const recurring = draft.kind === 'rec'

  return <Dialog title={isNew ? 'Novo registo' : 'Editar registo'} onClose={onClose}>
    <SegmentedControl label="Tipo" value={draft.type} onChange={type => set({ type })} options={[{ value: 'in', label: 'Ganho' }, { value: 'out', label: 'Despesa' }]} />
    <SegmentedControl label="Frequência" value={draft.kind} onChange={kind => set({ kind })} options={[{ value: 'rec', label: 'Mensal recorrente' }, { value: 'one', label: 'Esporádico' }]} />
    <TextField label="Descrição" value={draft.name} onChangeText={name => set({ name })} maxLength={FINANCE_NAME_MAX} autoFocus={isNew} />
    <TextField label="Valor (€)" value={draft.amount} onChangeText={amount => set({ amount: amount.replace(/[^\d.,]/g, '') })} keyboardType="decimal-pad" placeholder="0,00" />
    <View style={styles.row}>
      <View style={styles.field}><AppText variant="caption" tone="muted">{recurring ? 'Começa em' : 'Data'}</AppText><DateField label={recurring ? 'Começa em' : 'Data'} required value={draft.date} onChange={date => set({ date })} /></View>
      {recurring && <View style={styles.field}><AppText variant="caption" tone="muted">Termina em (opcional)</AppText><MonthField label="Termina em" value={draft.endMonth} min={draft.date.slice(0, 7)} onChange={endMonth => set({ endMonth })} /></View>}
    </View>
    {draft.type === 'out' && <ChipGroup label="Categoria">
      {FINANCE_CATEGORIES.map(c => <Chip key={c.id} label={c.name} color={c.color} selected={draft.categoryId === c.id} onPress={() => set({ categoryId: c.id })} />)}
    </ChipGroup>}
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
