import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { ChipGroup } from '@/components/ChipGroup'
import { TimeField } from '@/components/TimeField'
import { useTheme } from '@/hooks/useTheme'
import { WEEKDAYS, WEEKDAY_NAMES, formatDuration } from '@/lib/dates'
import { sleepMinutes, sleepSchedule, withSleepForAllDays, withSleepTime } from '@/lib/profile'
import { spacing } from '@/lib/theme'
import type { Sleep } from '@/types/profile'

/** Bedtime and wake-up time per weekday; each change is saved at once. */
export function SleepWeek({ sleep, onChange }: { sleep: Sleep; onChange: (sleep: Sleep, message?: string) => void }) {
  const { colors } = useTheme()
  const [source, setSource] = useState(0)
  return <Card>
    <AppText weight="semibold">Sono</AppText>
    <AppText variant="caption" tone="muted">Define a hora de deitar e de acordar para cada dia. As alterações ficam guardadas automaticamente.</AppText>
    <View style={[styles.row, styles.head]} importantForAccessibility="no-hide-descendants">
      <AppText variant="caption" tone="muted" style={styles.day}>Dia</AppText>
      <AppText variant="caption" tone="muted" style={styles.time}>Deito-me</AppText>
      <AppText variant="caption" tone="muted" style={styles.time}>Acordo</AppText>
      <AppText variant="caption" tone="muted">Duração</AppText>
    </View>
    {WEEKDAY_NAMES.map((name, day) => {
      const schedule = sleepSchedule(sleep, day), duration = sleepMinutes(schedule)
      return <View key={name} style={[styles.row, { borderTopColor: colors.border }]}>
        <AppText weight="semibold" tone={day >= 5 ? 'accent' : 'text'} style={styles.day}>{WEEKDAYS[day]}</AppText>
        <View style={styles.time}><TimeField label={`Deito-me — ${name}`} required value={schedule.bed} onChange={v => onChange(withSleepTime(sleep, day, 'bed', v))} /></View>
        <View style={styles.time}><TimeField label={`Acordo — ${name}`} required value={schedule.wake} onChange={v => onChange(withSleepTime(sleep, day, 'wake', v))} /></View>
        <AppText variant="caption" tone="muted">{duration ? formatDuration(duration) : '—'}</AppText>
      </View>
    })}
    <ChipGroup label="Usar o horário de">
      {WEEKDAYS.map((name, day) => <Chip key={name} label={name} selected={source === day} onPress={() => setSource(day)} />)}
    </ChipGroup>
    <Button label="Aplicar a todos os dias" style={styles.apply} onPress={() => onChange(withSleepForAllDays(sleep, source), 'Horário de sono aplicado a todos os dias.')} />
  </Card>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  head: { borderTopWidth: 0 },
  day: { width: 40 },
  time: { width: 100 },
  apply: { alignSelf: 'flex-start' },
})
