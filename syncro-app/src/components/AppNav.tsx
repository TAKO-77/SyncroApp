import { Image, StyleSheet, View } from 'react-native'
import { TabTrigger } from 'expo-router/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { FocusTimer } from '@/components/FocusTimer'
import { NavItem, type NavVariant } from '@/components/NavItem'
import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'
import { SECTIONS, type Section } from '@/lib/sections'
import { brand, spacing } from '@/lib/theme'

const logo = require('../../assets/images/syncro-icon.png')

const trigger = (section: Section, variant: NavVariant) =>
  <TabTrigger key={section.name} name={section.name} asChild><NavItem section={section} variant={variant} /></TabTrigger>

/** Sidebar with labels on desktop, icon rail on tablet. */
export function SideNav({ compact }: { compact: boolean }) {
  const { colors } = useTheme()
  const { focusTimer } = usePreferences()
  const insets = useSafeAreaInsets()
  const variant: NavVariant = compact ? 'rail' : 'sidebar'
  return <View accessibilityRole="tablist" style={[compact ? styles.rail : styles.sidebar, { backgroundColor: colors.background, borderColor: colors.border, paddingTop: spacing.lg + insets.top, paddingBottom: spacing.md + insets.bottom }]}>
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
      {!compact && <AppText weight="bold" style={styles.wordmark}>SYNCRO</AppText>}
    </View>
    <View style={styles.list}>{SECTIONS.filter(s => !s.secondary).map(s => trigger(s, variant))}</View>
    {focusTimer && !compact && <View style={styles.bottom}><FocusTimer /></View>}
    <View style={[styles.list, !(focusTimer && !compact) && styles.bottom]}>{SECTIONS.filter(s => s.secondary).map(s => trigger(s, variant))}</View>
  </View>
}

/** Bottom tab bar on phones. */
export function BottomNav() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return <View accessibilityRole="tablist" style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
    {SECTIONS.map(s => trigger(s, 'bar'))}
  </View>
}

const styles = StyleSheet.create({
  sidebar: { width: 232, paddingHorizontal: spacing.md, borderRightWidth: 1, gap: spacing.lg },
  rail: { width: 72, alignItems: 'center', borderRightWidth: 1, gap: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: spacing.xs },
  brandCompact: { paddingHorizontal: 0 },
  logo: { width: 32, height: 32 },
  wordmark: { color: brand.amber, fontSize: 20, lineHeight: 28, letterSpacing: 2 },
  list: { gap: spacing.xs },
  bottom: { marginTop: 'auto' },
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: spacing.xs },
})
