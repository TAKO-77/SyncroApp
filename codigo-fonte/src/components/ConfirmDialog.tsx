import { useEffect, useRef } from 'react'
import { useConfirm } from '../store/confirm'

export function ConfirmDialog() {
  const request = useConfirm(s => s.request)
  const confirmButton = useRef<HTMLButtonElement>(null)
  const answer = (ok: boolean) => { request?.resolve(ok); useConfirm.setState({ request: null }) }
  useEffect(() => {
    if (!request) return
    const previous = document.activeElement as HTMLElement | null
    confirmButton.current?.focus()
    // Capture on window so Escape closes only this dialog, not a modal underneath it.
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); answer(false) } }
    addEventListener('keydown', key, true)
    return () => { removeEventListener('keydown', key, true); previous?.focus() }
  }, [request])
  if (!request) return null
  return <div className="ov confirm-ov" onMouseDown={e => { if (e.target === e.currentTarget) answer(false) }}>
    <div className="dl confirm-dl" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={request.message ? 'confirm-message' : undefined}>
      <h2 id="confirm-title">{request.title}</h2>
      {request.message && <p id="confirm-message" className="mu">{request.message}</p>}
      <div className="acts">
        <button type="button" className="btn" onClick={() => answer(false)}>Cancelar</button>
        <button ref={confirmButton} type="button" className={'btn ' + (request.danger ? 'dng-solid' : 'pri')} onClick={() => answer(true)}>{request.confirmLabel ?? 'Confirmar'}</button>
      </div>
    </div>
  </div>
}
