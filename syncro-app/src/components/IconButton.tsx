import type { LucideIcon } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { radius } from '@/lib/theme'

/** Square button with only an icon; `label` is read by screen readers. */
export function IconButton({ icon: Icon, label, onPress, active }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme()
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }} hitSlop={4} onPress={onPress}
    style={({ pressed }) => [styles.button, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surface }, pressed && styles.pressed]}>
    <Icon size={20} color={active ? colors.accent : colors.text} strokeWidth={1.5} />
  </Pressable>
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
})
