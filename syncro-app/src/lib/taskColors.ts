import { tagColors } from '@/lib/theme'
import type { Effort, Priority } from '@/types/tasks'

// Same colours as the web app's Tarefas section.
export const PRIORITY_COLORS: Record<Priority, string> = { urgente: tagColors.error, alta: tagColors.clay, media: tagColors.gold, baixa: tagColors.sage }
export const EFFORT_COLORS: Record<Effort, string> = { rel: tagColors.sage, lig: tagColors.slate, cui: tagColors.neutral, exi: tagColors.clay, pro: tagColors.gold }
