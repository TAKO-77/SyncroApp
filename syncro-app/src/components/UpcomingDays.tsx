import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import { daysBetween, shortDate } from '@/lib/dates'
import { UPCOMING_DAYS, upcomingSpecialDays } from '@/lib/specialDays'
import { radius, spacing, tagColors } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { SpecialDay } from '@/types/specialDays'

/** Special days in the next 31 days, with how many days are left. */
export function UpcomingDays({ today, specialDays, categories, onEdit }: {
  today: string; specialDays: readonly SpecialDay[]; categories: readonly Category[]; onEdit: (item: SpecialDay) => void
}) {
  const { colors } = useTheme()
  const upcoming = upcomingSpecialDays(specialDays, today)
  return <Card>
    <AppText weight="semibold">Próximos {UPCOMING_DAYS} dias</AppText>
    {upcoming.length ? <View style={styles.list}>{upcoming.map(({ item, date }) => {
      const c = categories.find(x => x.id === item.categoryId), left = daysBetween(today, date)
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={() => onEdit(item)}
        style={[styles.item, { backgroundColor: colors.surfaceRaised, borderLeftColor: c?.color ?? tagColors.neutral }]}>
        <AppText style={styles.icon}>{c?.icon || '📌'}</AppText>
        <View style={styles.name}>
          <AppText variant="caption" weight="semibold" numberOfLines={1}>{item.name}</AppText>
          <AppText variant="caption" tone="muted">{shortDate(date)}{item.time ? ` · ${item.time}` : ''}</AppText>
        </View>
        <AppText variant="caption" tone={left === 0 ? 'accent' : 'muted'}>{left === 0 ? 'Hoje' : `em ${left} ${left === 1 ? 'dia' : 'dias'}`}</AppText>
      </Pressable>
    })}</View> : <AppText variant="caption" tone="muted">Sem marcações nos próximos {UPCOMING_DAYS} dias.</AppText>}
  </Card>
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexGrow: 1, flexBasis: 240, padding: spacing.sm, borderLeftWidth: 3, borderRadius: radius.sm },
  icon: { fontSize: 18 },
  name: { flex: 1 },
})
