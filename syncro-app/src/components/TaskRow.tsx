import { AlignLeft, Check, X } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { EFFORT_COLORS, PRIORITY_COLORS } from '@/lib/taskColors'
import { EFFORT_LABELS, PRIORITY_LABELS, dueLabel } from '@/lib/tasks'
import { radius, spacing } from '@/lib/theme'
import type { Task } from '@/types/tasks'

function Tag({ label, color, onPress, accessibilityLabel }: { label: string; color: string; onPress?: () => void; accessibilityLabel?: string }) {
  const { colors } = useTheme()
  return <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={accessibilityLabel ?? label} hitSlop={4}
    style={({ pressed }) => [styles.tag, { borderColor: color, backgroundColor: colors.surfaceRaised }, pressed && styles.pressed]}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <AppText variant="caption" style={styles.tagText}>{label}</AppText>
  </Pressable>
}

export function TaskRow({ task, today, onToggle, onEdit, onCyclePriority, onDelete }: {
  task: Task; today: string
  onToggle: () => void; onEdit: () => void; onCyclePriority: () => void; onDelete: () => void
}) {
  const { colors } = useTheme()
  const due = dueLabel(task.due, today)
  const priorityColor = PRIORITY_COLORS[task.priority]
  return <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: priorityColor }]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Concluída" accessibilityState={{ checked: task.done }} hitSlop={8} onPress={onToggle}
      style={[styles.check, { borderColor: task.done ? colors.success : colors.muted, backgroundColor: task.done ? colors.success : 'transparent' }]}>
      {task.done && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
    </Pressable>
    <View style={styles.body}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${task.title}`} onPress={onEdit}>
        <AppText style={[task.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{task.title}</AppText>
      </Pressable>
      <View style={styles.meta}>
        {!!task.notes && <AlignLeft size={14} color={colors.muted} strokeWidth={1.5} accessibilityLabel="Tem notas" />}
        {!!due.label && <AppText variant="caption" tone={due.late && !task.done ? 'error' : 'muted'}>{due.label}</AppText>}
        {!!task.effort && <Tag label={EFFORT_LABELS[task.effort].name} color={EFFORT_COLORS[task.effort]} />}
        <Tag label={PRIORITY_LABELS[task.priority]} color={priorityColor} onPress={onCyclePriority}
          accessibilityLabel={`Prioridade ${PRIORITY_LABELS[task.priority]}. Tocar para mudar.`} />
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Remover" hitSlop={8} onPress={onDelete} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
      <X size={18} color={colors.muted} strokeWidth={1.5} />
    </Pressable>
  </View>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4, padding: spacing.sm + 4, borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.md },
  check: { width: 22, height: 22, marginTop: 1, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 1, borderWidth: 1, borderRadius: radius.pill },
  tagText: { fontSize: 12, lineHeight: 18 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  remove: { padding: 2 },
  pressed: { opacity: 0.6 },
})
