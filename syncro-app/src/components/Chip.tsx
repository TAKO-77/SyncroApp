import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

/** Small selectable pill; `color` tints the dot and, when selected, the border and label. */
export function Chip({ label, color, selected, onPress, hint }: {
  label: string; color?: string; selected: boolean; onPress: () => void; hint?: string
}) {
  const { colors } = useTheme()
  const tint = color ?? colors.accent
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}
    style={({ pressed }) => [styles.chip, { borderColor: selected ? tint : colors.border, backgroundColor: selected ? colors.surfaceRaised : colors.surface }, pressed && styles.pressed]}>
    {color && <View style={[styles.dot, { backgroundColor: color }]} />}
    <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} style={{ color: selected ? colors.text : colors.muted }}>{label}</AppText>
  </Pressable>
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: spacing.sm + 2, borderWidth: 1, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.7 },
})
