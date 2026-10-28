import { Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/AppText'
import { Button } from '@/components/Button'
import { ColorSwatches } from '@/components/ColorSwatches'
import { Dialog } from '@/components/Dialog'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { CATEGORY_COLORS, CATEGORY_NAME_MAX, validateCategory } from '@/lib/categories'
import { radius, spacing } from '@/lib/theme'
import type { Category } from '@/types/categories'

type Fields = Pick<Category, 'name' | 'color' | 'icon'>

function CategoryRow({ category, withIcon, onSave, onDelete }: { category: Category; withIcon: boolean; onSave: (fields: Fields) => string; onDelete: () => void }) {
  const { colors } = useTheme()
  const [name, setName] = useState(category.name)
  const [icon, setIcon] = useState(category.icon)
  const [error, setError] = useState('')
  const save = (change: Partial<Fields>) => {
    const fields = { name, icon, color: category.color, ...change }
    if (fields.name.trim() === category.name && fields.icon === category.icon && fields.color === category.color) return
    setError(onSave(fields))
  }
  return <View style={[styles.row, { borderColor: colors.border }]}>
    <View style={styles.fields}>
      {withIcon && <View style={styles.icon}><TextField value={icon} onChangeText={setIcon} onBlur={() => save({})} maxLength={16} accessibilityLabel="Emoji da categoria" /></View>}
      <View style={styles.name}><TextField value={name} onChangeText={setName} onBlur={() => save({})} onSubmitEditing={() => save({})} maxLength={CATEGORY_NAME_MAX} accessibilityLabel="Nome da categoria" /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${category.name}`} hitSlop={8} onPress={onDelete}>
        <Trash2 size={18} color={colors.error} strokeWidth={1.5} />
      </Pressable>
    </View>
    <ColorSwatches label="Cor da categoria" value={category.color} onChange={color => save({ color })} />
    {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
  </View>
}

/** Edits a list of categories in place: rename, recolour, set the emoji, delete or add. */
export function CategoryManager({ title, description, categories, withIcon, onSave, onCreate, onDelete, onClose }: {
  title: string; description: string; categories: readonly Category[]; withIcon: boolean
  onSave: (category: Category) => void; onCreate: (fields: Fields) => void; onDelete: (category: Category) => void; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0])
  const [icon, setIcon] = useState('📌')
  const [error, setError] = useState('')
  const create = () => {
    const result = validateCategory({ name, color, icon: withIcon ? icon : '' })
    if (!result.ok) return setError(result.error)
    onCreate(result.value); setName(''); setError('')
  }

  return <Dialog title={title} onClose={onClose}>
    <AppText variant="caption" tone="muted">{description}</AppText>
    {!categories.length && <AppText variant="caption" tone="muted">Ainda não há categorias.</AppText>}
    {categories.map(c => <CategoryRow key={c.id} category={c} withIcon={withIcon} onDelete={() => onDelete(c)} onSave={fields => {
      const result = validateCategory({ ...fields, icon: withIcon ? fields.icon : '' })
      if (!result.ok) return result.error
      onSave({ ...c, ...result.value }); return ''
    }} />)}
    <View style={styles.create}>
      <AppText variant="caption" weight="semibold">Nova categoria</AppText>
      <View style={styles.fields}>
        {withIcon && <View style={styles.icon}><TextField value={icon} onChangeText={setIcon} maxLength={16} accessibilityLabel="Emoji da nova categoria" /></View>}
        <View style={styles.name}><TextField value={name} onChangeText={v => { setName(v); setError('') }} onSubmitEditing={create} maxLength={CATEGORY_NAME_MAX} placeholder="Nome da categoria" accessibilityLabel="Nome da nova categoria" /></View>
      </View>
      <ColorSwatches label="Cor da nova categoria" value={color} onChange={setColor} />
      {!!error && <AppText variant="caption" tone="error" accessibilityRole="alert">{error}</AppText>}
      <View style={styles.actions}>
        <Button label="Fechar" onPress={onClose} />
        <Button label="Adicionar" variant="primary" onPress={create} />
      </View>
    </View>
  </Dialog>
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1 },
  fields: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 64 },
  name: { flex: 1 },
  create: { gap: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
})
