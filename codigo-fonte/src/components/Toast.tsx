import { useEffect, useState } from 'react'
import { useToast } from '../store/toast'

/** Bottom toast with a countdown line; it keeps the last message on screen while it slides out. */
export function Toast() {
  const { t, pause, resume } = useToast()
  const [shown, setShown] = useState(t)
  useEffect(() => {
    if (t) { setShown(t); return }
    const id = setTimeout(() => setShown(null), 200)
    return () => clearTimeout(id)
  }, [t])
  if (!shown) return null
  return <div key={shown.id} className={'toast' + (t ? '' : ' out')} role="status" onMouseEnter={pause} onMouseLeave={resume}>
    <span>{shown.msg}</span>
    <i className="toast-bar" style={{ animationDuration: `${shown.ms}ms` }} aria-hidden="true" />
  </div>
}
