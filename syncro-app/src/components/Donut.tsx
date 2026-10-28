import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

export interface DonutSlice { id: string; name: string; color: string; value: number }

const SIZE = 190, R = 70, STROKE = 16, C = 2 * Math.PI * R

/** Ring chart with a legend; pressing a legend row highlights its slice and shows its value in the centre. */
export function Donut({ slices, total, format, centre, centreLabel }: {
  slices: readonly DonutSlice[]; total: number; format: (v: number) => string; centre: string; centreLabel: string
}) {
  const { colors } = useTheme()
  const [active, setActive] = useState<string | null>(null)
  const selected = slices.find(s => s.id === active)
  const percent = (v: number) => (v / total * 100 < 1 ? '<1%' : `${Math.round(v / total * 100)}%`)
  let offset = 0
  return <View style={styles.wrap}>
    <View style={styles.chart}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={colors.surfaceRaised} strokeWidth={STROKE} />
        {slices.map(s => {
          const length = s.value / total * C, start = offset
          offset += length
          return <Circle key={s.id} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={`${Math.max(0, length - (slices.length > 1 ? 3 : 0))} ${C}`} strokeDashoffset={-start}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} opacity={active && active !== s.id ? 0.25 : 1} />
        })}
      </Svg>
      <View style={styles.centre}>
        <AppText weight="semibold">{selected ? format(selected.value) : centre}</AppText>
        <AppText variant="caption" tone="muted">{selected ? selected.name : centreLabel}</AppText>
      </View>
    </View>
    <View style={styles.legend}>
      {slices.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${s.name}: ${format(s.value)}, ${percent(s.value)}`}
        onPress={() => setActive(a => (a === s.id ? null : s.id))} onHoverIn={() => setActive(s.id)} onHoverOut={() => setActive(null)}
        style={[styles.row, active && active !== s.id && styles.dim]}>
        <View style={[styles.dot, { backgroundColor: s.color }]} />
        <AppText variant="caption" style={styles.name} numberOfLines={1}>{s.name}</AppText>
        <AppText variant="caption" weight="semibold">{format(s.value)}</AppText>
        <AppText variant="caption" tone="muted" style={styles.percent}>{percent(s.value)}</AppText>
      </Pressable>)}
    </View>
  </View>
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg },
  chart: { width: SIZE, height: SIZE, alignSelf: 'center' },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  legend: { flex: 1, minWidth: 220, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  dim: { opacity: 0.4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1 },
  percent: { width: 40, textAlign: 'right' },
})
