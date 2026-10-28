import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { DateField } from '@/components/DateField'
import { Dialog } from '@/components/Dialog'
import { EffortChips, PriorityChips } from '@/components/TaskOptions'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { NOTES_MAX, TITLE_MAX, type Validation } from '@/lib/tasks'
import { spacing } from '@/lib/theme'
import type { Task, TaskDraft, Workspace } from '@/types/tasks'

/** Dialog that edits every field of a task. */
export function TaskEditor({ task, workspaces, onSave, onDelete, onClose }: {
  task: Task; workspaces: readonly Workspace[]
  onSave: (draft: TaskDraft) => Validation<unknown>; onDelete: () => void; onClose: () => void
}) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState<TaskDraft>({ title: task.title, due: task.due, priority: task.priority, effort: task.effort, workspaceId: task.workspaceId, notes: task.notes, done: task.done })
  const [error, setError] = useState('')
  const set = (change: Partial<TaskDraft>) => { setDraft(d => ({ ...d, ...change })); setError('') }
  const save = () => { const result = onSave(draft); if (result.ok) onClose(); else setError(result.error) }

  return <Dialog title="Editar tarefa" onClose={onClose}>
    <TextField label="Nome" value={draft.title} onChangeText={title => set({ title })} maxLength={TITLE_MAX} />
    <View style={styles.field}>
      <AppText variant="caption" tone="muted">Data limite</AppText>
      <DateField label="Data limite" value={draft.due} onChange={due => set({ due })} />
    </View>
    <PriorityChips value={draft.priority} onChange={priority => set({ priority })} />
    <EffortChips value={draft.effort} onChange={effort => set({ effort })} />
    <View accessibilityRole="radiogroup" accessibilityLabel="Espaço de trabalho" style={styles.field}>
      <AppText variant="caption" tone="muted">Espaço de trabalho</AppText>
      <View style={styles.chips}>
        {workspaces.map(w => <Chip key={w.id} label={w.name} selected={draft.workspaceId === w.id} onPress={() => set({ workspaceId: w.id })} />)}
      </View>
    </View>
    <TextField label="Notas" value={draft.notes} onChangeText={notes => set({ notes })} maxLength={NOTES_MAX} multiline />
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: draft.done }} onPress={() => set({ done: !draft.done })} style={styles.doneRow}>
      <View style={[styles.box, { borderColor: draft.done ? colors.success : colors.muted, backgroundColor: draft.done ? colors.success : 'transparent' }]}>
        {draft.done && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
      </View>
      <AppText>Concluída</AppText>
    </Pressable>
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
    <View style={styles.actions}>
      <Button label="Apagar" variant="danger" onPress={() => { onDelete(); onClose() }} />
      <View style={styles.spacer} />
      <Button label="Cancelar" onPress={onClose} />
      <Button label="Guardar" variant="primary" onPress={save} />
    </View>
  </Dialog>
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  spacer: { flex: 1 },
})
