import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

export interface PrimaryAction { label: string; icon: LucideIcon; onPress: () => void }

/** Floating round button for the section's main action on phones, above the bottom bar. */
function Fab({ action }: { action: PrimaryAction }) {
  const { colors } = useTheme()
  const Icon = action.icon
  return <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress}
    style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
    <Icon size={26} color={colors.onAccent} strokeWidth={2} />
  </Pressable>
}

/**
 * Page frame shared by every section: safe area, scrolling, responsive padding and the section title.
 * `primaryAction` is a button in the header on wider screens and a floating button on phones.
 * With `scroll={false}` the content fills the remaining height and scrolls itself (e.g. the Agenda grid).
 */
export function Screen({ title, subtitle, actions, primaryAction, scroll = true, children }: {
  title: string; subtitle?: string; actions?: ReactNode; primaryAction?: PrimaryAction; scroll?: boolean; children?: ReactNode
}) {
  const { colors } = useTheme()
  const breakpoint = useBreakpoint()
  const insets = useSafeAreaInsets()
  const mobile = breakpoint === 'mobile'
  const fab = mobile && primaryAction
  const padding = { paddingTop: (mobile ? spacing.md : spacing.xl) + insets.top, paddingHorizontal: mobile ? spacing.md : spacing.xl }
  const content = <View style={[styles.inner, mobile && styles.innerMobile, !scroll && styles.fill]}>
    <View style={styles.header}>
      <View style={styles.titles}>
        <AppText variant={breakpoint === 'desktop' ? 'h2' : 'h3'}>{title}</AppText>
        {subtitle && <AppText variant={mobile ? 'caption' : 'body'} tone="muted">{subtitle}</AppText>}
      </View>
      {(actions || (primaryAction && !mobile)) && <View style={styles.actions}>
        {actions}
        {primaryAction && !mobile && <Button label={primaryAction.label} variant="primary" onPress={primaryAction.onPress} />}
      </View>}
    </View>
    {children}
  </View>
  return <View style={[styles.fill, { backgroundColor: colors.background }]}>
    {scroll
      ? <ScrollView contentContainerStyle={[styles.content, padding, fab && styles.roomForFab]} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      : <View style={[styles.fill, styles.static, padding, { paddingBottom: spacing.md }]}>{content}</View>}
    {fab && <Fab action={primaryAction} />}
  </View>
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: spacing.xl },
  roomForFab: { paddingBottom: 96 },
  fill: { flex: 1 },
  static: { overflow: 'hidden' },
  inner: { width: '100%', maxWidth: 1100, gap: spacing.lg },
  innerMobile: { gap: spacing.md },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  titles: { gap: 2, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  pressed: { opacity: 0.8 },
})
