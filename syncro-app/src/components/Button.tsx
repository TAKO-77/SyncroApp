import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ label, variant = 'secondary', busy, disabled, style, ...props }: Omit<PressableProps, 'children'> & {
  label: string; variant?: ButtonVariant; busy?: boolean
}) {
  const { colors } = useTheme()
  const tone = {
    primary: { background: colors.accent, border: colors.accent, text: colors.onAccent },
    secondary: { background: colors.surface, border: colors.border, text: colors.text },
    ghost: { background: 'transparent', border: 'transparent', text: colors.muted },
    danger: { background: 'transparent', border: colors.error, text: colors.error },
  }[variant]
  const off = disabled || busy
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!busy }} disabled={off} {...props}
    style={state => [styles.button, { backgroundColor: tone.background, borderColor: tone.border }, (state.pressed || off) && styles.dim, typeof style === 'function' ? style(state) : style]}>
    {busy ? <ActivityIndicator size="small" color={tone.text} /> : <AppText variant="caption" weight="semibold" style={{ color: tone.text }}>{label}</AppText>}
  </Pressable>
}

const styles = StyleSheet.create({
  button: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.6 },
})
