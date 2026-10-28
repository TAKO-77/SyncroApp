import { ChevronDown, LayoutGrid, Square, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { GENERAL_WORKSPACE_ID, WORKSPACE_NAME_MAX, type Validation } from '@/lib/tasks'
import { radius, spacing } from '@/lib/theme'
import type { Workspace } from '@/types/tasks'

/** Shows the current workspace and opens a list to switch, create or delete workspaces. */
export function WorkspacePicker({ workspaces, current, onSelect, onCreate, onDelete }: {
  workspaces: readonly Workspace[]; current: Workspace
  onSelect: (id: string) => void; onCreate: (name: string) => Validation<string>; onDelete: (workspace: Workspace) => void
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const close = () => { setOpen(false); setName(''); setError('') }
  const create = () => {
    const result = onCreate(name)
    if (!result.ok) return setError(result.error)
    onSelect(result.value); close()
  }

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Espaço de trabalho: ${current.name}`} onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.current, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      <LayoutGrid size={18} color={colors.accent} strokeWidth={1.5} />
      <View style={styles.currentText}>
        <AppText variant="caption" tone="muted" style={styles.overline}>ESPAÇO DE TRABALHO</AppText>
        <AppText weight="semibold" numberOfLines={1}>{current.name}</AppText>
      </View>
      <ChevronDown size={18} color={colors.muted} strokeWidth={1.5} />
    </Pressable>
    {open && <Dialog title="Espaços de trabalho" onClose={close} width={420}>
      <View style={styles.list}>
        {workspaces.map(w => {
          const selected = w.id === current.id, general = w.id === GENERAL_WORKSPACE_ID
          const Icon = general ? LayoutGrid : Square
          return <View key={w.id} style={[styles.option, selected && { backgroundColor: colors.accentSoft }]}>
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={w.name} style={styles.optionMain} onPress={() => { onSelect(w.id); close() }}>
              <Icon size={16} color={selected ? colors.accent : colors.muted} strokeWidth={1.5} />
              <View style={styles.currentText}>
                <AppText weight={selected ? 'semibold' : 'regular'} numberOfLines={1}>{w.name}</AppText>
                {general && <AppText variant="caption" tone="muted">Todas as tarefas</AppText>}
              </View>
            </Pressable>
            {!general && <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${w.name}`} hitSlop={8} onPress={() => { close(); onDelete(w) }}>
              <X size={16} color={colors.muted} strokeWidth={1.5} />
            </Pressable>}
          </View>
        })}
      </View>
      <View style={styles.create}>
        <TextField value={name} onChangeText={v => { setName(v); setError('') }} maxLength={WORKSPACE_NAME_MAX} placeholder="Nome do novo espaço"
          accessibilityLabel="Nome do novo espaço" onSubmitEditing={create} />
        <Button variant="primary" label="+ Criar" onPress={create} />
      </View>
      {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
    </Dialog>}
  </>
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, alignSelf: 'flex-start', minWidth: 220, maxWidth: '100%', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.md },
  currentText: { flexShrink: 1, flexGrow: 1 },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  pressed: { opacity: 0.7 },
  list: { gap: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm, borderRadius: radius.sm },
  optionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, padding: spacing.sm },
  create: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
})
