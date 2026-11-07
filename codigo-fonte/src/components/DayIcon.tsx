import { Baby, Briefcase, Cake, Dumbbell, Gift, GraduationCap, Heart, House, Music, NotebookPen, PartyPopper, Pin, Plane, Star, Stethoscope, Trophy, type LucideIcon } from 'lucide-react'

/** Icons offered for special-day categories. `Category.icon` stores the key; older data may still hold an emoji, mapped below. */
export const DAY_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'cake', label: 'Bolo', Icon: Cake },
  { key: 'exam', label: 'Exame', Icon: NotebookPen },
  { key: 'health', label: 'Saúde', Icon: Stethoscope },
  { key: 'plane', label: 'Viagem', Icon: Plane },
  { key: 'star', label: 'Estrela', Icon: Star },
  { key: 'pin', label: 'Pionés', Icon: Pin },
  { key: 'heart', label: 'Coração', Icon: Heart },
  { key: 'gift', label: 'Presente', Icon: Gift },
  { key: 'party', label: 'Festa', Icon: PartyPopper },
  { key: 'music', label: 'Música', Icon: Music },
  { key: 'study', label: 'Estudos', Icon: GraduationCap },
  { key: 'work', label: 'Trabalho', Icon: Briefcase },
  { key: 'sport', label: 'Desporto', Icon: Dumbbell },
  { key: 'trophy', label: 'Troféu', Icon: Trophy },
  { key: 'home', label: 'Casa', Icon: House },
  { key: 'baby', label: 'Bebé', Icon: Baby },
]

const FROM_EMOJI: Record<string, string> = {
  '🎂': 'cake', '📝': 'exam', '🩺': 'health', '✈️': 'plane', '✈': 'plane', '⭐': 'star', '📌': 'pin', '❤️': 'heart', '❤': 'heart',
  '🎁': 'gift', '🎉': 'party', '🎵': 'music', '🎶': 'music', '🎓': 'study', '💼': 'work', '🏋️': 'sport', '⚽': 'sport', '🏆': 'trophy', '🏠': 'home', '👶': 'baby',
}

/** The icon key for a stored value: a key, a known emoji, or `pin` for anything else. */
export const dayIconKey = (icon?: string) => icon && DAY_ICONS.some(i => i.key === icon) ? icon : (icon && FROM_EMOJI[icon]) || 'pin'

export function DayIcon({ icon, size = 16 }: { icon?: string; size?: number }) {
  const key = dayIconKey(icon)
  const { Icon } = DAY_ICONS.find(i => i.key === key) ?? DAY_ICONS[5]
  return <Icon className="day-icon" size={size} strokeWidth={1.5} aria-hidden="true" />
}
