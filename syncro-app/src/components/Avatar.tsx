import { Image, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'

/** Profile photo, or the first letter of the name when there is none. */
export function Avatar({ photo, name, size }: { photo: string; name: string; size: number }) {
  const { colors } = useTheme()
  const shape = { width: size, height: size, borderRadius: size / 2 }
  if (photo) return <Image source={{ uri: photo }} style={shape} accessibilityLabel="Foto de perfil" />
  return <View accessibilityLabel="Sem foto de perfil" style={[styles.placeholder, shape, { backgroundColor: colors.accentSoft }]}>
    <AppText weight="bold" tone="accent" style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>{(name.trim()[0] || '?').toUpperCase()}</AppText>
  </View>
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
})
