import { Clock } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FieldTrigger } from '@/components/FieldTrigger'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

const p2 = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => p2(i))
const MINUTES = Array.from({ length: 12 }, (_, i) => p2(i * 5))

function Options({ label, options, selected, onPick }: { label: string; options: string[]; selected: string; onPick: (v: string) => void }) {
  const { colors } = useTheme()
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.section}>
    <AppText variant="caption" tone="muted">{label}</AppText>
    <View style={styles.grid}>
      {options.map(o => {
        const on = o === selected
        return <Pressable key={o} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={o} onPress={() => onPick(o)}
          style={[styles.option, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : colors.surface }]}>
          <AppText variant="caption" weight={on ? 'semibold' : 'regular'} style={{ color: on ? colors.onAccent : colors.text }}>{o}</AppText>
        </Pressable>
      })}
    </View>
  </View>
}

/** `HH:MM` time: choosing the hour keeps the dialog open, choosing the minutes confirms it. Optional unless `required`. */
export function TimeField({ label, value, onChange, required }: { label: string; value: string; onChange: (time: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState('')
  const [h, m] = value ? value.split(':') : ['', '']
  // Keep a minute that is not a multiple of five (e.g. from the web app) selectable.
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES
  const show = () => { setHour(h); setOpen(true) }
  const pickHour = (v: string) => { setHour(v); onChange(`${v}:${m || '00'}`) }
  const pickMinute = (v: string) => { onChange(`${hour || '00'}:${v}`); setOpen(false) }

  return <>
    <FieldTrigger icon={Clock} label={label} text={value || '--:--'} empty={!value} onPress={show} />
    {open && <Dialog title={label} onClose={() => setOpen(false)} width={400}>
      <Options label="Horas" options={HOURS} selected={hour} onPick={pickHour} />
      <Options label="Minutos" options={minutes} selected={m} onPick={pickMinute} />
      <View style={styles.actions}>
        {!required && !!value && <Button label="Limpar" variant="ghost" onPress={() => { onChange(''); setOpen(false) }} />}
        <Button label="Concluir" variant="primary" onPress={() => setOpen(false)} />
      </View>
    </Dialog>}
  </>
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { width: 48, height: 36, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
