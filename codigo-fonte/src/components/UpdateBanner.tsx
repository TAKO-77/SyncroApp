import { usePwa } from '../lib/pwa'

// Shown in the web/PWA build when a new version has been downloaded. It only reloads if the user chooses to, so an open form is not lost.
export function UpdateBanner() {
  const { needRefresh, reload, dismiss } = usePwa()
  if (!needRefresh) return null
  return <div className="ov confirm-ov">
    <div className="dl confirm-dl" role="alertdialog" aria-modal="true" aria-labelledby="update-title" aria-describedby="update-text">
      <h2 id="update-title">Nova versão disponível</h2>
      <p id="update-text" className="mu">Atualiza o Syncro para teres as últimas novidades.</p>
      <div className="acts"><span className="sp" /><button type="button" className="btn" onClick={dismiss}>Mais tarde</button><button type="button" className="btn pri" autoFocus onClick={reload}>Atualizar</button></div>
    </div>
  </div>
}
