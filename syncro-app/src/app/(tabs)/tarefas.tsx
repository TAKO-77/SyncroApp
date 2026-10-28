import AsyncStorage from '@react-native-async-storage/async-storage'
import { X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Chip } from '@/components/Chip'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { Screen } from '@/components/Screen'
import { SegmentedControl } from '@/components/SegmentedControl'
import { TaskComposer } from '@/components/TaskComposer'
import { TaskEditor } from '@/components/TaskEditor'
import { TaskRow } from '@/components/TaskRow'
import { WorkspacePicker } from '@/components/WorkspacePicker'
import { useTasks } from '@/hooks/useTasks'
import { useTheme } from '@/hooks/useTheme'
import { GENERAL_WORKSPACE_ID, SORT_OPTIONS, isTaskSort, sortTasks, tasksInWorkspace, toIso } from '@/lib/tasks'
import { radius, spacing } from '@/lib/theme'
import type { TaskSort } from '@/types/tasks'

type StatusFilter = 'open' | 'done'
// Same key as the web app.
const SORT_KEY = 'syncro-task-sort'

export default function Tarefas() {
  const { colors } = useTheme()
  const board = useTasks()
  const [view, setView] = useState<StatusFilter>('open')
  const [workspaceId, setWorkspaceId] = useState(GENERAL_WORKSPACE_ID)
  const [sort, setSort] = useState<TaskSort>('priority')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(SORT_KEY).then(v => { if (isTaskSort(v)) setSort(v) }).catch(() => { /* storage unavailable */ })
  }, [])
  const changeSort = (next: TaskSort) => { setSort(next); AsyncStorage.setItem(SORT_KEY, next).catch(() => { /* storage unavailable */ }) }

  const workspace = board.workspaces.find(w => w.id === workspaceId) ?? board.workspaces[0]
  const scoped = tasksInWorkspace(board.tasks, workspace.id)
  const openCount = scoped.filter(t => !t.done).length
  const list = sortTasks(scoped.filter(t => (view === 'open' ? !t.done : t.done)), sort)
  const editing = board.tasks.find(t => t.id === editingId)
  const today = toIso(new Date())

  const askDeleteWorkspace = (w: { id: string; name: string }) => setConfirm({
    title: `Eliminar o espaço “${w.name}”?`,
    message: 'As tarefas serão movidas para Geral e as notas deste espaço serão apagadas.',
    confirmLabel: 'Eliminar',
    onConfirm: () => { board.deleteWorkspace(w.id); setWorkspaceId(GENERAL_WORKSPACE_ID) },
  })

  return <Screen title="Tarefas">
    <View style={styles.toolbar}>
      <WorkspacePicker workspaces={board.workspaces} current={workspace} onSelect={setWorkspaceId} onCreate={board.addWorkspace} onDelete={askDeleteWorkspace} />
      <SegmentedControl label="Estado das tarefas" value={view} onChange={setView}
        options={[{ value: 'open', label: `Pendentes ${openCount}` }, { value: 'done', label: `Concluídas ${scoped.length - openCount}` }]} />
    </View>

    {!!board.error && <View accessibilityRole="alert" style={[styles.banner, { borderColor: colors.error, backgroundColor: colors.surface }]}>
      <AppText variant="caption" tone="error" style={styles.bannerText}>{board.error}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={8} onPress={board.dismissError}><X size={16} color={colors.muted} strokeWidth={1.5} /></Pressable>
    </View>}

    <TaskComposer workspaceId={workspace.id} onAdd={draft => { const r = board.addTask(draft); if (r.ok) setView('open'); return r }} />

    {list.length > 1 && <View accessibilityRole="radiogroup" accessibilityLabel="Ordenar por" style={styles.sort}>
      <AppText variant="caption" tone="muted">Ordenar por</AppText>
      {SORT_OPTIONS.map(o => <Chip key={o.value} label={o.label} selected={sort === o.value} onPress={() => changeSort(o.value)} />)}
    </View>}

    {board.state === 'loading' ? <View style={styles.center}><ActivityIndicator color={colors.accent} accessibilityLabel="A carregar tarefas" /></View>
      : board.state === 'error' ? <Card>
        <AppText weight="semibold">Não foi possível carregar as tarefas</AppText>
        <AppText variant="caption" tone="muted">Verifica a ligação à Internet e tenta novamente.</AppText>
        <Button label="Tentar novamente" onPress={board.retry} style={styles.retry} />
      </Card>
      : list.length ? <View style={styles.list}>
        {list.map(t => <TaskRow key={t.id} task={t} today={today}
          onToggle={() => board.setDone(t.id, !t.done)}
          onEdit={() => setEditingId(t.id)}
          onCyclePriority={() => board.cyclePriority(t.id)}
          onDelete={() => board.deleteTask(t.id)} />)}
      </View>
      : <View style={[styles.empty, { borderColor: colors.border }]}>
        <AppText tone="muted">{view === 'open' ? 'Tudo em dia. Adiciona a próxima tarefa acima.' : 'Ainda nada concluído.'}</AppText>
      </View>}

    {editing && <TaskEditor task={editing} workspaces={board.workspaces}
      onSave={draft => board.updateTask(editing.id, draft)}
      onDelete={() => board.deleteTask(editing.id)}
      onClose={() => setEditingId(null)} />}
    {confirm && <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />}
  </Screen>
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 4, borderWidth: 1, borderRadius: radius.sm },
  bannerText: { flex: 1 },
  sort: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  retry: { alignSelf: 'flex-start' },
  list: { gap: spacing.sm },
  empty: { padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md },
})
