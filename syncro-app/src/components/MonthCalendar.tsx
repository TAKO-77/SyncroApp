import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { WEEKDAYS, monthCells, parseIso } from '@/lib/dates'
import { specialDaysOn } from '@/lib/specialDays'
import { radius, spacing, tagColors } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { SpecialDay } from '@/types/specialDays'

/** Month grid with the special days of each day; pressing a day opens it, pressing a special day edits it. */
export function MonthCalendar({ month, today, specialDays, categories, onOpenDay, onEdit }: {
  month: string; today: string; specialDays: readonly SpecialDay[]; categories: readonly Category[]
  onOpenDay: (day: string) => void; onEdit: (item: SpecialDay) => void
}) {
  const { colors } = useTheme()
  const mobile = useBreakpoint() === 'mobile'
  const category = (id: string) => categories.find(c => c.id === id)
  return <View style={[styles.grid, { borderColor: colors.border }]}>
    {WEEKDAYS.map(d => <View key={d} style={styles.head}><AppText variant="caption" tone="muted">{d}</AppText></View>)}
    {monthCells(month).map(day => {
      const outside = !day.startsWith(month), isToday = day === today
      // The day and its special days are siblings, not nested: a button can't contain buttons on the web.
      return <View key={day} style={[styles.cell, { minHeight: mobile ? 64 : 96, borderColor: colors.border, backgroundColor: isToday ? colors.accentSoft : 'transparent' }, outside && styles.outside]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${parseIso(day).getDate()} na agenda`} onPress={() => onOpenDay(day)}
          style={({ pressed }) => [styles.dayButton, pressed && { backgroundColor: colors.surfaceRaised }]} />
        <AppText variant="caption" weight={isToday ? 'bold' : 'regular'} tone={isToday ? 'accent' : 'text'} style={styles.dayNumber}>{parseIso(day).getDate()}</AppText>
        {specialDaysOn(specialDays, day).map(x => {
          const c = category(x.categoryId), color = c?.color ?? tagColors.neutral
          return <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`Editar ${x.name}`} onPress={() => onEdit(x)}
            style={[styles.pill, { backgroundColor: color + '33', borderLeftColor: color }]}>
            <AppText numberOfLines={1} style={[styles.pillText, { color: colors.text }]}>{mobile ? (c?.icon || x.name) : `${c?.icon ? `${c.icon} ` : ''}${x.name}`}</AppText>
          </Pressable>
        })}
      </View>
    })}
  </View>
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  head: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: spacing.xs },
  cell: { width: `${100 / 7}%`, padding: 4, gap: 2, borderRightWidth: 1, borderBottomWidth: 1 },
  outside: { opacity: 0.4 },
  dayButton: { ...StyleSheet.absoluteFill },
  dayNumber: { pointerEvents: 'none' },
  pill: { borderLeftWidth: 2, borderRadius: 4, paddingHorizontal: 3 },
  pillText: { fontSize: 11, lineHeight: 15 },
})
