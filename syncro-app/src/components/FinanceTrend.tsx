import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import { MONTHS } from '@/lib/dates'
import { radius, spacing, tagColors } from '@/lib/theme'
import type { MonthTotals } from '@/types/finances'

const BAR_HEIGHT = 96

/** Income and expenses of the last months as paired bars; pressing a month selects it. */
export function FinanceTrend({ months, selected, hidden, format, onSelect }: {
  months: readonly (MonthTotals & { month: string })[]; selected: string; hidden: boolean; format: (n: number) => string; onSelect: (month: string) => void
}) {
  const { colors } = useTheme()
  const max = Math.max(1, ...months.flatMap(m => [m.income, m.expenses]))
  return <Card>
    <AppText variant="caption" tone="muted">Evolução · últimos {months.length} meses</AppText>
    <View style={styles.row}>
      {months.map(m => {
        const on = m.month === selected
        return <Pressable key={m.month} accessibilityRole="button" accessibilityState={{ selected: on }}
          accessibilityLabel={hidden ? MONTHS[+m.month.slice(5) - 1] : `${MONTHS[+m.month.slice(5) - 1]}: ganhos ${format(m.income)}, despesas ${format(m.expenses)}`}
          onPress={() => onSelect(m.month)} style={[styles.month, on && { backgroundColor: colors.surfaceRaised }]}>
          <View style={styles.bars}>
            <View style={[styles.bar, { height: hidden ? 4 : m.income / max * BAR_HEIGHT, backgroundColor: tagColors.sage }]} />
            <View style={[styles.bar, { height: hidden ? 4 : m.expenses / max * BAR_HEIGHT, backgroundColor: tagColors.clay }]} />
          </View>
          <AppText variant="caption" tone={on ? 'text' : 'muted'} weight={on ? 'semibold' : 'regular'}>{MONTHS[+m.month.slice(5) - 1]}</AppText>
        </Pressable>
      })}
    </View>
    <View style={styles.legend}>
      <View style={styles.key}><View style={[styles.dot, { backgroundColor: tagColors.sage }]} /><AppText variant="caption" tone="muted">Ganhos</AppText></View>
      <View style={styles.key}><View style={[styles.dot, { backgroundColor: tagColors.clay }]} /><AppText variant="caption" tone="muted">Despesas</AppText></View>
    </View>
  </Card>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  month: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, borderRadius: radius.sm },
  bars: { height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2 },
  legend: { flexDirection: 'row', gap: spacing.md },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
