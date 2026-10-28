import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { WEEKDAYS, shortDate, weekday } from '@/lib/dates'
import { REPEAT_HINTS, parseQuickAdd, type QuickEntry } from '@/lib/quickAdd'
import { spacing } from '@/lib/theme'

function describe(input: string, entry: QuickEntry | null) {
  if (!input.trim()) return 'Ex.: Treino sex 18h 1h30 semanal  ·  t: Comprar café'
  if (!entry) return 'Falta o título'
  if ('task' in entry) return `Tarefa · ${entry.task}`
  const repeat = REPEAT_HINTS[entry.repeat]
  return `${entry.title} · ${WEEKDAYS[weekday(entry.date)]} ${shortDate(entry.date)} · ${entry.start}–${entry.end}${repeat ? ` · ${repeat}` : ''}`
}

/** One line that becomes an event ("Reunião amanhã 14:30 1h") or a task ("t: tarefa"). */
export function QuickAddDialog({ onSubmit, onClose }: { onSubmit: (entry: QuickEntry) => void; onClose: () => void }) {
  const [input, setInput] = useState('')
  const entry = parseQuickAdd(input)
  const submit = () => { if (!entry) return; onSubmit(entry); onClose() }
  return <Dialog title="Adição rápida" onClose={onClose}>
    <TextField value={input} onChangeText={setInput} placeholder="Reunião amanhã 14:30 1h   ou   t: tarefa" accessibilityLabel="Adição rápida"
      autoFocus autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={submit} />
    <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite">{describe(input, entry)}</AppText>
    <View style={styles.actions}>
      <Button label="Cancelar" onPress={onClose} />
      <Button label="Adicionar" variant="primary" disabled={!entry} onPress={submit} />
    </View>
  </Dialog>
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
