import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Chip } from '@/components/Chip'
import { EFFORT_COLORS, PRIORITY_COLORS } from '@/lib/taskColors'
import { EFFORTS, EFFORT_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/tasks'
import { spacing } from '@/lib/theme'
import type { Effort, Priority } from '@/types/tasks'

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
    <AppText variant="caption" tone="muted" style={styles.label}>{label}</AppText>
    {children}
  </View>
}

/** Effort choice; pressing the selected chip clears it. */
export function EffortChips({ value, onChange }: { value: Effort | ''; onChange: (effort: Effort | '') => void }) {
  return <ChipGroup label="Esforço">
    {EFFORTS.map(k => <Chip key={k} label={EFFORT_LABELS[k].name} hint={EFFORT_LABELS[k].hint} color={EFFORT_COLORS[k]}
      selected={value === k} onPress={() => onChange(value === k ? '' : k)} />)}
  </ChipGroup>
}

export function PriorityChips({ value, onChange }: { value: Priority; onChange: (priority: Priority) => void }) {
  return <ChipGroup label="Prioridade">
    {PRIORITIES.map(k => <Chip key={k} label={PRIORITY_LABELS[k]} color={PRIORITY_COLORS[k]} selected={value === k} onPress={() => onChange(k)} />)}
  </ChipGroup>
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  label: { minWidth: 72 },
})
