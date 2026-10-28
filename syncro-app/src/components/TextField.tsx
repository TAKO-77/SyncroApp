import { useState, type ReactNode } from 'react'
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { fonts, radius, spacing } from '@/lib/theme'

/** Themed text input with an optional label and trailing element (e.g. a show-password toggle). */
export function TextField({ label, trailing, style, onFocus, onBlur, multiline, ...props }: TextInputProps & { label?: string; trailing?: ReactNode }) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  return <View style={styles.field}>
    {label && <AppText variant="caption" tone="muted">{label}</AppText>}
    <View style={[styles.box, multiline && styles.multiline, { backgroundColor: colors.surface, borderColor: focused ? colors.accent : colors.border }]}>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} multiline={multiline} {...props}
        onFocus={e => { setFocused(true); onFocus?.(e) }} onBlur={e => { setFocused(false); onBlur?.(e) }}
        style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }, style]} />
      {trailing}
    </View>
  </View>
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs, flexGrow: 1 },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 4 },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: spacing.sm, outlineStyle: 'none' } as object,
  inputMultiline: { minHeight: 72, textAlignVertical: 'top', paddingVertical: 0 },
})
