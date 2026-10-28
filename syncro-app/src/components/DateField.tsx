import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { useTheme } from '@/hooks/useTheme'
import { addDays, parseIso, shortDate, toIso } from '@/lib/tasks'
import { radius, spacing } from '@/lib/theme'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

/** Monday-first grid for the month of `first`; null cells pad the first week. */
function monthGrid(first: Date): (string | null)[] {
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => toIso(new Date(first.getFullYear(), first.getMonth(), i + 1)))]
}

/** Optional date as ISO `YYYY-MM-DD` ('' for none), picked from a themed calendar that works on every platform. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const today = toIso(new Date())
  const [month, setMonth] = useState(() => { const d = parseIso(value || today); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const show = () => { const d = parseIso(value || today); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setOpen(true) }
  const pick = (date: string) => { onChange(date); setOpen(false) }
  const shift = (n: number) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1))

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? shortDate(value) : 'sem data'}`} onPress={show}
      style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      <CalendarDays size={16} color={value ? colors.text : colors.muted} strokeWidth={1.5} />
      <AppText variant="caption" tone={value ? 'text' : 'muted'}>{value ? shortDate(value) : 'Sem data'}</AppText>
    </Pressable>
    {open && <Dialog title={label} onClose={() => setOpen(false)} width={360}>
      <View style={styles.monthBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={() => shift(-1)}><ChevronLeft size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
        <AppText weight="semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={8} onPress={() => shift(1)}><ChevronRight size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => <View key={i} style={styles.cell}><AppText variant="caption" tone="muted">{d}</AppText></View>)}
        {monthGrid(month).map((date, i) => {
          if (!date) return <View key={`pad-${i}`} style={styles.cell} />
          const selected = date === value, isToday = date === today
          return <Pressable key={date} accessibilityRole="button" accessibilityLabel={shortDate(date)} accessibilityState={{ selected }} onPress={() => pick(date)} style={styles.cell}>
            <View style={[styles.day, selected && { backgroundColor: colors.accent }, !selected && isToday && { borderColor: colors.accent, borderWidth: 1 }]}>
              <AppText variant="caption" weight={selected || isToday ? 'semibold' : 'regular'} style={{ color: selected ? colors.onAccent : colors.text }}>{parseIso(date).getDate()}</AppText>
            </View>
          </Pressable>
        })}
      </View>
      <View style={styles.shortcuts}>
        <Button label="Hoje" onPress={() => pick(today)} />
        <Button label="Amanhã" onPress={() => pick(addDays(today, 1))} />
        <Button label="Sem data" variant="ghost" onPress={() => pick('')} />
      </View>
    </Dialog>}
  </>
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40, paddingHorizontal: spacing.sm + 4, borderWidth: 1, borderRadius: radius.sm, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
