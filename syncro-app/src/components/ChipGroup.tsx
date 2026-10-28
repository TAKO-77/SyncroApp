import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { spacing } from '@/lib/theme'

/** Labelled set of `Chip`s that wraps onto several lines. */
export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
    <AppText variant="caption" tone="muted">{label}</AppText>
    <View style={styles.chips}>{children}</View>
  </View>
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
