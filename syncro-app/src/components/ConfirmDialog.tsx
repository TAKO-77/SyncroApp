import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { spacing } from '@/lib/theme'

export interface ConfirmRequest { title: string; message: string; confirmLabel: string; onConfirm: () => void }

/** Themed replacement for `Alert.alert`, which does nothing on the web. */
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  return <Dialog title={request.title} onClose={onClose} width={420}>
    <AppText tone="muted">{request.message}</AppText>
    <View style={styles.actions}>
      <Button label="Cancelar" onPress={onClose} />
      <Button label={request.confirmLabel} variant="danger" onPress={() => { onClose(); request.onConfirm() }} />
    </View>
  </Dialog>
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
