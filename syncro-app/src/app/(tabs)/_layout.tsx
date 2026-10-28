import { StyleSheet, View } from 'react-native'
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui'
import { BottomNav, SideNav } from '@/components/AppNav'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { SECTIONS } from '@/lib/sections'

/** One navigator for every screen size: bottom bar on phones, icon rail on tablets, sidebar on desktop. */
export default function TabsLayout() {
  const { colors } = useTheme()
  const breakpoint = useBreakpoint()
  const mobile = breakpoint === 'mobile'
  return <Tabs style={[styles.root, { flexDirection: mobile ? 'column' : 'row', backgroundColor: colors.background }]}>
    {!mobile && <SideNav compact={breakpoint === 'tablet'} />}
    <View style={styles.content}><TabSlot /></View>
    {mobile && <BottomNav />}
    {/* Declares the routes; the visible triggers above reuse these names. */}
    <TabList style={styles.hidden}>
      {SECTIONS.map(s => <TabTrigger key={s.name} name={s.name} href={s.href} />)}
    </TabList>
  </Tabs>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  hidden: { display: 'none' },
})
