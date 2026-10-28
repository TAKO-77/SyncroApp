import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import { shortDate } from '@/lib/dates'
import { financeCategory } from '@/lib/finances'
import { radius, spacing, tagColors } from '@/lib/theme'
import type { Finance } from '@/types/finances'

function FinanceRow({ item, money, onPress }: { item: Finance; money: (n: number) => string; onPress: () => void }) {
  const { colors } = useTheme()
  const income = item.type === 'in'
  const category = financeCategory(item.categoryId)
  return <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={onPress}
    style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
    <View style={[styles.dot, { backgroundColor: income ? tagColors.sage : category.color }]} />
    <View style={styles.name}>
      <AppText numberOfLines={1}>{item.name}</AppText>
      <AppText variant="caption" tone="muted">{income ? 'Ganho' : category.name}{item.kind === 'one' ? ` · ${shortDate(item.date)}` : ''}</AppText>
    </View>
    <AppText weight="semibold" tone={income ? 'success' : 'text'}>{income ? '+' : '−'}{money(item.amount)}</AppText>
  </Pressable>
}

/** Recurring and one-off records of the month. */
export function FinanceList({ recurring, oneOff, money, onEdit }: {
  recurring: readonly Finance[]; oneOff: readonly Finance[]; money: (n: number) => string; onEdit: (item: Finance) => void
}) {
  return <Card>
    <AppText variant="caption" tone="muted">Recorrentes</AppText>
    {recurring.length ? recurring.map(f => <FinanceRow key={f.id} item={f} money={money} onPress={() => onEdit(f)} />)
      : <AppText variant="caption" tone="muted">Nenhum registo recorrente neste mês.</AppText>}
    <AppText variant="caption" tone="muted" style={styles.section}>Esporádicos</AppText>
    {oneOff.length ? oneOff.map(f => <FinanceRow key={f.id} item={f} money={money} onPress={() => onEdit(f)} />)
      : <AppText variant="caption" tone="muted">Nenhum registo esporádico neste mês.</AppText>}
  </Card>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  pressed: { opacity: 0.6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1 },
  section: { marginTop: spacing.md },
})
