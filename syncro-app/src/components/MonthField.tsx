import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FieldTrigger } from '@/components/FieldTrigger'
import { useTheme } from '@/hooks/useTheme'
import { MONTHS, monthLabel, todayIso } from '@/lib/dates'
import { radius, spacing } from '@/lib/theme'

/** Optional month as `YYYY-MM` ('' for none); months before `min` can't be chosen. */
export function MonthField({ label, value, onChange, min, emptyText = 'Sem fim' }: {
  label: string; value: string; onChange: (month: string) => void; min?: string; emptyText?: string
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(0)
  const show = () => { setYear(+(value || min || todayIso()).slice(0, 4)); setOpen(true) }
  const pick = (month: string) => { onChange(month); setOpen(false) }

  return <>
    <FieldTrigger icon={CalendarRange} label={label} text={value ? monthLabel(value) : emptyText} empty={!value} onPress={show} />
    {open && <Dialog title={label} onClose={() => setOpen(false)} width={360}>
      <View style={styles.yearBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ano anterior" hitSlop={8} onPress={() => setYear(y => y - 1)}><ChevronLeft size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
        <AppText weight="semibold">{year}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Ano seguinte" hitSlop={8} onPress={() => setYear(y => y + 1)}><ChevronRight size={20} color={colors.text} strokeWidth={1.5} /></Pressable>
      </View>
      <View style={styles.grid}>
        {MONTHS.map((name, i) => {
          const month = `${year}-${String(i + 1).padStart(2, '0')}`
          const selected = month === value, disabled = !!min && month < min
          return <Pressable key={month} accessibilityRole="button" accessibilityLabel={monthLabel(month)} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => pick(month)}
            style={[styles.month, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : colors.surface }, disabled && styles.disabled]}>
            <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} style={{ color: selected ? colors.onAccent : colors.text }}>{name}</AppText>
          </Pressable>
        })}
      </View>
      <View style={styles.actions}><Button label={emptyText} variant="ghost" onPress={() => pick('')} /></View>
    </Dialog>}
  </>
}

const styles = StyleSheet.create({
  yearBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  month: { width: '30%', flexGrow: 1, height: 40, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
})
