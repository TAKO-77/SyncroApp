import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

/** Loading spinner or load error with a retry button; renders nothing once the data is ready. */
export function LoadState({ state, what, onRetry }: { state: 'loading' | 'ready' | 'error'; what: string; onRetry: () => void }) {
  const { colors } = useTheme()
  if (state === 'loading') return <View style={styles.center}><ActivityIndicator color={colors.accent} accessibilityLabel={`A carregar ${what}`} /></View>
  if (state === 'ready') return null
  return <Card>
    <AppText weight="semibold">Não foi possível carregar {what}</AppText>
    <AppText variant="caption" tone="muted">Verifica a ligação à Internet e tenta novamente.</AppText>
    <Button label="Tentar novamente" onPress={onRetry} style={styles.retry} />
  </Card>
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  retry: { alignSelf: 'flex-start' },
})
