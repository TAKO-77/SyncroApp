import { useEffect, useState } from 'react'
import { noteImageUrl } from '../../lib/noteImages'

/** Shows one image stored for a note, with loading and unavailable states. */
export function NoteImage({ file, alt, className = 'note-img' }: { file: string; alt: string; className?: string }) {
  const [state, setState] = useState<{ url?: string; failed?: boolean }>({})
  useEffect(() => {
    let active = true
    setState({})
    noteImageUrl(file).then(url => { if (active) setState({ url }) }, () => { if (active) setState({ failed: true }) })
    return () => { active = false }
  }, [file])
  if (state.url) return <img className={className} src={state.url} alt={alt} loading="lazy" />
  return <div className={`${className} note-img-empty`} role="img" aria-label={alt}>{state.failed ? 'Imagem indisponível sem ligação.' : 'A carregar imagem…'}</div>
}
