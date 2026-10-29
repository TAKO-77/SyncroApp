import { useStore } from '../../store/useStore'

/** Round shortcut to the profile, showing the user's photo or their initial. */
export function ProfileButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { data } = useStore()
  return <button type="button" className="profile-btn" title="Perfil" aria-label="Perfil" aria-current={active ? 'page' : undefined} onClick={onClick}>
    {data.photo ? <img src={data.photo} alt="" /> : <span aria-hidden="true">{(data.name?.trim()[0] || '?').toUpperCase()}</span>}
  </button>
}
