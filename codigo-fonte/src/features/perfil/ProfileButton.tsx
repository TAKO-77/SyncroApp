import { Avatar } from './Avatar'
import { useT } from '../../lib/i18n/useT'

/** Round shortcut to the profile, showing the user's photo or their initial. */
export function ProfileButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { t } = useT()
  return <button type="button" className="profile-btn" title={t('perfil.title')} aria-label={t('perfil.title')} aria-current={active ? 'page' : undefined} onClick={onClick}>
    <Avatar />
  </button>
}
