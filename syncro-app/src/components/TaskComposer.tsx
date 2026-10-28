import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { DateField } from '@/components/DateField'
import { EffortChips, PriorityChips } from '@/components/TaskOptions'
import { TextField } from '@/components/TextField'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { shortDate } from '@/lib/dates'
import type { Validation } from '@/lib/records'
import { EFFORT_LABELS, PRIORITY_LABELS, TITLE_MAX } from '@/lib/tasks'
import { radius, spacing } from '@/lib/theme'
import type { Effort, Priority, TaskDraft } from '@/types/tasks'

/**
 * Form for a new task in the current workspace: a title field with an add button, and the
 * effort, priority and due date under "Mais opções" (open by default on wider screens).
 */
export function TaskComposer({ workspaceId, onAdd }: { workspaceId: string; onAdd: (draft: TaskDraft) => Validation<unknown> }) {
  const { colors } = useTheme()
  const mobile = useBreakpoint() === 'mobile'
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [effort, setEffort] = useState<Effort | ''>('')
  const [due, setDue] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const open = expanded ?? !mobile
  // What is set while the options are hidden, so nothing is chosen by surprise.
  const summary = [PRIORITY_LABELS[priority], effort && EFFORT_LABELS[effort].name, due && shortDate(due)].filter(Boolean).join(' · ')

  const submit = () => {
    const result = onAdd({ title, priority, effort, due, workspaceId, notes: '', done: false })
    if (!result.ok) return setError(result.error)
    setTitle(''); setPriority('media'); setEffort(''); setDue(''); setError('')
  }

  return <Card style={styles.card}>
    <View style={styles.row}>
      <View style={styles.input}>
        <TextField value={title} onChangeText={v => { setTitle(v); if (error) setError('') }} maxLength={TITLE_MAX} placeholder="Nova tarefa…"
          accessibilityLabel="Nova tarefa" returnKeyType="done" onSubmitEditing={submit} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Adicionar tarefa" onPress={submit}
        style={({ pressed }) => [styles.add, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
        <Plus size={22} color={colors.onAccent} strokeWidth={2} />
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(!open)} style={styles.toggle}>
      {open ? <ChevronUp size={16} color={colors.muted} strokeWidth={1.5} /> : <ChevronDown size={16} color={colors.muted} strokeWidth={1.5} />}
      <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.summary}>{open ? 'Menos opções' : `Mais opções · ${summary}`}</AppText>
    </Pressable>
    {open && <View style={styles.options}>
      <EffortChips value={effort} onChange={setEffort} />
      <PriorityChips value={priority} onChange={setPriority} />
      <View style={styles.due}>
        <AppText variant="caption" tone="muted" style={styles.dueLabel}>Data limite</AppText>
        <DateField label="Data limite" value={due} onChange={setDue} />
      </View>
    </View>}
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
  </Card>
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1 },
  add: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingVertical: 2 },
  summary: { flexShrink: 1 },
  options: { gap: spacing.md, paddingTop: spacing.xs },
  due: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dueLabel: { minWidth: 72 },
})
