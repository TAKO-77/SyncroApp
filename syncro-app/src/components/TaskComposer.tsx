import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { DateField } from '@/components/DateField'
import { EffortChips, PriorityChips } from '@/components/TaskOptions'
import { TextField } from '@/components/TextField'
import { TITLE_MAX, type Validation } from '@/lib/tasks'
import { spacing } from '@/lib/theme'
import type { Effort, Priority, TaskDraft } from '@/types/tasks'

/** Form for a new task in the current workspace. */
export function TaskComposer({ workspaceId, onAdd }: { workspaceId: string; onAdd: (draft: TaskDraft) => Validation<unknown> }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [effort, setEffort] = useState<Effort | ''>('')
  const [due, setDue] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const result = onAdd({ title, priority, effort, due, workspaceId, notes: '', done: false })
    if (!result.ok) return setError(result.error)
    setTitle(''); setPriority('media'); setEffort(''); setDue(''); setError('')
  }

  return <Card style={styles.card}>
    <TextField value={title} onChangeText={v => { setTitle(v); if (error) setError('') }} maxLength={TITLE_MAX} placeholder="Nova tarefa…"
      accessibilityLabel="Nova tarefa" returnKeyType="done" onSubmitEditing={submit} />
    <EffortChips value={effort} onChange={setEffort} />
    <PriorityChips value={priority} onChange={setPriority} />
    <View style={styles.footer}>
      <DateField label="Data limite" value={due} onChange={setDue} />
      <Button variant="primary" label="Adicionar" onPress={submit} />
    </View>
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
  </Card>
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
})
