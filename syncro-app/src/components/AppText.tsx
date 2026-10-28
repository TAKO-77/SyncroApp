import { Text, type TextProps } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { fonts, typography, type TextVariant } from '@/lib/theme'

type Tone = 'text' | 'muted' | 'accent' | 'success' | 'error'

export function AppText({ variant = 'body', tone = 'text', weight, style, ...props }: TextProps & {
  variant?: TextVariant; tone?: Tone; weight?: keyof typeof fonts
}) {
  const { colors } = useTheme()
  return <Text {...props} style={[typography[variant], { color: colors[tone] }, weight && { fontFamily: fonts[weight] }, style]} />
}
