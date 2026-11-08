import { Avatar } from './Avatar'

/** Round shortcut to the profile, showing the user's photo or their initial. */
export function ProfileButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button type="button" className="profile-btn" title="Perfil" aria-label="Perfil" aria-current={active ? 'page' : undefined} onClick={onClick}>
    <Avatar />
  </button>
}
