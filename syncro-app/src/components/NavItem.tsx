import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { TabTriggerSlotProps } from 'expo-router/ui'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import type { Section } from '@/lib/sections'
import { radius, spacing } from '@/lib/theme'

export type NavVariant = 'sidebar' | 'rail' | 'bar'

/** One navigation entry; `TabTrigger asChild` supplies `isFocused` and the press handlers. */
export function NavItem({ section, variant, isFocused, ref, ...props }: TabTriggerSlotProps & { section: Section; variant: NavVariant }) {
  const { colors } = useTheme()
  const [hovered, setHovered] = useState(false)
  const Icon = section.icon
  const tint = isFocused ? colors.accent : hovered ? colors.text : colors.muted
  // expo-router/ui types the slot ref as a component ref; at runtime it is the Pressable's.
  return <Pressable ref={ref as never} {...props} accessibilityRole="tab" accessibilityLabel={section.label} accessibilityState={{ selected: isFocused }}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    style={({ pressed }) => [styles[variant], (isFocused || hovered) && variant !== 'bar' && { backgroundColor: isFocused ? colors.accentSoft : colors.surfaceRaised }, pressed && styles.pressed]}>
    <View style={variant === 'bar' && isFocused ? [styles.barPill, { backgroundColor: colors.accentSoft }] : styles.barPillIdle}>
      <Icon size={variant === 'bar' ? 22 : 20} color={tint} strokeWidth={1.5} />
    </View>
    {variant !== 'rail' && <AppText variant="caption" weight={isFocused ? 'semibold' : 'medium'} numberOfLines={1}
      style={[variant === 'bar' && styles.barLabel, { color: tint }]}>{section.label}</AppText>}
  </Pressable>
}

const styles = StyleSheet.create({
  sidebar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: 10, paddingHorizontal: spacing.md - 4, borderRadius: radius.sm },
  rail: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: radius.md },
  bar: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  barPill: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  barPillIdle: { paddingHorizontal: spacing.md, paddingVertical: 3 },
  barLabel: { fontSize: 11, lineHeight: 14 },
  pressed: { opacity: 0.7 },
})
