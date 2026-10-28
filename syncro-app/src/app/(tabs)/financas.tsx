import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Donut } from '@/components/Donut'
import { FinanceEditor } from '@/components/FinanceEditor'
import { FinanceList } from '@/components/FinanceList'
import { FinanceTrend } from '@/components/FinanceTrend'
import { LoadState } from '@/components/LoadState'
import { Notice } from '@/components/Notice'
import { Screen } from '@/components/Screen'
import { useCloudData } from '@/hooks/useCloudData'
import { useTheme } from '@/hooks/useTheme'
import { addMonths, monthLabel, todayIso } from '@/lib/dates'
import { FINANCE_CATEGORIES, formatEuro, lastMonths, monthTotals, recordsOf, validateFinance } from '@/lib/finances'
import { newId, nextPosition } from '@/lib/records'
import { spacing } from '@/lib/theme'
import type { Finance, FinanceDraft } from '@/types/finances'

interface Editing { draft: FinanceDraft; item?: Finance }
const HIDDEN = '•••'

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone?: 'success' | 'error'; hint?: string }) {
  return <Card style={styles.kpi}>
    <AppText variant="caption" tone="muted">{label}</AppText>
    <AppText variant="h3" tone={tone}>{value}</AppText>
    {hint && <AppText variant="caption" tone="muted">{hint}</AppText>}
  </Card>
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'error' }) {
  return <View style={styles.stat}><AppText variant="caption" tone="muted">{label}</AppText><AppText weight="semibold" tone={tone}>{value}</AppText></View>
}

export default function Financas() {
  const { colors } = useTheme()
  const cloud = useCloudData()
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

  return <Screen title="Finanças" actions={<>
    <Button label={hidden ? 'Mostrar valores' : 'Ocultar valores'} onPress={() => setHidden(h => !h)} />
    <Button label="Novo registo" variant="primary" onPress={openNew} />
  </>}>
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} onPress={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={22} color={colors.text} strokeWidth={1.5} /></Pressable>
      <AppText weight="semibold" style={styles.label}>{monthLabel(month)}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={8} onPress={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={22} color={colors.text} strokeWidth={1.5} /></Pressable>
      <Button label="Hoje" variant="ghost" onPress={() => setMonth(today.slice(0, 7))} />
    </View>
    <Notice message={cloud.error} onDismiss={cloud.dismissError} />
    {cloud.state !== 'ready' ? <LoadState state={cloud.state} what="as finanças" onRetry={cloud.retry} />
      : !finances.length ? <Card><AppText tone="muted">Ainda não há registos. Começa por adicionar o teu ordenado (ganho mensal recorrente) e as despesas fixas.</AppText></Card>
      : <>
        <View style={styles.kpis}>
          <Kpi label="Saldo do mês" value={hidden ? HIDDEN : `${balance > 0 ? '+' : ''}${formatEuro(balance)}`} tone={balance < 0 ? 'error' : 'success'} hint={hidden ? undefined : savings} />
          <Kpi label="Ganhos" value={money(totals.income)} />
          <Kpi label="Despesas" value={money(totals.expenses)} />
        </View>
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
        <FinanceList recurring={recordsOf(finances, month, 'rec')} oneOff={recordsOf(finances, month, 'one')} money={money} onEdit={openEdit} />
      </>}

    {editing && <FinanceEditor initial={editing.draft} isNew={!editing.item}
      onSave={draft => save(editing.item, draft)}
      onDelete={() => { if (editing.item) cloud.remove('finances', editing.item.id, 'Não foi possível apagar o registo.') }}
      onClose={() => setEditing(null)} />}
  </Screen>
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { minWidth: 140, textAlign: 'center' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: { flexGrow: 1, flexBasis: 200 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flexGrow: 1, flexBasis: 320 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
})
