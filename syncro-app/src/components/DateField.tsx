import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FieldTrigger } from '@/components/FieldTrigger'
import { useTheme } from '@/hooks/useTheme'
import { MONTH_NAMES, addDays, addMonths, monthCells, parseIso, shortDate, todayIso } from '@/lib/dates'
import { spacing } from '@/lib/theme'

const WEEKDAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

/**
 * Date as ISO `YYYY-MM-DD`, picked from a themed calendar that works on every platform.
 * Optional by default ('' means no date); `required` hides the "Sem data" shortcut.
 */
export function DateField({ label, value, onChange, required, min }: {
  label: string; value: string; onChange: (date: string) => void; required?: boolean; min?: string
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const today = todayIso()
  const [month, setMonth] = useState((value || today).slice(0, 7))
  const show = () => { setMonth((value || today).slice(0, 7)); setOpen(true) }
  const pick = (date: string) => { onChange(date); setOpen(false) }

  return <>
    <FieldTrigger icon={CalendarDays} label={label} text={value ? shortDate(value) : 'Sem data'} empty={!value} onPress={show} />
    {open && <Dialog title={label} onClose={() => setOpen(false)} width={360}>
      <View style={styles.monthBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
        <AppText weight="semibold">{MONTH_NAMES[+month.slice(5) - 1]} {month.slice(0, 4)}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={8} onPress={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((d, i) => <View key={i} style={styles.cell}><AppText variant="caption" tone="muted">{d}</AppText></View>)}
        {monthCells(month).map(date => {
          if (!date.startsWith(month)) return <View key={date} style={styles.cell} />
          const selected = date === value, isToday = date === today, disabled = !!min && date < min
          return <Pressable key={date} accessibilityRole="button" accessibilityLabel={shortDate(date)} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => pick(date)} style={styles.cell}>
            <View style={[styles.day, selected && { backgroundColor: colors.accent }, !selected && isToday && { borderColor: colors.accent, borderWidth: 1 }, disabled && styles.disabled]}>
              <AppText variant="caption" weight={selected || isToday ? 'semibold' : 'regular'} style={{ color: selected ? colors.onAccent : colors.text }}>{parseIso(date).getDate()}</AppText>
            </View>
          </Pressable>
        })}
      </View>
      <View style={styles.shortcuts}>
        <Button label="Hoje" disabled={!!min && today < min} onPress={() => pick(today)} />
        <Button label="Amanhã" disabled={!!min && addDays(today, 1) < min} onPress={() => pick(addDays(today, 1))} />
        {!required && <Button label="Sem data" variant="ghost" onPress={() => pick('')} />}
      </View>
    </Dialog>}
  </>
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
