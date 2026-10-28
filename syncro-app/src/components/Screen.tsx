import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

/**
 * Page frame shared by every section: safe area, scrolling, responsive padding and the section title.
 * With `scroll={false}` the content fills the remaining height and scrolls itself (e.g. the Agenda grid).
 */
export function Screen({ title, subtitle, actions, scroll = true, children }: { title: string; subtitle?: string; actions?: ReactNode; scroll?: boolean; children?: ReactNode }) {
  const { colors } = useTheme()
  const breakpoint = useBreakpoint()
  const insets = useSafeAreaInsets()
  const mobile = breakpoint === 'mobile'
  const padding = { paddingTop: (mobile ? spacing.md : spacing.xl) + insets.top, paddingHorizontal: mobile ? spacing.md : spacing.xl }
  const content = <View style={[styles.inner, !scroll && styles.fill]}>
    <View style={styles.header}>
      <View style={styles.titles}>
        <AppText variant={breakpoint === 'desktop' ? 'h2' : 'h3'}>{title}</AppText>
        {subtitle && <AppText tone="muted">{subtitle}</AppText>}
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
    {children}
  </View>
  if (!scroll) return <View style={[styles.fill, styles.static, padding, { backgroundColor: colors.background, paddingBottom: spacing.md }]}>{content}</View>
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, padding]} keyboardShouldPersistTaps="handled">
    {content}
  </ScrollView>
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: spacing.xl },
  fill: { flex: 1 },
  static: { overflow: 'hidden' },
  inner: { width: '100%', maxWidth: 1100, gap: spacing.lg },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  titles: { gap: spacing.xs, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
