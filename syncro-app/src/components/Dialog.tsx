import { X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/AppText'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

/**
 * Modal with a title and a close button; closes on backdrop press or the back button.
 * Centred card on wider screens, bottom sheet on phones (easier to reach with one hand).
 */
export function Dialog({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const sheet = useBreakpoint() === 'mobile'
  return <Modal transparent visible animationType={sheet ? 'slide' : 'fade'} onRequestClose={onClose}>
    <KeyboardAvoidingView style={[styles.root, sheet ? styles.rootSheet : styles.rootCentred]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityLabel="Fechar" style={styles.backdrop} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, sheet ? styles.sheet : { maxWidth: width }]}>
        {sheet && <View style={[styles.handle, { backgroundColor: colors.border }]} />}
        <View style={styles.header}>
          <AppText weight="semibold" style={styles.title} accessibilityRole="header">{title}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={12} onPress={onClose}>
            <X size={22} color={colors.muted} strokeWidth={1.5} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.body, sheet && { paddingBottom: spacing.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootCentred: { alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  rootSheet: { justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: { width: '100%', maxHeight: '90%', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  sheet: { maxHeight: '92%', borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  title: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
})
