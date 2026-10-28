import { StyleSheet, View } from 'react-native'
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui'
import { BottomNav, SideNav } from '@/components/AppNav'
import { AgendaDateProvider } from '@/hooks/useAgendaDate'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { CloudDataProvider } from '@/hooks/useCloudData'
import { useTheme } from '@/hooks/useTheme'
import { SECTIONS } from '@/lib/sections'

/** One navigator for every screen size: bottom bar on phones, icon rail on tablets, sidebar on desktop. */
function TabsNavigator() {
  const { colors } = useTheme()
  const breakpoint = useBreakpoint()
  const mobile = breakpoint === 'mobile'
  return <Tabs style={[styles.root, { flexDirection: mobile ? 'column' : 'row', backgroundColor: colors.background }]}>
    {!mobile && <SideNav compact={breakpoint === 'tablet'} />}
    <View style={styles.content}><TabSlot style={styles.slot} /></View>
    {mobile && <BottomNav />}
    {/* Declares the routes; the visible triggers above reuse these names. */}
    <TabList style={styles.hidden}>
      {SECTIONS.map(s => <TabTrigger key={s.name} name={s.name} href={s.href} />)}
    </TabList>
  </Tabs>
}

/** Signed-in area: the account's data is loaded once here and shared by every section. */
export default function TabsLayout() {
  return <CloudDataProvider>
    <AgendaDateProvider><TabsNavigator /></AgendaDateProvider>
  </CloudDataProvider>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  // TabSlot's container doesn't shrink by default, so screens would grow to their content's height and never scroll.
  slot: { flexShrink: 1, minHeight: 0 },
  hidden: { display: 'none' },
})
