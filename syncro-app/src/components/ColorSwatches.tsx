import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { CATEGORY_COLORS } from '@/lib/categories'

/** Category colour choice from the shared palette; a colour set elsewhere (e.g. on the desktop) stays selectable. */
export function ColorSwatches({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  const { colors } = useTheme()
  const options = CATEGORY_COLORS.some(c => c.toLowerCase() === value.toLowerCase()) ? CATEGORY_COLORS : [...CATEGORY_COLORS, value]
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
    {options.map(color => {
      const selected = color.toLowerCase() === value.toLowerCase()
      return <Pressable key={color} accessibilityRole="radio" accessibilityLabel={color} accessibilityState={{ checked: selected }} hitSlop={4} onPress={() => onChange(color)}
        style={[styles.swatch, { backgroundColor: color, borderColor: selected ? colors.text : 'transparent' }]}>
        {selected && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
      </Pressable>
    })}
  </View>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
