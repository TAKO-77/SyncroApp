import { usePwa } from '../lib/pwa'

// Shown in the web/PWA build when a new version has been downloaded.
export function UpdateBanner() {
  const { needRefresh, reload, dismiss } = usePwa()
  if (!needRefresh) return null
  return <div className="update-banner" role="status">
    <span>Nova versão disponível</span>
    <button type="button" className="btn pri" onClick={reload}>Recarregar</button>
    <button type="button" className="update-banner-close" aria-label="Fechar" title="Fechar" onClick={dismiss}>✕</button>
  </div>
}
