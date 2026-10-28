import type { LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

/** Input-styled button that opens a picker (date, time, month). */
export function FieldTrigger({ icon: Icon, label, text, empty, onPress }: { icon: LucideIcon; label: string; text: string; empty?: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${empty ? 'por definir' : text}`} onPress={onPress}
    style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
    <Icon size={16} color={empty ? colors.muted : colors.text} strokeWidth={1.5} />
    <AppText variant="caption" tone={empty ? 'muted' : 'text'}>{text}</AppText>
  </Pressable>
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.sm + 4, borderWidth: 1, borderRadius: radius.sm, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
})
