import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { WEEKDAYS, daysBetween, shortDate, weekday } from '@/lib/dates'
import { UPCOMING_DAYS, upcomingSpecialDays } from '@/lib/specialDays'
import { radius, spacing, tagColors } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { SpecialDay } from '@/types/specialDays'

const COLLAPSED = 5

/** Compact list of the special days in the next 31 days, with how many days are left. */
export function UpcomingDays({ today, specialDays, categories, onEdit }: {
  today: string; specialDays: readonly SpecialDay[]; categories: readonly Category[]; onEdit: (item: SpecialDay) => void
}) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const upcoming = upcomingSpecialDays(specialDays, today)
  const shown = expanded ? upcoming : upcoming.slice(0, COLLAPSED)
  return <View style={styles.section}>
    <AppText variant="caption" weight="semibold" tone="muted" style={styles.title}>PRÓXIMOS {UPCOMING_DAYS} DIAS</AppText>
    {upcoming.length ? <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {shown.map(({ item, date }, i) => {
        const c = categories.find(x => x.id === item.categoryId), left = daysBetween(today, date)
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={() => onEdit(item)}
          style={({ pressed }) => [styles.item, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, pressed && { backgroundColor: colors.surfaceRaised }]}>
          <View style={[styles.bar, { backgroundColor: c?.color ?? tagColors.neutral }]} />
          <AppText variant="caption" style={styles.icon}>{c?.icon || '📌'}</AppText>
          <AppText variant="caption" numberOfLines={1} style={styles.name}>{item.name}</AppText>
          <AppText variant="caption" tone="muted" style={styles.small}>{WEEKDAYS[weekday(date)]} {shortDate(date)}{item.time ? ` · ${item.time}` : ''}</AppText>
          <AppText variant="caption" weight="semibold" tone={left === 0 ? 'accent' : 'muted'} style={[styles.small, styles.left]}>{left === 0 ? 'Hoje' : left === 1 ? 'Amanhã' : `${left} dias`}</AppText>
        </Pressable>
      })}
      {upcoming.length > COLLAPSED && <Pressable accessibilityRole="button" onPress={() => setExpanded(e => !e)} style={[styles.more, { borderTopColor: colors.border }]}>
        <AppText variant="caption" tone="accent">{expanded ? 'Mostrar menos' : `Ver todos (${upcoming.length})`}</AppText>
      </Pressable>}
    </View> : <AppText variant="caption" tone="muted">Sem marcações nos próximos {UPCOMING_DAYS} dias.</AppText>}
  </View>
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  title: { fontSize: 12, letterSpacing: 0.5 },
  list: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, paddingRight: spacing.sm },
  bar: { width: 3, alignSelf: 'stretch' },
  icon: { fontSize: 13 },
  name: { flex: 1, fontSize: 13 },
  small: { fontSize: 12, lineHeight: 16 },
  left: { minWidth: 52, textAlign: 'right' },
  more: { alignItems: 'center', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
})
