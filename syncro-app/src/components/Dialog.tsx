import { X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { useTheme } from '@/hooks/useTheme'
import { radius, spacing } from '@/lib/theme'

/** Centred modal card with a title and a close button; closes on backdrop press or the back button. */
export function Dialog({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const { colors } = useTheme()
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityLabel="Fechar" style={styles.backdrop} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.card, { maxWidth: width, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <AppText weight="semibold" style={styles.title} accessibilityRole="header">{title}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} onPress={onClose}>
            <X size={20} color={colors.muted} strokeWidth={1.5} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: { width: '100%', maxHeight: '90%', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  title: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
})
