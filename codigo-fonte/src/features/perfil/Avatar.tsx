import { useStore } from '../../store/useStore'

/** The profile photo, or the first letter of the name without one. `alt` names it; without `alt` it is decorative. */
export function Avatar({ className, alt }: { className?: string; alt?: string }) {
  const { photo, name } = useStore(s => s.data)
  if (photo) return <img className={className} src={photo} alt={alt ?? ''} />
  const initial = (name?.trim()[0] || '?').toUpperCase()
  return alt ? <span className={`${className ?? ''} profile-placeholder`} role="img" aria-label="Sem foto de perfil">{initial}</span> : <span aria-hidden="true">{initial}</span>
}
