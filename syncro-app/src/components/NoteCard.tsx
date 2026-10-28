import { Pencil, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { NoteContent } from '@/components/NoteContent'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { NOTE_MAX, prefixLines, toggleTaskLine, wrapSelection, type Selection } from '@/lib/notes'
import { radius, spacing } from '@/lib/theme'

// Same formatting toolbar as the web app.
const TOOLS: { label: string; name: string; apply: (text: string, sel: Selection) => { text: string; selection: Selection } }[] = [
  { label: 'B', name: 'Negrito', apply: (t, s) => wrapSelection(t, s, '**') },
  { label: 'I', name: 'Itálico', apply: (t, s) => wrapSelection(t, s, '_') },
  { label: 'H', name: 'Título', apply: (t, s) => prefixLines(t, s, '## ') },
  { label: '❞', name: 'Citação', apply: (t, s) => prefixLines(t, s, '> ') },
  { label: '<>', name: 'Código', apply: (t, s) => wrapSelection(t, s, '`') },
  { label: '•', name: 'Lista com pontos', apply: (t, s) => prefixLines(t, s, '- ') },
  { label: '1.', name: 'Lista numerada', apply: (t, s) => prefixLines(t, s, '1. ') },
  { label: '☐', name: 'Lista de tarefas', apply: (t, s) => prefixLines(t, s, '- [ ] ') },
]

/** One note box: shows the formatted text and switches to an editor with a formatting toolbar. */
export function NoteCard({ text, editing, onEdit, onSave, onCancel, onDelete }: {
  text: string; editing: boolean; onEdit: () => void; onSave: (text: string) => void; onCancel: () => void; onDelete: () => void
}) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState(text)
  const [selection, setSelection] = useState<Selection>({ start: text.length, end: text.length })
  const startEditing = () => { setDraft(text); setSelection({ start: text.length, end: text.length }); onEdit() }
  const format = (apply: (typeof TOOLS)[number]['apply']) => { const r = apply(draft, selection); setDraft(r.text); setSelection(r.selection) }
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: editing ? colors.accent : colors.border }]

  if (editing) return <View style={card}>
    <View accessibilityLabel="Formatação do texto" style={styles.toolbar}>
      {TOOLS.map(t => <Pressable key={t.name} accessibilityRole="button" accessibilityLabel={t.name} onPress={() => format(t.apply)}
        style={({ pressed }) => [styles.tool, { borderColor: colors.border }, pressed && { backgroundColor: colors.surfaceRaised }]}>
        <AppText variant="caption" weight="semibold">{t.label}</AppText>
      </Pressable>)}
    </View>
    <TextField value={draft} onChangeText={setDraft} multiline maxLength={NOTE_MAX} autoFocus accessibilityLabel="Texto da nota"
      placeholder="Escreve tópicos ou texto… Usa a barra para formatar." onSelectionChange={e => setSelection(e.nativeEvent.selection)} style={styles.editor} />
    <View style={styles.actions}>
      <Button label="Cancelar" onPress={onCancel} />
      <Button label="Guardar" variant="primary" onPress={() => onSave(draft)} />
    </View>
  </View>

  return <View style={card}>
    <View style={styles.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar nota" hitSlop={8} onPress={startEditing}><Pencil size={16} color={colors.muted} strokeWidth={1.5} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Apagar nota" hitSlop={8} onPress={onDelete}><X size={16} color={colors.muted} strokeWidth={1.5} /></Pressable>
    </View>
    {text ? <NoteContent text={text} onToggle={i => onSave(toggleTaskLine(text, i))} />
      : <Pressable accessibilityRole="button" onPress={startEditing}><AppText variant="caption" tone="muted">Nota vazia. Toca para escrever.</AppText></Pressable>}
  </View>
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300, gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
  tools: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tool: { minWidth: 32, height: 30, paddingHorizontal: 6, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  editor: { minHeight: 140 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
