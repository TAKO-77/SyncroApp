import { StyleSheet, View, type ViewProps } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme()
  return <View {...props} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} />
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
})
