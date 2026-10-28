import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { spacing } from '@/lib/theme'

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const { colors } = useTheme()
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={styles.row}>
    <View style={[styles.box, { borderColor: checked ? colors.success : colors.muted, backgroundColor: checked ? colors.success : 'transparent' }]}>
      {checked && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
    </View>
    <AppText>{label}</AppText>
  </Pressable>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
})
