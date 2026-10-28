import { sendItems, sendRemoval, useCloudData } from '@/hooks/useCloudData'
import { fallbackCategory } from '@/lib/categories'
import { reassignEvents } from '@/lib/events'
import { newId, nextPosition } from '@/lib/records'
import type { Category } from '@/types/categories'

type CategoryKey = 'eventCategories' | 'dayCategories'

/** Category actions for the Agenda (`eventCategories`) or the Calendário (`dayCategories`). */
export function useCategories(key: CategoryKey) {
  const cloud = useCloudData()
  const categories = cloud.data[key]
  return {
    categories,
    save: (category: Category) => cloud.save(key, category, 'Não foi possível guardar a categoria.'),
    create: (fields: Pick<Category, 'name' | 'color' | 'icon'>) =>
      cloud.save(key, { ...fields, id: newId('cat'), position: nextPosition(categories) }, 'Não foi possível criar a categoria.'),
    /** Deletes the category and moves its items to the first remaining one, like the web app. */
    remove: (category: Category) => {
      const next = fallbackCategory(categories, category.id)
      const { userId, data } = cloud
      if (key === 'eventCategories') {
        const moved = reassignEvents(data.events, category.id, next)
        cloud.commit(
          d => ({ ...d, eventCategories: d.eventCategories.filter(c => c.id !== category.id), events: d.events.map(e => moved.find(m => m.id === e.id) ?? e) }),
          async () => { await sendItems(userId, 'events', moved); await sendRemoval(userId, key, category.id) },
          'Não foi possível eliminar a categoria.')
      } else {
        const moved = data.specialDays.filter(x => x.categoryId === category.id).map(x => ({ ...x, categoryId: next?.id ?? '' }))
        cloud.commit(
          d => ({ ...d, dayCategories: d.dayCategories.filter(c => c.id !== category.id), specialDays: d.specialDays.map(x => moved.find(m => m.id === x.id) ?? x) }),
          async () => { await sendItems(userId, 'specialDays', moved); await sendRemoval(userId, key, category.id) },
          'Não foi possível eliminar a categoria.')
      }
    },
  }
}
