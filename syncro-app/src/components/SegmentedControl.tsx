import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

export function SegmentedControl<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string
}) {
  const { colors } = useTheme()
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, { backgroundColor: colors.background, borderColor: colors.border }]}>
    {options.map(option => {
      const selected = option.value === value
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option.value)}
        style={[styles.option, selected && { backgroundColor: colors.surfaceRaised }]}>
        <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} tone={selected ? 'text' : 'muted'}>{option.label}</AppText>
      </Pressable>
    })}
  </View>
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, gap: 3, borderWidth: 1, borderRadius: radius.md },
  option: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
})
