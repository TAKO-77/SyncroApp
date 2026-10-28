import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { NoteCard } from '@/components/NoteCard'
import { spacing } from '@/lib/theme'
import type { Workspace, WorkspaceNote } from '@/types/tasks'

/** "Tópicos e notas" of a workspace: several independent note boxes. */
export function WorkspaceNotes({ workspace, notes, onAdd, onSave, onDelete }: {
  workspace: Workspace; notes: readonly WorkspaceNote[]
  onAdd: () => string; onSave: (id: string, text: string) => void; onDelete: (note: WorkspaceNote) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  useEffect(() => setEditingId(null), [workspace.id])

  return <View style={styles.section}>
    <View style={styles.head}>
      <AppText weight="semibold">Tópicos e notas</AppText>
      <Button label="+ Nova nota" onPress={() => setEditingId(onAdd())} />
    </View>
    {notes.length ? <View style={styles.grid}>{notes.map(n => <NoteCard key={n.id} text={n.text} editing={editingId === n.id}
      onEdit={() => setEditingId(n.id)}
      onSave={text => { onSave(n.id, text); if (editingId === n.id) setEditingId(null) }}
      // A new note that is cancelled before anything is written is removed, like the web app.
      onCancel={() => { if (!n.text) onDelete(n); setEditingId(null) }}
      onDelete={() => onDelete(n)} />)}</View>
      : <Card><AppText variant="caption" tone="muted">Ainda não há tópicos ou notas neste espaço.</AppText></Card>}
    <AppText variant="caption" tone="muted">Notas independentes do espaço “{workspace.name}”.</AppText>
  </View>
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
