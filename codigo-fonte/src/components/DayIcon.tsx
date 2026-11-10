import { Baby, Briefcase, Cake, Dumbbell, Gift, GraduationCap, Heart, House, Music, NotebookPen, PartyPopper, Pin, Plane, Star, Stethoscope, Trophy, type LucideIcon } from 'lucide-react'
import type { MessageKey } from '../lib/i18n/translate'

/** Icons offered for special-day categories. `Category.icon` stores the key; older data may still hold an emoji, mapped below. */
export const DAY_ICONS: { key: string; label: MessageKey; Icon: LucideIcon }[] = [
  { key: 'cake', label: 'agenda.icon.cake', Icon: Cake },
  { key: 'exam', label: 'agenda.icon.exam', Icon: NotebookPen },
  { key: 'health', label: 'agenda.icon.health', Icon: Stethoscope },
  { key: 'plane', label: 'agenda.icon.plane', Icon: Plane },
  { key: 'star', label: 'agenda.icon.star', Icon: Star },
  { key: 'pin', label: 'agenda.icon.pin', Icon: Pin },
  { key: 'heart', label: 'agenda.icon.heart', Icon: Heart },
  { key: 'gift', label: 'agenda.icon.gift', Icon: Gift },
  { key: 'party', label: 'agenda.icon.party', Icon: PartyPopper },
  { key: 'music', label: 'agenda.icon.music', Icon: Music },
  { key: 'study', label: 'agenda.icon.study', Icon: GraduationCap },
  { key: 'work', label: 'agenda.icon.work', Icon: Briefcase },
  { key: 'sport', label: 'agenda.icon.sport', Icon: Dumbbell },
  { key: 'trophy', label: 'agenda.icon.trophy', Icon: Trophy },
  { key: 'home', label: 'agenda.icon.home', Icon: House },
  { key: 'baby', label: 'agenda.icon.baby', Icon: Baby },
]

const FROM_EMOJI: Record<string, string> = {
  '🎂': 'cake', '📝': 'exam', '🩺': 'health', '✈️': 'plane', '✈': 'plane', '⭐': 'star', '📌': 'pin', '❤️': 'heart', '❤': 'heart',
  '🎁': 'gift', '🎉': 'party', '🎵': 'music', '🎶': 'music', '🎓': 'study', '💼': 'work', '🏋️': 'sport', '⚽': 'sport', '🏆': 'trophy', '🏠': 'home', '👶': 'baby',
}

/** The icon key for a stored value: a key, a known emoji, or `pin` for anything else. */
export const dayIconKey = (icon?: string) => icon && DAY_ICONS.some(i => i.key === icon) ? icon : (icon && FROM_EMOJI[icon]) || 'pin'

export function DayIcon({ icon, size = 16 }: { icon?: string; size?: number }) {
  const key = dayIconKey(icon)
  const { Icon } = DAY_ICONS.find(i => i.key === key)!
  return <Icon className="day-icon" size={size} strokeWidth={1.5} aria-hidden="true" />
}
