import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { WEEKDAYS, formatDuration, minutes, parseIso, weekday } from '@/lib/dates'
import { durationOf, eventColor, eventsOn, layoutLanes } from '@/lib/events'
import { sleepIntervals } from '@/lib/profile'
import { specialDaysOn } from '@/lib/specialDays'
import { radius, spacing } from '@/lib/theme'
import type { Category } from '@/types/categories'
import type { AgendaEvent, Occurrence } from '@/types/events'
import type { Sleep } from '@/types/profile'
import type { SpecialDay } from '@/types/specialDays'

// One pixel per minute, like the web app's timetable.
const DAY_HEIGHT = 1440
const HOURS = Array.from({ length: 24 }, (_, h) => h)
/** Below this column width (a week on a phone) events show only their title in small type. */
const COMPACT_COLUMN = 90

function DayColumn({ day, today, nowMinute, occurrences, categories, sleep, compact, onCreate, onOpen }: {
  day: string; today: string; nowMinute: number; occurrences: Occurrence[]; categories: readonly Category[]; sleep: Sleep; compact: boolean
  onCreate: (day: string, minute: number) => void; onOpen: (o: Occurrence) => void
}) {
  const { colors } = useTheme()
  const isToday = day === today
  return <View style={[styles.column, { borderLeftColor: colors.border }, isToday && { backgroundColor: colors.accentSoft }]}>
    {HOURS.map(h => <Pressable key={h} accessibilityRole="button" accessibilityLabel={`Novo evento às ${String(h).padStart(2, '0')}:00`}
      onPress={() => onCreate(day, isToday && h === Math.floor(nowMinute / 60) ? Math.min(nowMinute + 1, 1439) : h * 60)}
      style={[styles.hour, { borderTopColor: colors.border }]} />)}
    {sleepIntervals(sleep, day).map(([a, b]) => <View key={a} style={[styles.sleep, { top: a, height: b - a, backgroundColor: colors.surfaceRaised }]}>
      {b - a > 90 && !compact && <AppText variant="caption" tone="muted" style={styles.sleepLabel}>Sono</AppText>}
    </View>)}
    {isToday && <View style={[styles.past, { height: nowMinute, backgroundColor: colors.background }]} />}
    {layoutLanes(occurrences).map(({ item: o, lane, lanes }) => {
      const height = Math.max(18, durationOf(o) - 1), width = 100 / lanes, color = eventColor(o, categories), small = compact || height < 44
      return <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`${o.title}, ${o.start} a ${o.end}`} onPress={() => onOpen(o)}
        style={[styles.eventSlot, { top: minutes(o.start), height, left: `${lane * width}%`, width: `${width}%` }]}>
        <View style={[styles.event, compact && styles.eventCompact, { backgroundColor: color + '40', borderLeftColor: color }]}>
          <AppText variant="caption" weight="semibold" numberOfLines={small ? Math.max(1, Math.floor(height / 14)) : 2} style={compact ? styles.eventTitleCompact : styles.eventTitle}>{o.title}</AppText>
          {!small && <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.eventTime}>{o.start}–{o.end} · {formatDuration(durationOf(o))}</AppText>}
        </View>
      </Pressable>
    })}
    {isToday && <View style={[styles.now, { top: nowMinute, backgroundColor: colors.error }]} />}
  </View>
}

/**
 * Timetable of one day or a whole week, always fitting the available width (no sideways scrolling).
 * Opens at the current time; pressing a day's header in the week view calls `onOpenDay`.
 */
export function AgendaGrid({ days, today, nowMinute, events, categories, sleep, specialDays, categoryFilter, onCreate, onOpen, onOpenDay }: {
  days: readonly string[]; today: string; nowMinute: number
  events: readonly AgendaEvent[]; categories: readonly Category[]; sleep: Sleep; specialDays: readonly SpecialDay[]; categoryFilter: string
  onCreate: (day: string, minute: number) => void; onOpen: (o: Occurrence) => void; onOpenDay: (day: string) => void
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const vertical = useRef<ScrollViewInstance>(null)
  const timeColumn = width && width < 500 ? 34 : 52
  const compact = width > 0 && (width - timeColumn) / days.length < COMPACT_COLUMN
  const showsToday = days.includes(today)
  useEffect(() => {
    if (width && showsToday) vertical.current?.scrollTo({ y: Math.max(0, nowMinute - 90), animated: false })
  }, [width > 0, showsToday]) // eslint-disable-line react-hooks/exhaustive-deps

  return <View style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.surface }]} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
      <View style={{ width: timeColumn }} />
      {days.map(day => {
        const isToday = day === today, specials = specialDaysOn(specialDays, day)
        return <Pressable key={day} disabled={days.length === 1} accessibilityRole="button" accessibilityLabel={`Ver só ${WEEKDAYS[weekday(day)]} ${parseIso(day).getDate()}`}
          onPress={() => onOpenDay(day)} style={styles.dayHeader}>
          <AppText variant="caption" tone={isToday ? 'accent' : 'muted'} style={compact && styles.small}>{compact ? WEEKDAYS[weekday(day)][0] : WEEKDAYS[weekday(day)]}</AppText>
          <View style={[styles.dayNumber, isToday && { backgroundColor: colors.accent }]}>
            <AppText weight="semibold" style={[compact && styles.small, { color: isToday ? colors.onAccent : colors.text }]}>{parseIso(day).getDate()}</AppText>
          </View>
          {compact
            ? specials.length > 0 && <View style={[styles.specialDot, { backgroundColor: colors.accent }]} accessibilityLabel={specials.map(x => x.name).join(', ')} />
            : specials.map(x => <AppText key={x.id} variant="caption" numberOfLines={1} style={[styles.special, { backgroundColor: colors.accentSoft, color: colors.text }]}>
              {x.time ? `${x.time} · ` : ''}{x.name}
            </AppText>)}
        </Pressable>
      })}
    </View>
    <ScrollView ref={vertical} style={styles.fill} accessibilityLabel="Horário da agenda">
      <View style={styles.body}>
        <View style={{ width: timeColumn }}>
          {HOURS.map(h => h > 0 && <AppText key={h} variant="caption" tone="muted" style={[styles.hourLabel, { top: h * 60 - 9 }]}>{compact || timeColumn < 52 ? String(h).padStart(2, '0') : `${String(h).padStart(2, '0')}:00`}</AppText>)}
        </View>
        {days.map(day => <DayColumn key={day} day={day} today={today} nowMinute={nowMinute} categories={categories} sleep={sleep} compact={compact} onCreate={onCreate} onOpen={onOpen}
          occurrences={eventsOn(events, day).filter(o => !categoryFilter || o.categoryId === categoryFilter)} />)}
      </View>
    </ScrollView>
  </View>
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 320, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: spacing.xs },
  dayHeader: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  dayNumber: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 12, lineHeight: 16 },
  special: { fontSize: 11, lineHeight: 15, paddingHorizontal: 6, borderRadius: radius.pill, maxWidth: '100%' },
  specialDot: { width: 6, height: 6, borderRadius: 3 },
  body: { flexDirection: 'row', height: DAY_HEIGHT },
  hourLabel: { position: 'absolute', right: 4, fontSize: 11, lineHeight: 18 },
  column: { flex: 1, borderLeftWidth: 1 },
  hour: { height: 60, borderTopWidth: StyleSheet.hairlineWidth },
  sleep: { position: 'absolute', left: 0, right: 0, opacity: 0.6, pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' },
  sleepLabel: { fontSize: 11 },
  past: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.35, pointerEvents: 'none' },
  now: { position: 'absolute', left: 0, right: 0, height: 2, pointerEvents: 'none' },
  eventSlot: { position: 'absolute', paddingHorizontal: 1 },
  event: { flex: 1, borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  eventCompact: { borderLeftWidth: 2, borderRadius: 4, paddingHorizontal: 2, paddingVertical: 1 },
  eventTitle: { fontSize: 12, lineHeight: 16 },
  eventTitleCompact: { fontSize: 10, lineHeight: 13 },
  eventTime: { fontSize: 11, lineHeight: 14 },
})
