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
const TIME_COLUMN = 52
const WEEK_MIN_WIDTH = 790
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function DayColumn({ day, today, nowMinute, occurrences, categories, sleep, onCreate, onOpen }: {
  day: string; today: string; nowMinute: number; occurrences: Occurrence[]; categories: readonly Category[]; sleep: Sleep
  onCreate: (day: string, minute: number) => void; onOpen: (o: Occurrence) => void
}) {
  const { colors } = useTheme()
  const isToday = day === today
  return <View style={[styles.column, { borderLeftColor: colors.border }]}>
    {HOURS.map(h => <Pressable key={h} accessibilityRole="button" accessibilityLabel={`Novo evento às ${String(h).padStart(2, '0')}:00`}
      onPress={() => onCreate(day, isToday && h === Math.floor(nowMinute / 60) ? Math.min(nowMinute + 1, 1439) : h * 60)}
      style={[styles.hour, { borderTopColor: colors.border }]} />)}
    {sleepIntervals(sleep, day).map(([a, b]) => <View key={a} style={[styles.sleep, { top: a, height: b - a, backgroundColor: colors.surfaceRaised }]}>
      {b - a > 90 && <AppText variant="caption" tone="muted" style={styles.sleepLabel}>Sono</AppText>}
    </View>)}
    {isToday && <View style={[styles.past, { height: nowMinute, backgroundColor: colors.background }]} />}
    {layoutLanes(occurrences).map(({ item: o, lane, lanes }) => {
      const height = Math.max(18, durationOf(o) - 1), width = 100 / lanes, color = eventColor(o, categories), small = height < 44
      return <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`${o.title}, ${o.start} a ${o.end}`} onPress={() => onOpen(o)}
        style={[styles.eventSlot, { top: minutes(o.start), height, left: `${lane * width}%`, width: `${width}%` }]}>
        <View style={[styles.event, { backgroundColor: color + '33', borderLeftColor: color }]}>
          <AppText variant="caption" weight="semibold" numberOfLines={small ? 1 : 2} style={styles.eventTitle}>{o.title}</AppText>
          {!small && <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.eventTime}>{o.start}–{o.end} · {formatDuration(durationOf(o))}</AppText>}
        </View>
      </Pressable>
    })}
    {isToday && <View style={[styles.now, { top: nowMinute, backgroundColor: colors.error }]} />}
  </View>
}

/** Timetable of one day or one week; scrolls to the current time when it opens. */
export function AgendaGrid({ days, today, nowMinute, events, categories, sleep, specialDays, categoryFilter, onCreate, onOpen }: {
  days: readonly string[]; today: string; nowMinute: number
  events: readonly AgendaEvent[]; categories: readonly Category[]; sleep: Sleep; specialDays: readonly SpecialDay[]; categoryFilter: string
  onCreate: (day: string, minute: number) => void; onOpen: (o: Occurrence) => void
}) {
  const { colors } = useTheme()
  const [size, setSize] = useState({ width: 0, height: 0 })
  const vertical = useRef<ScrollViewInstance>(null)
  const width = Math.max(size.width, days.length > 1 ? WEEK_MIN_WIDTH : 0)
  const showsToday = days.includes(today)
  useEffect(() => {
    if (size.height && showsToday) vertical.current?.scrollTo({ y: Math.max(0, nowMinute - 90), animated: false })
  }, [size.height > 0, showsToday]) // eslint-disable-line react-hooks/exhaustive-deps

  return <View style={[styles.frame, { borderColor: colors.border, backgroundColor: colors.surface }]}
    onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
    {size.width > 0 && <ScrollView horizontal scrollEnabled={width > size.width} showsHorizontalScrollIndicator={width > size.width}>
      <View style={{ width, height: size.height }}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={{ width: TIME_COLUMN }} />
          {days.map(day => {
            const isToday = day === today
            return <View key={day} style={styles.dayHeader}>
              <AppText variant="caption" tone={isToday ? 'accent' : 'muted'}>{WEEKDAYS[weekday(day)]}</AppText>
              <AppText weight="semibold" tone={isToday ? 'accent' : 'text'}>{parseIso(day).getDate()}</AppText>
              {specialDaysOn(specialDays, day).map(x => <AppText key={x.id} variant="caption" numberOfLines={1} style={[styles.special, { backgroundColor: colors.accentSoft, color: colors.text }]}>
                {x.time ? `${x.time} · ` : ''}{x.name}
              </AppText>)}
            </View>
          })}
        </View>
        <ScrollView ref={vertical} style={styles.fill} accessibilityLabel="Horário da agenda">
          <View style={styles.body}>
            <View style={{ width: TIME_COLUMN }}>
              {HOURS.map(h => h > 0 && <AppText key={h} variant="caption" tone="muted" style={[styles.hourLabel, { top: h * 60 - 9 }]}>{String(h).padStart(2, '0')}:00</AppText>)}
            </View>
            {days.map(day => <DayColumn key={day} day={day} today={today} nowMinute={nowMinute} categories={categories} sleep={sleep} onCreate={onCreate} onOpen={onOpen}
              occurrences={eventsOn(events, day).filter(o => !categoryFilter || o.categoryId === categoryFilter)} />)}
          </View>
        </ScrollView>
      </View>
    </ScrollView>}
  </View>
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 320, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: spacing.xs },
  dayHeader: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  special: { fontSize: 11, lineHeight: 15, paddingHorizontal: 6, borderRadius: radius.pill, maxWidth: '100%' },
  body: { flexDirection: 'row', height: DAY_HEIGHT },
  hourLabel: { position: 'absolute', right: 6, fontSize: 11, lineHeight: 18 },
  column: { flex: 1, borderLeftWidth: 1 },
  hour: { height: 60, borderTopWidth: StyleSheet.hairlineWidth },
  sleep: { position: 'absolute', left: 0, right: 0, opacity: 0.6, pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' },
  sleepLabel: { fontSize: 11 },
  past: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.35, pointerEvents: 'none' },
  now: { position: 'absolute', left: 0, right: 0, height: 2, pointerEvents: 'none' },
  eventSlot: { position: 'absolute', paddingHorizontal: 2 },
  event: { flex: 1, borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  eventTitle: { fontSize: 12, lineHeight: 16 },
  eventTime: { fontSize: 11, lineHeight: 14 },
})
