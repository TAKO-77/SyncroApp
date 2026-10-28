import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

/** Page frame shared by every section: safe area, scrolling, responsive padding and the section title. */
export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const { colors } = useTheme()
  const breakpoint = useBreakpoint()
  const insets = useSafeAreaInsets()
  const mobile = breakpoint === 'mobile'
  return <ScrollView style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.content, { paddingTop: (mobile ? spacing.md : spacing.xl) + insets.top, paddingHorizontal: mobile ? spacing.md : spacing.xl }]}>
    <View style={styles.inner}>
      <View style={styles.header}>
        <AppText variant={breakpoint === 'desktop' ? 'h2' : 'h3'}>{title}</AppText>
        {subtitle && <AppText tone="muted">{subtitle}</AppText>}
      </View>
      {children}
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: spacing.xl },
  inner: { width: '100%', maxWidth: 1100, gap: spacing.lg },
  header: { gap: spacing.xs },
})
