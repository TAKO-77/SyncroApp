import { X } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

/** Dismissible message above a section's content (an error, or a confirmation); renders nothing when `message` is empty. */
export function Notice({ message, tone = 'error', onDismiss }: { message: string; tone?: 'error' | 'info'; onDismiss: () => void }) {
  const { colors } = useTheme()
  if (!message) return null
  const error = tone === 'error'
  return <View accessibilityRole={error ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={[styles.banner, { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface }]}>
    <AppText variant="caption" tone={error ? 'error' : 'text'} style={styles.text}>{message}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={8} onPress={onDismiss}><X size={16} color={colors.muted} strokeWidth={1.5} /></Pressable>
  </View>
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 4, borderWidth: 1, borderRadius: radius.sm },
  text: { flex: 1 },
})
