import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

const PRESETS: { seconds: number; label: string }[] = [{ seconds: 1500, label: '25' }, { seconds: 3000, label: '50' }, { seconds: 300, label: 'Pausa' }]
const p2 = (n: number) => String(n).padStart(2, '0')

/** Pomodoro-style focus timer shown in the sidebar, like the web app's. */
export function FocusTimer() {
  const { colors } = useTheme()
  const [total, setTotal] = useState(1500)
  const [left, setLeft] = useState(1500)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setLeft(l => { if (l <= 1) { setRunning(false); return 0 } return l - 1 }), 1000)
    return () => clearInterval(id)
  }, [running])
  const pick = (seconds: number) => { setTotal(seconds); setLeft(seconds); setRunning(false) }

  return <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <AppText variant="caption" tone="muted">Foco</AppText>
    <AppText variant="h3" accessibilityLiveRegion="none">{p2(Math.floor(left / 60))}:{p2(left % 60)}</AppText>
    <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
      <View style={[styles.fill, { width: `${100 - left / total * 100}%`, backgroundColor: colors.accent }]} />
    </View>
    <View style={styles.row}>
      {PRESETS.map(p => <Button key={p.label} label={p.label} variant={total === p.seconds ? 'primary' : 'secondary'} style={styles.preset} onPress={() => pick(p.seconds)} />)}
    </View>
    <View style={styles.row}>
      <Button label={running ? 'Pausar' : 'Iniciar'} variant="primary" style={styles.grow} onPress={() => setRunning(r => !r)} />
      <Button label="Repor" style={styles.grow} onPress={() => pick(total)} />
    </View>
  </View>
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, padding: spacing.sm + 4, borderWidth: 1, borderRadius: radius.md },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  row: { flexDirection: 'row', gap: spacing.xs },
  preset: { flex: 1, paddingHorizontal: spacing.xs, minHeight: 32 },
  grow: { flex: 1, paddingHorizontal: spacing.xs },
})
