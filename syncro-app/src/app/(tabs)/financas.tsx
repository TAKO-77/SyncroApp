import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Donut } from '@/components/Donut'
import { FinanceEditor } from '@/components/FinanceEditor'
import { FinanceList } from '@/components/FinanceList'
import { FinanceTrend } from '@/components/FinanceTrend'
import { IconButton } from '@/components/IconButton'
import { LoadState } from '@/components/LoadState'
import { Notice } from '@/components/Notice'
import { Screen } from '@/components/Screen'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useCloudData } from '@/hooks/useCloudData'
import { useTheme } from '@/hooks/useTheme'
import { addMonths, monthLabel, todayIso } from '@/lib/dates'
import { FINANCE_CATEGORIES, formatEuro, lastMonths, monthTotals, recordsOf, validateFinance } from '@/lib/finances'
import { newId, nextPosition } from '@/lib/records'
import { spacing } from '@/lib/theme'
import type { Finance, FinanceDraft } from '@/types/finances'

interface Editing { draft: FinanceDraft; item?: Finance }
const HIDDEN = '•••'

/** Balance of the month in large type, with income and expenses side by side. */
function MonthSummary({ balance, income, expenses, hint, negative }: { balance: string; income: string; expenses: string; hint?: string; negative: boolean }) {
  const { colors } = useTheme()
  return <Card>
    <AppText variant="caption" tone="muted">Saldo do mês</AppText>
    <AppText variant="h3" tone={negative ? 'error' : 'success'}>{balance}</AppText>
    {hint && <AppText variant="caption" tone="muted">{hint}</AppText>}
    <View style={[styles.split, { borderTopColor: colors.border }]}>
      <View style={styles.half}><AppText variant="caption" tone="muted">Ganhos</AppText><AppText weight="semibold">{income}</AppText></View>
      <View style={[styles.half, styles.divider, { borderLeftColor: colors.border }]}><AppText variant="caption" tone="muted">Despesas</AppText><AppText weight="semibold">{expenses}</AppText></View>
    </View>
  </Card>
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'error' }) {
  return <View style={styles.stat}><AppText variant="caption" tone="muted">{label}</AppText><AppText weight="semibold" tone={tone}>{value}</AppText></View>
}

export default function Financas() {
  const { colors } = useTheme()
  const cloud = useCloudData()
  const mobile = useBreakpoint() === 'mobile'
  const { finances } = cloud.data
  const today = todayIso()
  const [month, setMonth] = useState(today.slice(0, 7))
  // Values start hidden, like the web app, so the screen can be opened in public.
  const [hidden, setHidden] = useState(true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const money = (n: number) => (hidden ? HIDDEN : formatEuro(n))

  const totals = monthTotals(finances, month), balance = totals.income - totals.expenses
  const byCategory = FINANCE_CATEGORIES.map(c => ({ id: c.id, name: c.name, color: c.color, value: totals.byCategory[c.id] ?? 0 })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)
  const savings = totals.income ? (balance >= 0 ? `Taxa de poupança de ${Math.round(balance / totals.income * 100)}%` : 'Despesas acima dos ganhos') : 'Sem ganhos registados neste mês'

  const openNew = () => setEditing({ draft: { type: 'out', kind: 'one', name: '', amount: '', date: month === today.slice(0, 7) ? today : `${month}-01`, endMonth: '', categoryId: 'alim' } })
  const openEdit = (item: Finance) => setEditing({ item, draft: { type: item.type, kind: item.kind, name: item.name, amount: String(item.amount).replace('.', ','), date: item.date, endMonth: item.endMonth, categoryId: item.categoryId || 'alim' } })
  const save = (item: Finance | undefined, draft: FinanceDraft) => {
    const result = validateFinance(draft)
    if (!result.ok) return result
    cloud.save('finances', item ? { ...item, ...result.value } : { ...result.value, id: newId('f'), position: nextPosition(finances) }, 'Não foi possível guardar o registo.')
    // Show the month where the record counts, like the web app.
    if (result.value.kind === 'one' || month < result.value.date.slice(0, 7)) setMonth(result.value.date.slice(0, 7))
    return result
  }

  return <Screen title="Finanças" primaryAction={{ label: 'Novo registo', icon: Plus, onPress: openNew }}
    actions={mobile ? <IconButton icon={hidden ? Eye : EyeOff} label={hidden ? 'Mostrar valores' : 'Ocultar valores'} active={!hidden} onPress={() => setHidden(h => !h)} />
      : <Button label={hidden ? 'Mostrar valores' : 'Ocultar valores'} onPress={() => setHidden(h => !h)} />}>
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={10} onPress={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={24} color={colors.text} strokeWidth={1.5} /></Pressable>
      <AppText weight="semibold" style={styles.label}>{monthLabel(month)}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={10} onPress={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={24} color={colors.text} strokeWidth={1.5} /></Pressable>
      <Button label="Hoje" variant={month === today.slice(0, 7) ? 'ghost' : 'secondary'} onPress={() => setMonth(today.slice(0, 7))} />
    </View>
    <Notice message={cloud.error} onDismiss={cloud.dismissError} />
    {cloud.state !== 'ready' ? <LoadState state={cloud.state} what="as finanças" onRetry={cloud.retry} />
      : !finances.length ? <Card><AppText tone="muted">Ainda não há registos. Começa por adicionar o teu ordenado (ganho mensal recorrente) e as despesas fixas.</AppText></Card>
      : <>
        <MonthSummary balance={hidden ? HIDDEN : `${balance > 0 ? '+' : ''}${formatEuro(balance)}`} income={money(totals.income)} expenses={money(totals.expenses)}
          hint={hidden ? undefined : savings} negative={balance < 0} />
        <FinanceList recurring={recordsOf(finances, month, 'rec')} oneOff={recordsOf(finances, month, 'one')} money={money} onEdit={openEdit} />
        <AppText variant="caption" weight="semibold" tone="muted" style={styles.heading}>ANÁLISE</AppText>
        <FinanceTrend months={lastMonths(finances, month)} selected={month} hidden={hidden} format={formatEuro} onSelect={setMonth} />
        <View style={styles.columns}>
          <Card style={styles.column}>
            <AppText variant="caption" tone="muted">Despesas por categoria</AppText>
            {byCategory.length ? <Donut slices={byCategory} total={totals.expenses} format={money} centre={money(totals.expenses)} centreLabel="total" />
              : <AppText variant="caption" tone="muted">Sem despesas neste mês.</AppText>}
          </Card>
          <Card style={styles.column}>
            <AppText variant="caption" tone="muted">Para onde vai o dinheiro</AppText>
            <Stat label="Fixas (recorrentes)" value={money(totals.recurring)} />
            <Stat label="Esporádicas" value={money(totals.oneOff)} />
            <Stat label={balance >= 0 ? 'Por gastar ou poupar' : 'Excedido em'} value={money(Math.abs(balance))} tone={balance < 0 ? 'error' : undefined} />
          </Card>
        </View>
      </>}

    {editing && <FinanceEditor initial={editing.draft} isNew={!editing.item}
      onSave={draft => save(editing.item, draft)}
      onDelete={() => { if (editing.item) cloud.remove('finances', editing.item.id, 'Não foi possível apagar o registo.') }}
      onClose={() => setEditing(null)} />}
  </Screen>
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, maxWidth: 220, textAlign: 'center' },
  split: { flexDirection: 'row', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  half: { flex: 1, gap: 2 },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
  heading: { fontSize: 12, letterSpacing: 0.5, marginTop: spacing.sm },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flexGrow: 1, flexBasis: 320 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
})
